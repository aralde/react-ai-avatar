import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRM, VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { AvatarProps } from './DefaultAvatar';
import { createMouthEngine, MouthEngine, MouthSource } from '../lib/mouthEngine';
import { useReducedMotion } from '../lib/useReducedMotion';

export interface VrmAvatarProps extends AvatarProps {
  vrmUrl?: string;
}

// Error Boundary to gracefully catch loader issues
class VrmErrorBoundary extends React.Component<
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
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}

function setVrmExpression(
  vrm: VRM,
  preset: 'blink' | 'aa' | 'ee' | 'oo' | 'happy' | 'sad' | 'relaxed',
  value: number
) {
  if (!vrm.expressionManager) return;

  const expressionMap = (vrm.expressionManager as any).expressionMap || {};
  const availableKeys = Object.keys(expressionMap);

  let targetKeys: string[] = [];

  switch (preset) {
    case 'blink':
      targetKeys = ['blink', 'Blink', 'BLINK'];
      break;
    case 'aa':
      targetKeys = ['aa', 'Aa', 'a', 'A', 'AA', 'mouth_a', 'mouth_A'];
      break;
    case 'ee':
      targetKeys = ['ee', 'Ee', 'e', 'E', 'EE', 'mouth_e', 'mouth_E'];
      break;
    case 'oo':
      targetKeys = ['oh', 'Oh', 'oo', 'Oo', 'o', 'O', 'OO', 'mouth_o', 'mouth_O'];
      break;
    case 'happy':
      targetKeys = ['happy', 'Happy', 'joy', 'Joy', 'JOY', 'fun', 'Fun', 'FUN', 'HAPPY'];
      break;
    case 'sad':
      targetKeys = ['sad', 'Sad', 'sorrow', 'Sorrow', 'SORROW', 'sadness', 'SAD'];
      break;
    case 'relaxed':
      targetKeys = ['relaxed', 'Relaxed', 'fun', 'Fun', 'FUN', 'neutral', 'Neutral', 'RELAXED'];
      break;
  }

  const matchingKey = targetKeys.find(key => expressionMap[key] !== undefined || availableKeys.includes(key));
  if (matchingKey) {
    vrm.expressionManager.setValue(matchingKey, value);
  } else {
    try {
      vrm.expressionManager.setValue(targetKeys[0], value);
    } catch (e) {}
  }
}

