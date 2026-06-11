import React, { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { useGLTF, useAnimations, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { AvatarProps } from './DefaultAvatar';

export interface RpmAvatarProps extends AvatarProps {
  rpmUrl?: string;
}

// Error Boundary to gracefully catch loader issues
class RpmErrorBoundary extends React.Component<
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

// Helper to update morph target influences on all meshes inside a scene
function setMorphTarget(scene: THREE.Group, name: string, value: number) {
  scene.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.isMesh && mesh.morphTargetDictionary && mesh.morphTargetInfluences) {
      const idx = mesh.morphTargetDictionary[name];
      if (idx !== undefined) {
        mesh.morphTargetInfluences[idx] = value;
      }
    }
  });
}

// Helper to clean up animation track names so they target bones directly (compatible with any RPM skeleton)
function cleanAnimationClip(clip: THREE.AnimationClip, name: string): THREE.AnimationClip {
  const cloned = clip.clone();
  cloned.name = name;
  cloned.tracks.forEach((track) => {
    // track.name can be e.g. "Armature.Hips.position" -> convert to "Hips.position"
    const parts = track.name.split('.');
    if (parts.length > 2) {
      const property = parts[parts.length - 1]; // "position", "quaternion", "scale"
      const boneName = parts[parts.length - 2]; // "Hips", "Spine", etc.
      track.name = `${boneName}.${property}`;
    }
    // Remove slash prefixes if any: "Armature/Hips.position" -> "Hips.position"
    track.name = track.name.replace(/.*[\/]/, '');
  });
  return cloned;
}

