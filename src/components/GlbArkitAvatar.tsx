import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { AvatarProps } from './DefaultAvatar';
import { createMouthEngine, MouthEngine, MouthSource } from '../lib/mouthEngine';
import { useReducedMotion } from '../lib/useReducedMotion';

export interface GlbArkitAvatarProps extends AvatarProps {
  /** CORS-enabled .glb URL with ARKit blendshapes (e.g. a converted Rocketbox avatar). */
  glbUrl?: string;
}

// Error boundary so a bad/unsupported GLB shows an overlay instead of crashing.
class ModelErrorBoundary extends React.Component<
  { children: React.ReactNode; onError: (err: string) => void },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any) {
    this.props.onError(error?.message || String(error));
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

/**
 * Drives ARKit-named morph targets (jawOpen, mouthFunnel, eyeBlinkLeft, …)
 * across every skinned mesh in a GLB. The same name can live on several
 * meshes (e.g. head + teeth + tongue), so we collect all targets per name.
 *
 * Matching is case-insensitive and prefix-tolerant: FBX→glTF exporters often
 * rename `jawOpen` to `head_jawOpen` / `CC_Base_Body.jawOpen`, so we match on
 * a normalized suffix as a fallback.
 */
function buildBlendIndex(root: THREE.Object3D) {
  const targets = new Map<string, { mesh: THREE.Mesh; index: number }[]>();

  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '');

  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    const dict = mesh.morphTargetDictionary;
    if (!dict || !mesh.morphTargetInfluences) return;
    for (const rawName of Object.keys(dict)) {
      const index = dict[rawName];
      const norm = normalize(rawName);
      if (!targets.has(norm)) targets.set(norm, []);
      targets.get(norm)!.push({ mesh, index });
    }
  });

  // Resolve an ARKit blendshape name to the entries matching it, exactly or by suffix.
  const resolve = (arkitName: string) => {
    const want = normalize(arkitName);
    if (targets.has(want)) return targets.get(want)!;
    // suffix-tolerant fallback (e.g. "headjawopen" endsWith "jawopen")
    const hit: { mesh: THREE.Mesh; index: number }[] = [];
    for (const [norm, entries] of targets) {
      if (norm.endsWith(want)) hit.push(...entries);
    }
    return hit;
  };

  const cache = new Map<string, { mesh: THREE.Mesh; index: number }[]>();
  return {
    has(arkitName: string) {
      return this.entries(arkitName).length > 0;
    },
    entries(arkitName: string) {
      if (!cache.has(arkitName)) cache.set(arkitName, resolve(arkitName));
      return cache.get(arkitName)!;
    },
    set(arkitName: string, value: number) {
      const entries = this.entries(arkitName);
      const v = Math.max(0, Math.min(1, value));
      for (const { mesh, index } of entries) {
        mesh.morphTargetInfluences![index] = v;
      }
    },
    /** All normalized morph-target names found, for debugging. */
    names: Array.from(targets.keys()),
  };
}

type BlendIndex = ReturnType<typeof buildBlendIndex>;