// Inner component loaded inside R3F Canvas context
function VrmModel({
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
  onError,
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
  onError: (err: string) => void;
}) {
  // Unlike GLB (where we can clone the cached scene), a VRM's animation reads
  // through `vrm.update()`, `vrm.humanoid` and `vrm.expressionManager`, all of
  // which point at the originally-parsed nodes. Sharing one cached VRM across
  // two avatars would make them mount the same scene (one goes blank) AND fight
  // over the same expression/bone state. So we deliberately bypass the
  // `useLoader` cache and parse a fresh, independent VRM per instance.
  const [vrm, setVrm] = useState<VRM | null>(null);

  useEffect(() => {
    let cancelled = false;
    let loaded: VRM | null = null;

    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));
    loader.load(
      url,
      (gltf) => {
        if (cancelled) {
          // Mounted-then-unmounted before load finished: free the GPU resources.
          const v = gltf.userData.vrm as VRM | undefined;
          if (v) VRMUtils.deepDispose(v.scene);
          return;
        }
        const v = gltf.userData.vrm as VRM | undefined;
        if (!v) {
          onError(`No VRM found at ${url}.`);
          return;
        }

        console.log(
          '[VRM] Model loaded successfully. Available expressions:',
          Object.keys((v.expressionManager as any)?.expressionMap || {}),
        );

        // Disable frustum culling to prevent avatar flickering when camera angles get close
        v.scene.traverse((obj) => {
          obj.frustumCulled = false;
        });

        // Rotate the model so it faces the camera directly
        // VRM 0.x starts facing -Z (needs 180 deg rotation), VRM 1.0 starts facing +Z
        const isVRM0 = (v.meta as any)?.metaVersion === '0';
        v.scene.rotation.y = isVRM0 ? Math.PI : 0;

        loaded = v;
        setVrm(v);
        onLoaded(true);
      },
      undefined,
      (err) => {
        if (!cancelled) onError((err as any)?.message || String(err));
      },
    );

    return () => {
      cancelled = true;
      // Release this instance's own GPU resources (geometries/textures/skeleton).
      if (loaded) VRMUtils.deepDispose(loaded.scene);
    };
  }, [url, onLoaded, onError]);

  // Smoothed mouth shape tracking refs
  const currentAa = useRef(0);
  const currentEe = useRef(0);
  const currentOo = useRef(0);

  // Smoothed expression tracking refs
  const currentHappy = useRef(0);
  const currentRelaxed = useRef(0);
  const currentSad = useRef(0);

  // Blinking animation states
  const blinkTimer = useRef(Math.random() * 3 + 2);
  const blinkVal = useRef(0);
  const isBlinking = useRef(false);

  // Shared mouth engine (audio-reactive, or procedural when analyser=null)
  const mouthEngine = useRef<MouthEngine | null>(null);
  const mouthEngineAnalyser = useRef<MouthSource>(null);

  useFrame((threeState, delta) => {
    if (!vrm) return;

    // 1. Update VRM (specifically key for spring bones / physics updates)
    vrm.update(delta);

    const neck = vrm.humanoid?.getNormalizedBoneNode('neck');
    const head = vrm.humanoid?.getNormalizedBoneNode('head');

    // Pose arms down naturally inside the update loop for VRM 0.x models (which start in T-pose)
    const isVRM0 = (vrm.meta as any)?.metaVersion === '0';
    if (isVRM0) {
      const leftUpperArm = vrm.humanoid?.getNormalizedBoneNode('leftUpperArm');
      const rightUpperArm = vrm.humanoid?.getNormalizedBoneNode('rightUpperArm');
      if (leftUpperArm) {
        leftUpperArm.rotation.z = Math.PI / 2.6; // ~70 degrees down
      }
      if (rightUpperArm) {
        rightUpperArm.rotation.z = -Math.PI / 2.6; // ~70 degrees down
      }
    }

    // 2. Head Gaze tracking from pointer coordinates
    const mouseX = threeState.pointer?.x ?? threeState.mouse?.x ?? 0;
    const mouseY = threeState.pointer?.y ?? threeState.mouse?.y ?? 0;

    const gazeIntensity = reducedMotion ? 0 : mouseTrackingIntensity;
    const targetRotY = mouseX * 0.35 * gazeIntensity;
    const targetRotX = -mouseY * 0.20 * gazeIntensity;

    if (neck) {
      neck.rotation.y = THREE.MathUtils.lerp(neck.rotation.y, targetRotY, 0.1);
      neck.rotation.x = THREE.MathUtils.lerp(neck.rotation.x, targetRotX, 0.1);
    }
    if (head) {
      head.rotation.y = THREE.MathUtils.lerp(head.rotation.y, targetRotY * 0.2, 0.1);
      head.rotation.x = THREE.MathUtils.lerp(head.rotation.x, targetRotX * 0.2, 0.1);
    }

    // 3. Automated Eye Blinking (disabled under prefers-reduced-motion)
    if (!reducedMotion) {
      if (!isBlinking.current) {
        blinkTimer.current -= delta;
        if (blinkTimer.current <= 0) {
          isBlinking.current = true;
        }
      } else {
        const speed = 1000 / (blinkDuration || 100);
        blinkVal.current += delta * speed * 2;
        if (blinkVal.current >= 1) {
          blinkVal.current = 1;
          isBlinking.current = false;
          blinkTimer.current = Math.random() * ((blinkIntervalMax - blinkIntervalMin) / 1000) + (blinkIntervalMin / 1000);
        }
      }
    }

    if (!isBlinking.current && blinkVal.current > 0) {
      const speed = 1000 / (blinkDuration || 100);
      blinkVal.current -= delta * speed * 2;
      if (blinkVal.current < 0) blinkVal.current = 0;
    }

    if (vrm.expressionManager) {
      setVrmExpression(vrm, 'blink', blinkVal.current);

      // 4. Emotional Expression Mapping based on State
      let targetHappy = 0;
      let targetRelaxed = 0;
      let targetSad = 0;

      if (state === 'listening') {
        targetHappy = 0.35;
        targetRelaxed = 0.20;
      } else if (state === 'thinking') {
        targetSad = 0.25;
        targetRelaxed = 0.15;
        // Make model look slightly up-left while thinking
        if (neck) {
          neck.rotation.y = THREE.MathUtils.lerp(neck.rotation.y, -0.18, 0.05);
          neck.rotation.x = THREE.MathUtils.lerp(neck.rotation.x, 0.12, 0.05);
        }
      } else if (state === 'speaking') {
        targetHappy = 0.15;
      } else {
        // Idle
        targetHappy = 0.05;
      }

      currentHappy.current = THREE.MathUtils.lerp(currentHappy.current, targetHappy, 0.1);
      currentRelaxed.current = THREE.MathUtils.lerp(currentRelaxed.current, targetRelaxed, 0.1);
      currentSad.current = THREE.MathUtils.lerp(currentSad.current, targetSad, 0.1);

      setVrmExpression(vrm, 'happy', currentHappy.current);
      setVrmExpression(vrm, 'relaxed', currentRelaxed.current);
      setVrmExpression(vrm, 'sad', currentSad.current);

      // 5. Audio-reactive mouth mapped onto VRM visemes
      if (state === 'speaking') {
        if (!mouthEngine.current || mouthEngineAnalyser.current !== analyser) {
          mouthEngine.current = createMouthEngine(analyser);
          mouthEngineAnalyser.current = analyser;
        }
        const frame = mouthEngine.current.read();

        // Align maxMouthOpening px (10-60) scale to a standard Three-vrm multiplier
        const scaleLimit = maxMouthOpening / 30.0;

        let targetAa = 0;
        let targetEe = 0;
        let targetOo = 0;
        if (frame.shape === 'e') {
          targetEe = frame.level * 0.8 * scaleLimit;
        } else if (frame.shape === 'o') {
          targetOo = frame.level * 0.8 * scaleLimit;
        } else if (frame.shape === 'a') {
          targetAa = frame.level * 0.95 * scaleLimit;
        }

        currentAa.current = THREE.MathUtils.lerp(currentAa.current, targetAa, 0.25);
        currentEe.current = THREE.MathUtils.lerp(currentEe.current, targetEe, 0.25);
        currentOo.current = THREE.MathUtils.lerp(currentOo.current, targetOo, 0.25);

        setVrmExpression(vrm, 'aa', currentAa.current);
        setVrmExpression(vrm, 'ee', currentEe.current);
        setVrmExpression(vrm, 'oo', currentOo.current);
      } else {
        currentAa.current = THREE.MathUtils.lerp(currentAa.current, 0, 0.2);
        currentEe.current = THREE.MathUtils.lerp(currentEe.current, 0, 0.2);
        currentOo.current = THREE.MathUtils.lerp(currentOo.current, 0, 0.2);

        setVrmExpression(vrm, 'aa', currentAa.current);
        setVrmExpression(vrm, 'ee', currentEe.current);
        setVrmExpression(vrm, 'oo', currentOo.current);
      }

      vrm.expressionManager.update();
    }
  });

  if (!vrm) return null;
  return <primitive object={vrm.scene} />;
}