// Inner component loaded inside R3F Canvas context
function RpmModel({
  url,
  state,
  analyser,
  maxMouthOpening = 30,
  mouseTrackingIntensity = 1.0,
  blinkIntervalMin = 2000,
  blinkIntervalMax = 6000,
  blinkDuration = 100,
  onLoaded,
}: {
  url: string;
  state: string;
  analyser: AnalyserNode | null;
  maxMouthOpening?: number;
  mouseTrackingIntensity?: number;
  blinkIntervalMin?: number;
  blinkIntervalMax?: number;
  blinkDuration?: number;
  onLoaded: (loaded: boolean) => void;
}) {
  // Load the Ready Player Me GLB avatar model
  const { scene } = useGLTF(url);

  // Load state body animations (GLB formats from FilamentGames RPM animation-library)
  const idleGltf = useGLTF('/animations/rpm/idle.glb');
  const talkingGltf = useGLTF('/animations/rpm/talking.glb');
  const thinkingGltf = useGLTF('/animations/rpm/thinking.glb');

  // Extract the original animations
  const idleClip = idleGltf.animations[0];
  const talkingClip = talkingGltf.animations[0];
  const thinkingClip = thinkingGltf.animations[0];

  // Clean animation tracks to target bones directly, ensuring skeletal compatibility
  const cleanedClips = React.useMemo(() => {
    const clips: THREE.AnimationClip[] = [];
    if (idleClip) clips.push(cleanAnimationClip(idleClip, 'idle'));
    if (talkingClip) clips.push(cleanAnimationClip(talkingClip, 'talking'));
    if (thinkingClip) clips.push(cleanAnimationClip(thinkingClip, 'thinking'));
    return clips;
  }, [idleClip, talkingClip, thinkingClip]);

  // Hook up useAnimations mixer
  const { actions, mixer } = useAnimations(cleanedClips, scene);

  // Active bone references for gaze tracking
  const neckRef = useRef<THREE.Object3D | null>(null);
  const headRef = useRef<THREE.Object3D | null>(null);

  useEffect(() => {
    if (scene) {
      onLoaded(true);

      // Disable frustum culling to prevent avatar flickering when camera angles get close
      scene.traverse((obj) => {
        obj.frustumCulled = false;
        if ((obj as any).isMesh) {
          obj.castShadow = true;
          obj.receiveShadow = true;
        }
      });

      // Find tracking bones
      neckRef.current = scene.getObjectByName('Neck') || scene.getObjectByName('mixamorigNeck') || null;
      headRef.current = scene.getObjectByName('Head') || scene.getObjectByName('mixamorigHead') || null;

      console.log(
        "[RPM] Model loaded successfully. Found Neck bone:", 
        !!neckRef.current, 
        "Head bone:", 
        !!headRef.current
      );
    }
  }, [scene, onLoaded]);

  // Handle animation crossfades based on state
  useEffect(() => {
    let activeActionName = 'idle';
    if (state === 'speaking') {
      activeActionName = 'talking';
    } else if (state === 'thinking') {
      activeActionName = 'thinking';
    }

    const action = actions[activeActionName];
    if (action) {
      // Fade in the new action and play it
      action.reset().fadeIn(0.25).play();
    }

    return () => {
      if (action) {
        action.fadeOut(0.25);
      }
    };
  }, [state, actions]);

  // Smoothed mouth shape tracking refs
  const currentAa = useRef(0);
  const currentEe = useRef(0);
  const currentOo = useRef(0);

  // Smoothed expression tracking refs
  const currentSmile = useRef(0);
  const currentFrown = useRef(0);

  // Blinking animation states
  const blinkTimer = useRef(Math.random() * 3 + 2);
  const blinkVal = useRef(0);
  const isBlinking = useRef(false);

  // Audio frequency arrays
  const dataArray = useRef<Uint8Array | null>(null);
  const frequencyData = useRef<Uint8Array | null>(null);

  useFrame((threeState, delta) => {
    if (!scene) return;

    const neck = neckRef.current;
    const head = headRef.current;

    // 1. Head Gaze tracking from pointer coordinates
    const mouseX = threeState.pointer?.x ?? threeState.mouse?.x ?? 0;
    const mouseY = threeState.pointer?.y ?? threeState.mouse?.y ?? 0;

    const targetRotY = mouseX * 0.30 * mouseTrackingIntensity;
    const targetRotX = -mouseY * 0.18 * mouseTrackingIntensity;

    if (state === 'thinking') {
      // Make model look slightly up-left while thinking
      if (neck) {
        neck.rotation.y = THREE.MathUtils.lerp(neck.rotation.y, -0.18, 0.05);
        neck.rotation.x = THREE.MathUtils.lerp(neck.rotation.x, 0.12, 0.05);
      }
      if (head) {
        head.rotation.y = THREE.MathUtils.lerp(head.rotation.y, -0.05, 0.05);
        head.rotation.x = THREE.MathUtils.lerp(head.rotation.x, 0.05, 0.05);
      }
    } else {
      // Turn neck/head to look at cursor
      if (neck) {
        neck.rotation.y = THREE.MathUtils.lerp(neck.rotation.y, targetRotY, 0.1);
        neck.rotation.x = THREE.MathUtils.lerp(neck.rotation.x, targetRotX, 0.1);
      }
      if (head) {
        head.rotation.y = THREE.MathUtils.lerp(head.rotation.y, targetRotY * 0.2, 0.1);
        head.rotation.x = THREE.MathUtils.lerp(head.rotation.x, targetRotX * 0.2, 0.1);
      }
    }

    // 2. Automated Eye Blinking
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

    if (!isBlinking.current && blinkVal.current > 0) {
      const speed = 1000 / (blinkDuration || 100);
      blinkVal.current -= delta * speed * 2;
      if (blinkVal.current < 0) blinkVal.current = 0;
    }

    // Apply blink blendshapes
    setMorphTarget(scene, 'eyeBlinkLeft', blinkVal.current);
    setMorphTarget(scene, 'eyeBlinkRight', blinkVal.current);

    // 3. Emotional Expression Mapping based on State (ARKit Blendshapes)
    let targetSmile = 0;
    let targetFrown = 0;

    if (state === 'listening') {
      targetSmile = 0.25;
    } else if (state === 'speaking') {
      targetSmile = 0.15;
    } else if (state === 'thinking') {
      targetFrown = 0.30;
    } else {
      // Idle
      targetSmile = 0.05;
    }

    currentSmile.current = THREE.MathUtils.lerp(currentSmile.current, targetSmile, 0.1);
    currentFrown.current = THREE.MathUtils.lerp(currentFrown.current, targetFrown, 0.1);

    // Set standard base emotions
    setMorphTarget(scene, 'mouthSmileLeft', currentSmile.current);
    setMorphTarget(scene, 'mouthSmileRight', currentSmile.current);
    setMorphTarget(scene, 'mouthFrownLeft', currentFrown.current);
    setMorphTarget(scene, 'mouthFrownRight', currentFrown.current);

    // 4. Viseme-based Lip-Syncing
    if (analyser && state === 'speaking') {
      const binCount = analyser.frequencyBinCount;
      if (!dataArray.current || dataArray.current.length !== binCount) {
        dataArray.current = new Uint8Array(binCount);
        frequencyData.current = new Uint8Array(binCount);
      }

      analyser.getByteTimeDomainData(dataArray.current);
      analyser.getByteFrequencyData(frequencyData.current);

      // Normalized peak volume calculation
      let maxVal = 0;
      for (let i = 0; i < binCount; i++) {
        const dev = Math.abs(dataArray.current[i] - 128);
        if (dev > maxVal) maxVal = dev;
      }
      const volume = Math.min(1.0, maxVal / 128);

      let targetAa = 0;
      let targetEe = 0;
      let targetOo = 0;

      if (volume > 0.04) {
        const sampleRate = analyser.context.sampleRate || 24000;
        const Nyquist = sampleRate / 2;
        const binWidth = Nyquist / binCount;

        const lowStart = Math.round(200 / binWidth);
        const lowEnd = Math.round(800 / binWidth);
        const midStart = Math.round(800 / binWidth);
        const midEnd = Math.round(1800 / binWidth);
        const highStart = Math.round(1800 / binWidth);
        const highEnd = Math.round(3200 / binWidth);

        let energyLow = 0;
        let energyMid = 0;
        let energyHigh = 0;

        for (let i = lowStart; i <= lowEnd; i++) energyLow += frequencyData.current[i] || 0;
        for (let i = midStart; i <= midEnd; i++) energyMid += frequencyData.current[i] || 0;
        for (let i = highStart; i <= highEnd; i++) energyHigh += frequencyData.current[i] || 0;

        const total = energyLow + energyMid + energyHigh + 0.001;
        const ratioHigh = energyHigh / total;
        const ratioMid = energyMid / total;

        // Align maxMouthOpening px (10-60) scale to a standard Three-gltf morph target multiplier
        const scaleLimit = maxMouthOpening / 30.0;

        if (ratioHigh > 0.35) {
          // "E" sound -> mouthStretch / smile viseme
          targetEe = volume * 0.8 * scaleLimit;
        } else if (ratioMid > 0.40 && ratioHigh < 0.20) {
          // "O" sound -> mouthPucker narrow mouth viseme
          targetOo = volume * 0.8 * scaleLimit;
        } else {
          // "A" / Low sound -> jawOpen wide mouth viseme
          targetAa = volume * 0.95 * scaleLimit;
        }
      }

      currentAa.current = THREE.MathUtils.lerp(currentAa.current, targetAa, 0.25);
      currentEe.current = THREE.MathUtils.lerp(currentEe.current, targetEe, 0.25);
      currentOo.current = THREE.MathUtils.lerp(currentOo.current, targetOo, 0.25);

      setMorphTarget(scene, 'jawOpen', currentAa.current);
      setMorphTarget(scene, 'mouthSmileLeft', Math.max(currentSmile.current, currentEe.current));
      setMorphTarget(scene, 'mouthSmileRight', Math.max(currentSmile.current, currentEe.current));
      setMorphTarget(scene, 'mouthPucker', currentOo.current);
      setMorphTarget(scene, 'mouthFunnel', currentOo.current);
    } else {
      currentAa.current = THREE.MathUtils.lerp(currentAa.current, 0, 0.2);
      currentEe.current = THREE.MathUtils.lerp(currentEe.current, 0, 0.2);
      currentOo.current = THREE.MathUtils.lerp(currentOo.current, 0, 0.2);

      setMorphTarget(scene, 'jawOpen', currentAa.current);
      setMorphTarget(scene, 'mouthSmileLeft', currentSmile.current);
      setMorphTarget(scene, 'mouthSmileRight', currentSmile.current);
      setMorphTarget(scene, 'mouthPucker', currentOo.current);
      setMorphTarget(scene, 'mouthFunnel', currentOo.current);
    }
  });

  return <primitive object={scene} position={[0, -1.0, 0]} />;
}