// Inner component rendered inside the R3F Canvas context.
function GlbModel({
  url,
  state,
  analyser,
  maxMouthOpening = 30,
  mouseTrackingIntensity = 1.0,
  blinkIntervalMin = 2000,
  blinkIntervalMax = 6000,
  blinkDuration = 100,
  reducedMotion = false,
  onLoaded,
}: {
  url: string;
  state: string;
  analyser: MouthSource;
  maxMouthOpening?: number;
  mouseTrackingIntensity?: number;
  blinkIntervalMin?: number;
  blinkIntervalMax?: number;
  blinkDuration?: number;
  reducedMotion?: boolean;
  onLoaded: (loaded: boolean) => void;
}) {
  const gltf = useLoader(GLTFLoader, url);
  const { camera, controls } = useThree();

  const scene = gltf.scene;
  const blend = useMemo<BlendIndex>(() => buildBlendIndex(scene), [scene]);

  useEffect(() => {
    onLoaded(true);

    console.log('[GLB] Model loaded. ARKit blendshapes found:', blend.names);

    scene.traverse((obj) => {
      obj.frustumCulled = false;
    });

    // Frame the camera on the head: Rocketbox/RPM are full-body (~1.8m),
    // not a VRM bust, so derive the look-at height from the bounding box.
    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const headY = box.max.y - size.y * 0.08; // eyes sit a bit below the crown
    const dist = Math.max(0.45, size.y * 0.42);

    camera.position.set(center.x, headY, box.max.z + dist);
    camera.lookAt(center.x, headY, center.z);
    camera.updateProjectionMatrix();

    const orbit = controls as unknown as { target?: THREE.Vector3; update?: () => void };
    if (orbit?.target) {
      orbit.target.set(center.x, headY, center.z);
      orbit.update?.();
    }
  }, [scene, blend, camera, controls, onLoaded]);

  // Smoothed mouth-shape influences.
  const curJaw = useRef(0);
  const curFunnel = useRef(0);
  const curPucker = useRef(0);
  const curStretch = useRef(0);

  // Smoothed state-expression influences.
  const curSmile = useRef(0);
  const curBrowUp = useRef(0);
  const curBrowDown = useRef(0);

  // Surprise pulse (eyeWide + browOuterUp) fired once on entering `listening`,
  // and the previous state we use to detect that transition.
  const surprise = useRef(0);
  const prevState = useRef(state);

  // Smoothed "thinking" concentration, and a countdown (seconds) for the warm
  // smile held after a spoken response finishes.
  const curThink = useRef(0);
  const postSmile = useRef(0);

  // Smoothed gaze (eyeLook blendshapes).
  const curGazeX = useRef(0); // + => looking right
  const curGazeY = useRef(0); // + => looking up

  // Blink machine (same cadence as VrmAvatar).
  const blinkTimer = useRef(Math.random() * 3 + 2);
  const blinkVal = useRef(0);
  const isBlinking = useRef(false);

  // Shared mouth engine (audio-reactive, or procedural when analyser=null).
  const mouthEngine = useRef<MouthEngine | null>(null);
  const mouthEngineAnalyser = useRef<MouthSource>(null);

  useFrame((threeState, delta) => {
    const lerp = THREE.MathUtils.lerp;
    const t = threeState.clock.elapsedTime;

    // 0. State-transition reactions:
    //  - entering `listening` fires a brief surprise (decays over ~0.4s).
    //  - leaving `speaking` arms a warm smile held for ~2s, as a friendly
    //    "that's my answer" beat once the avatar stops talking.
    if (state !== prevState.current) {
      if (state === 'listening' && !reducedMotion) surprise.current = 1;
      if (prevState.current === 'speaking' && state !== 'speaking' && !reducedMotion) {
        postSmile.current = 2;
      }
      prevState.current = state;
    }
    surprise.current = Math.max(0, surprise.current - delta * 2.5);
    postSmile.current = Math.max(0, postSmile.current - delta);

    // 1. Blink timing
    if (!reducedMotion) {
      if (!isBlinking.current) {
        blinkTimer.current -= delta;
        if (blinkTimer.current <= 0) isBlinking.current = true;
      } else {
        const speed = 1000 / (blinkDuration || 100);
        blinkVal.current += delta * speed * 2;
        if (blinkVal.current >= 1) {
          blinkVal.current = 1;
          isBlinking.current = false;
          blinkTimer.current =
            Math.random() * ((blinkIntervalMax - blinkIntervalMin) / 1000) +
            blinkIntervalMin / 1000;
        }
      }
    }
    if (!isBlinking.current && blinkVal.current > 0) {
      const speed = 1000 / (blinkDuration || 100);
      blinkVal.current -= delta * speed * 2;
      if (blinkVal.current < 0) blinkVal.current = 0;
    }
    blend.set('eyeBlinkLeft', blinkVal.current);
    blend.set('eyeBlinkRight', blinkVal.current);

    // 2. Gaze from pointer -> eyeLook blendshapes (+ optional head bone).
    const mouseX = threeState.pointer?.x ?? 0;
    const mouseY = threeState.pointer?.y ?? 0;
    const gazeIntensity = reducedMotion ? 0 : mouseTrackingIntensity;

    let targetGazeX = mouseX * gazeIntensity;
    let targetGazeY = mouseY * gazeIntensity;

    // While thinking, glance up-left regardless of pointer.
    if (state === 'thinking') {
      targetGazeX = -0.5 * (reducedMotion ? 0 : 1);
      targetGazeY = 0.6 * (reducedMotion ? 0 : 1);
    } else if (!reducedMotion) {
      // Idle eye-drift: a slow wandering saccade on de-synced phases so the
      // gaze never locks dead-still when the pointer is idle. This is what
      // sells "alive" now that we no longer rotate the head bone, and it's
      // rig-agnostic (eyeLook blendshapes).
      targetGazeX += Math.sin(t * 0.23) * 0.12;
      targetGazeY += Math.sin(t * 0.31 + 1.3) * 0.08;
    }

    curGazeX.current = lerp(curGazeX.current, targetGazeX, 0.1);
    curGazeY.current = lerp(curGazeY.current, targetGazeY, 0.1);

    const gx = curGazeX.current;
    const gy = curGazeY.current;
    blend.set('eyeLookOutRight', Math.max(0, gx));
    blend.set('eyeLookInLeft', Math.max(0, gx));
    blend.set('eyeLookOutLeft', Math.max(0, -gx));
    blend.set('eyeLookInRight', Math.max(0, -gx));
    blend.set('eyeLookUpLeft', Math.max(0, gy));
    blend.set('eyeLookUpRight', Math.max(0, gy));
    blend.set('eyeLookDownLeft', Math.max(0, -gy));
    blend.set('eyeLookDownRight', Math.max(0, -gy));

    // NOTE: we deliberately do NOT rotate the head bone here. Bone-axis
    // conventions differ per rig (RPM/Mixamo vs. Rocketbox's 3ds Max "Bip01"),
    // so a generic rotation.x/.y twists the head around the wrong axis. The
    // gaze is driven entirely by the rig-agnostic ARKit eyeLook blendshapes
    // above, plus the idle eye-drift below — both safe on any rig.

    // 3. State expression
    let targetSmile = 0;
    let targetBrowUp = 0;
    let targetBrowDown = 0;
    if (state === 'listening') {
      targetSmile = 0.35;
      targetBrowUp = 0.25;
    } else if (state === 'thinking') {
      targetBrowDown = 0.45;
    } else if (state === 'speaking') {
      targetSmile = 0.12;
    } else {
      targetSmile = 0.05;
    }
    // Warm smile held for ~2s after a spoken response ends (armed in section 0).
    if (postSmile.current > 0 && state !== 'speaking') {
      targetSmile = Math.max(targetSmile, 0.55);
    }
    // Pensive concentration ramps up only while processing thoughts.
    const targetThink = state === 'thinking' && !reducedMotion ? 1 : 0;

    curSmile.current = lerp(curSmile.current, targetSmile, 0.1);
    curBrowUp.current = lerp(curBrowUp.current, targetBrowUp, 0.1);
    curBrowDown.current = lerp(curBrowDown.current, targetBrowDown, 0.1);
    curThink.current = lerp(curThink.current, targetThink, 0.08);

    const smile = curSmile.current;
    const think = curThink.current;

    blend.set('mouthSmileLeft', smile);
    blend.set('mouthSmileRight', smile);
    blend.set('browInnerUp', curBrowUp.current);
    blend.set('browDownLeft', curBrowDown.current);
    blend.set('browDownRight', curBrowDown.current);

    // Duchenne markers (genuine smile: crinkled cheeks/eyes + dimples) and the
    // thinking squint share the eye morphs, so set each once with the stronger
    // contribution. Thinking also presses the lips for a focused, pensive look.
    blend.set('cheekSquintLeft', smile * 0.6);
    blend.set('cheekSquintRight', smile * 0.6);
    blend.set('mouthDimpleLeft', smile * 0.5);
    blend.set('mouthDimpleRight', smile * 0.5);
    blend.set('eyeSquintLeft', Math.max(smile * 0.35, think * 0.45));
    blend.set('eyeSquintRight', Math.max(smile * 0.35, think * 0.45));
    blend.set('mouthPressLeft', think * 0.4);
    blend.set('mouthPressRight', think * 0.4);

    // Surprise reaction (decaying): wide eyes + outer-brow raise.
    blend.set('eyeWideLeft', surprise.current * 0.7);
    blend.set('eyeWideRight', surprise.current * 0.7);
    blend.set('browOuterUpLeft', surprise.current * 0.6);
    blend.set('browOuterUpRight', surprise.current * 0.6);

    // 4. Audio-reactive mouth -> ARKit mouth blendshapes
    let targetJaw = 0;
    let targetFunnel = 0;
    let targetPucker = 0;
    let targetStretch = 0;

    if (state === 'speaking') {
      if (!mouthEngine.current || mouthEngineAnalyser.current !== analyser) {
        mouthEngine.current = createMouthEngine(analyser);
        mouthEngineAnalyser.current = analyser;
      }
      const frame = mouthEngine.current.read();
      const scaleLimit = maxMouthOpening / 30.0;
      const lvl = frame.level * scaleLimit;

      if (frame.shape === 'o') {
        targetFunnel = lvl * 0.85;
        targetPucker = lvl * 0.6;
        targetJaw = lvl * 0.35;
      } else if (frame.shape === 'e') {
        targetStretch = lvl * 0.7;
        targetJaw = lvl * 0.3;
      } else if (frame.shape === 'a') {
        targetJaw = lvl * 0.9;
      }
    }

    curJaw.current = lerp(curJaw.current, targetJaw, 0.25);
    curFunnel.current = lerp(curFunnel.current, targetFunnel, 0.25);
    curPucker.current = lerp(curPucker.current, targetPucker, 0.25);
    curStretch.current = lerp(curStretch.current, targetStretch, 0.25);

    blend.set('jawOpen', curJaw.current);
    blend.set('mouthFunnel', curFunnel.current);
    blend.set('mouthPucker', curPucker.current);
    blend.set('mouthStretchLeft', curStretch.current);
    blend.set('mouthStretchRight', curStretch.current);

    // 5. Idle "alive" ambient: a quiet face that never moves reads as dead, so
    // add slow lip drift on de-synced sine phases. Gated off while speaking (the
    // mouth engine owns the mouth), while thinking (concentration holds the lips
    // via section 3), and under reduced-motion.
    const idle = reducedMotion || state === 'speaking' || state === 'thinking' ? 0 : 1;
    const sway = Math.sin(t * 0.4) * 0.06 * idle;
    blend.set('mouthLeft', Math.max(0, sway));
    blend.set('mouthRight', Math.max(0, -sway));
    blend.set('mouthRollLower', (Math.sin(t * 0.33) * 0.5 + 0.5) * 0.07 * idle);
    blend.set('mouthShrugUpper', (Math.sin(t * 0.7) * 0.5 + 0.5) * 0.06 * idle);
  });

  return <primitive object={scene} />;
}