export function VrmAvatar({
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
  vrmUrl,
}: VrmAvatarProps) {
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const reducedMotion = useReducedMotion();

  // Reset loaded/error flags when URL changes
  useEffect(() => {
    setLoaded(false);
    setLoadError(null);
  }, [vrmUrl]);

  // Stable callbacks: VrmModel's loader effect depends on these, so recreating
  // them each render would re-trigger the (expensive) VRM parse every render.
  const handleLoaded = useCallback((status: boolean) => setLoaded(status), []);
  const handleError = useCallback((err: string) => setLoadError(err), []);

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
      {/* 3D R3F Canvas */}
      <Canvas
        camera={{ position: [0, 1.43, 0.88], fov: 44 }}
        shadows
        gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
        style={{ width: '100%', height: '100%', background: 'transparent' }}
      >
        {/* Ambient background light */}
        <ambientLight intensity={1.5} />

        {/* Dynamic spot light on head matching current neural state color */}
        <spotLight
          position={[0, 3, 2]}
          angle={0.6}
          penumbra={1}
          intensity={3}
          color={resolvedStateColors[state]}
          castShadow
        />

        {/* Rim lighting to accentuate depth of 3D mesh */}
        <directionalLight position={[-2, 2, -2]} intensity={1.8} color="#ffffff" />
        <directionalLight position={[2, 2, 2]} intensity={2.2} color="#ffffff" />

        <VrmErrorBoundary onError={(err) => setLoadError(err)}>
          {vrmUrl && (
            <Suspense fallback={null}>
              <VrmModel
                url={vrmUrl}
                state={state}
                analyser={analyser}
                maxMouthOpening={maxMouthOpening}
                mouseTrackingIntensity={mouseTrackingIntensity}
                blinkIntervalMin={blinkIntervalMin}
                blinkIntervalMax={blinkIntervalMax}
                blinkDuration={blinkDuration}
                reducedMotion={reducedMotion}
                onLoaded={handleLoaded}
                onError={handleError}
              />
            </Suspense>
          )}
        </VrmErrorBoundary>

        {/* Natural locked camera orbit bounds */}
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          minPolarAngle={Math.PI / 2.6}
          maxPolarAngle={Math.PI / 1.7}
          minAzimuthAngle={-Math.PI / 4}
          maxAzimuthAngle={Math.PI / 4}
          target={[0, 1.38, 0]}
        />
      </Canvas>

      {/* Missing URL overlay */}
      {!vrmUrl && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/90 backdrop-blur-md z-20 p-4 text-center">
          <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider mb-2">
            Missing vrmUrl
          </span>
          <p className="text-[10px] text-zinc-500 max-w-[200px] leading-relaxed">
            Pass a CORS-enabled .vrm URL via the vrmUrl prop.
          </p>
        </div>
      )}

      {/* Loading indicator overlay */}
      {vrmUrl && !loaded && !loadError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/80 backdrop-blur-md z-20">
          <div className="w-10 h-10 border-4 border-t-emerald-500 border-emerald-500/20 rounded-full animate-spin mb-3"></div>
          <span className="text-[10px] font-mono font-bold tracking-widest text-zinc-400 animate-pulse">
            LOADING NEURAL VRM MODEL...
          </span>
        </div>
      )}

      {/* Error indicator overlay */}
      {loadError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/90 backdrop-blur-md z-20 p-4 text-center">
          <span className="text-xs font-mono font-bold text-red-400 uppercase tracking-wider mb-2">
            Failed to load VRM
          </span>
          <p className="text-[10px] text-zinc-500 max-w-[200px] leading-relaxed break-all">
            {loadError}
          </p>
        </div>
      )}
    </div>
  );
}