// Pre-preload animations for smooth transitions
useGLTF.preload('/animations/rpm/idle.glb');
useGLTF.preload('/animations/rpm/talking.glb');
useGLTF.preload('/animations/rpm/thinking.glb');

export function RpmAvatar({
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
  rpmUrl = 'https://models.readyplayer.me/63a9ab390c111d89f95c1fa9.glb',
}: RpmAvatarProps) {
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Automatically ensure morph targets are queried in the URL
  const resolvedRpmUrl = React.useMemo(() => {
    if (!rpmUrl) return '';
    // If it's a models.readyplayer.me URL, make sure it asks for morphTargets
    if (rpmUrl.includes('readyplayer.me') && !rpmUrl.includes('morphTargets')) {
      const separator = rpmUrl.includes('?') ? '&' : '?';
      return `${rpmUrl}${separator}morphTargets=ARKit,OculusVisemes`;
    }
    return rpmUrl;
  }, [rpmUrl]);

  // Reset loaded/error flags when URL changes
  useEffect(() => {
    setLoaded(false);
    setLoadError(null);
  }, [resolvedRpmUrl]);

  const resolvedStateColors = {
    idle: stateColors?.idle ?? '#4b5563',
    listening: stateColors?.listening ?? '#3b82f6',
    thinking: stateColors?.thinking ?? '#8b5cf6',
    speaking: stateColors?.speaking ?? '#10b981',
  };

  return (
    <div
      className={`relative flex items-center justify-center rounded-full overflow-hidden border border-zinc-800/40 bg-zinc-950/40 ${className}`}
      style={{ width: size, height: size, ...style }}
    >
      {/* 3D R3F Canvas */}
      <Canvas
        camera={{ position: [0, 0.45, 0.75], fov: 36 }}
        shadows
        gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
        style={{ width: '100%', height: '100%', background: 'transparent' }}
      >
        {/* Ambient background light */}
        <ambientLight intensity={1.5} />

        {/* Dynamic spot light on head matching current neural state color */}
        <spotLight
          position={[0, 2, 1.5]}
          angle={0.6}
          penumbra={1}
          intensity={3}
          color={resolvedStateColors[state]}
          castShadow
        />

        {/* Rim lighting to accentuate depth of 3D mesh */}
        <directionalLight position={[-2, 1.5, -2]} intensity={1.8} color="#ffffff" />
        <directionalLight position={[2, 1.5, 2]} intensity={2.2} color="#ffffff" />

        <RpmErrorBoundary onError={(err) => setLoadError(err)}>
          {resolvedRpmUrl && (
            <Suspense fallback={null}>
              <RpmModel
                url={resolvedRpmUrl}
                state={state}
                analyser={analyser}
                maxMouthOpening={maxMouthOpening}
                mouseTrackingIntensity={mouseTrackingIntensity}
                blinkIntervalMin={blinkIntervalMin}
                blinkIntervalMax={blinkIntervalMax}
                blinkDuration={blinkDuration}
                onLoaded={(status) => setLoaded(status)}
              />
            </Suspense>
          )}
        </RpmErrorBoundary>

        {/* Natural locked camera orbit bounds */}
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          minPolarAngle={Math.PI / 2.6}
          maxPolarAngle={Math.PI / 1.7}
          minAzimuthAngle={-Math.PI / 4}
          maxAzimuthAngle={Math.PI / 4}
          target={[0, 0.38, 0]}
        />
      </Canvas>

      {/* Loading indicator overlay */}
      {!loaded && !loadError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/80 backdrop-blur-md z-20">
          <div className="w-10 h-10 border-4 border-t-emerald-500 border-emerald-500/20 rounded-full animate-spin mb-3"></div>
          <span className="text-[10px] font-mono font-bold tracking-widest text-zinc-400 animate-pulse">
            LOADING READY PLAYER ME MODEL...
          </span>
        </div>
      )}

      {/* Error indicator overlay */}
      {loadError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/90 backdrop-blur-md z-20 p-4 text-center">
          <span className="text-xs font-mono font-bold text-red-400 uppercase tracking-wider mb-2">
            Failed to load avatar
          </span>
          <p className="text-[10px] text-zinc-500 max-w-[200px] leading-relaxed break-all">
            {loadError}
          </p>
        </div>
      )}
    </div>
  );
}