export function GlbArkitAvatar({
  state,
  analyser,
  size = 300,
  className = '',
  style,
  maxMouthOpening,
  blinkIntervalMin,
  blinkIntervalMax,
  blinkDuration,
  mouseTrackingIntensity,
  stateColors,
  glbUrl,
}: GlbArkitAvatarProps) {
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  // Gate the GLTFLoader behind a source pre-check: a missing model often comes
  // back as 200 text/html (SPA fallback) rather than a 404, which makes
  // GLTFLoader hang on "loading" forever instead of erroring. We detect that
  // up front and surface a clean error instead.
  const [srcReady, setSrcReady] = useState(false);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    setLoaded(false);
    setLoadError(null);
    setSrcReady(false);
    if (!glbUrl) return;

    let cancelled = false;
    fetch(glbUrl)
      .then((res) => {
        const ct = res.headers.get('content-type') || '';
        if (!res.ok) throw new Error(`HTTP ${res.status} for ${glbUrl}`);
        if (ct.includes('text/html')) {
          throw new Error(`No .glb found at ${glbUrl} (server returned HTML).`);
        }
        if (!cancelled) setSrcReady(true);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err?.message || String(err));
      });

    return () => {
      cancelled = true;
    };
  }, [glbUrl]);

  const resolvedStateColors = {
    idle: stateColors?.idle ?? '#4b5563',
    listening: stateColors?.listening ?? '#3b82f6',
    thinking: stateColors?.thinking ?? '#8b5cf6',
    speaking: stateColors?.speaking ?? '#10b981',
    working: stateColors?.working ?? '#f59e0b',
  };

  return (
    <div
      className={`relative flex items-center justify-center rounded-3xl overflow-hidden border border-zinc-800/40 bg-zinc-950/40 ${className}`}
      style={{ width: size, height: size, ...style }}
    >
      <Canvas
        camera={{ position: [0, 1.5, 1], fov: 35 }}
        shadows
        gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
        style={{ width: '100%', height: '100%', background: 'transparent' }}
      >
        <ambientLight intensity={1.5} />
        <spotLight
          position={[0, 3, 2]}
          angle={0.6}
          penumbra={1}
          intensity={3}
          color={resolvedStateColors[state]}
          castShadow
        />
        <directionalLight position={[-2, 2, -2]} intensity={1.8} color="#ffffff" />
        <directionalLight position={[2, 2, 2]} intensity={2.2} color="#ffffff" />

        <ModelErrorBoundary onError={(err) => setLoadError(err)}>
          {glbUrl && srcReady && (
            <Suspense fallback={null}>
              <GlbModel
                url={glbUrl}
                state={state}
                analyser={analyser}
                maxMouthOpening={maxMouthOpening}
                mouseTrackingIntensity={mouseTrackingIntensity}
                blinkIntervalMin={blinkIntervalMin}
                blinkIntervalMax={blinkIntervalMax}
                blinkDuration={blinkDuration}
                reducedMotion={reducedMotion}
                onLoaded={(status) => setLoaded(status)}
              />
            </Suspense>
          )}
        </ModelErrorBoundary>

        <OrbitControls
          makeDefault
          enableZoom={false}
          enablePan={false}
          minPolarAngle={Math.PI / 2.6}
          maxPolarAngle={Math.PI / 1.7}
          minAzimuthAngle={-Math.PI / 4}
          maxAzimuthAngle={Math.PI / 4}
        />
      </Canvas>

      {!glbUrl && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/90 backdrop-blur-md z-20 p-4 text-center">
          <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider mb-2">
            Missing glbUrl
          </span>
          <p className="text-[10px] text-zinc-500 max-w-[200px] leading-relaxed">
            Pass a CORS-enabled .glb URL (with ARKit blendshapes) via the glbUrl prop.
          </p>
        </div>
      )}

      {glbUrl && !loaded && !loadError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/80 backdrop-blur-md z-20">
          <div className="w-10 h-10 border-4 border-t-emerald-500 border-emerald-500/20 rounded-full animate-spin mb-3"></div>
          <span className="text-[10px] font-mono font-bold tracking-widest text-zinc-400 animate-pulse">
            LOADING GLB MODEL...
          </span>
        </div>
      )}

      {loadError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/90 backdrop-blur-md z-20 p-4 text-center">
          <span className="text-xs font-mono font-bold text-red-400 uppercase tracking-wider mb-2">
            Failed to load GLB
          </span>
          <p className="text-[10px] text-zinc-500 max-w-[200px] leading-relaxed break-all">
            {loadError}
          </p>
        </div>
      )}
    </div>
  );
}
