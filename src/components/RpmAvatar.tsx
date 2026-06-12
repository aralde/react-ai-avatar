import React, { Suspense, useEffect, useRef, useState, useMemo } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { useGLTF, useAnimations, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { AvatarProps } from './DefaultAvatar';

export interface RpmAvatarProps extends AvatarProps {
  rpmUrl?: string;
  onDebugInfo?: (info: string) => void;
}

// Error Boundary to gracefully catch loader issues
class RpmErrorBoundary extends React.Component<
  { children: React.ReactNode; onError: (err: string) => void; onDebugInfo?: (info: string) => void },
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
    const errMsg = error?.message || String(error);
    this.props.onError(errMsg);
    if (this.props.onDebugInfo) {
      this.props.onDebugInfo(`Load Error: ${errMsg}`);
    }
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
  onDebugInfo,
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
  onDebugInfo?: (info: string) => void;
}) {
  // Load the Ready Player Me GLB avatar model (destructuring scene and animations)
  const { scene, animations: modelAnimations } = useGLTF(url);
  const isCaricature = url.includes('old_face_-_caricature.glb');

  // Clone the scene for this instance to prevent multiple-rendering conflicts
  const clonedScene = useMemo(() => {
    return SkeletonUtils.clone(scene);
  }, [scene]);

  // Dynamic state for model position and scale
  const [modelPos, setModelPos] = useState<[number, number, number]>(isCaricature ? [0, 17.3, -4.2] : [0, -1.32, 0]);
  const [modelScale, setModelScale] = useState<number>(isCaricature ? 4 : 1);

  // Prevent dynamic scaling infinite loop
  const hasCalculated = useRef(false);

  useEffect(() => {
    hasCalculated.current = false;
  }, [url]);

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
    
    // Add caricature model's native animations if present
    if (modelAnimations && modelAnimations.length > 0) {
      modelAnimations.forEach((clip) => {
        clips.push(clip);
      });
    }
    return clips;
  }, [idleClip, talkingClip, thinkingClip, modelAnimations]);

  // Hook up useAnimations mixer to cloned scene
  const { actions, mixer } = useAnimations(cleanedClips, clonedScene);

  // Active bone references
  const neckRef = useRef<THREE.Object3D | null>(null);
  const headRef = useRef<THREE.Object3D | null>(null);
  const jawRef = useRef<THREE.Object3D | null>(null);
  const paupGRef = useRef<THREE.Object3D | null>(null);
  const paupDRef = useRef<THREE.Object3D | null>(null);
  const eyeDRef = useRef<THREE.Object3D | null>(null);
  const eyeGRef = useRef<THREE.Object3D | null>(null);

  // Default rotation storage to apply relative procedural motions
  const defaultNeckRotation = useRef<THREE.Euler | null>(null);
  const defaultHeadRotation = useRef<THREE.Euler | null>(null);
  const defaultJawRotation = useRef<THREE.Euler | null>(null);
  const defaultPaupGRotation = useRef<THREE.Euler | null>(null);
  const defaultPaupDRotation = useRef<THREE.Euler | null>(null);
  const defaultEyeDRotation = useRef<THREE.Euler | null>(null);
  const defaultEyeGRotation = useRef<THREE.Euler | null>(null);

  useEffect(() => {
    if (clonedScene) {
      onLoaded(true);

      // Disable frustum culling to prevent avatar flickering when camera angles get close
      clonedScene.traverse((obj) => {
        obj.frustumCulled = false;
        if ((obj as any).isMesh) {
          obj.castShadow = true;
          obj.receiveShadow = true;

          const mesh = obj as THREE.Mesh;
          // Rebuild material for caricature to standard PBR to prevent black rendering
          if (isCaricature && mesh.material) {
            const mat = mesh.material as any;
            const standardMat = new THREE.MeshStandardMaterial({
              color: mat.color || new THREE.Color('#ffffff'),
              map: mat.map || mat.diffuseMap || null,
              normalMap: mat.normalMap || null,
              normalScale: mat.normalScale || new THREE.Vector2(1, 1),
              roughness: 0.55,
              metalness: 0.1,
              emissive: mat.emissive || new THREE.Color('#000000'),
              emissiveMap: mat.emissiveMap || null,
              aoMap: mat.aoMap || null,
              transparent: mat.transparent || false,
              opacity: mat.opacity !== undefined ? mat.opacity : 1.0,
              side: THREE.DoubleSide
            });
            mesh.material = standardMat;
          }
        }
      });

      // Find tracking bones
      neckRef.current = clonedScene.getObjectByName('Neck') || clonedScene.getObjectByName('mixamorigNeck') || clonedScene.getObjectByName('Neck_00') || null;
      headRef.current = clonedScene.getObjectByName('Head') || clonedScene.getObjectByName('mixamorigHead') || clonedScene.getObjectByName('Head_01') || null;
      jawRef.current = clonedScene.getObjectByName('Jaw1_02') || null;
      paupGRef.current = clonedScene.getObjectByName('PaupG_06') || null;
      paupDRef.current = clonedScene.getObjectByName('PaupD_07') || null;
      eyeDRef.current = clonedScene.getObjectByName('EyeD_04') || null;
      eyeGRef.current = clonedScene.getObjectByName('EyeG_05') || null;

      // Capture default rotations
      if (neckRef.current) defaultNeckRotation.current = neckRef.current.rotation.clone();
      if (headRef.current) defaultHeadRotation.current = headRef.current.rotation.clone();
      if (jawRef.current) defaultJawRotation.current = jawRef.current.rotation.clone();
      if (paupGRef.current) defaultPaupGRotation.current = paupGRef.current.rotation.clone();
      if (paupDRef.current) defaultPaupDRotation.current = paupDRef.current.rotation.clone();
      if (eyeDRef.current) defaultEyeDRotation.current = eyeDRef.current.rotation.clone();
      if (eyeGRef.current) defaultEyeGRotation.current = eyeGRef.current.rotation.clone();

      // Diagnostics & Dynamic Scaling/Positioning
      if (!hasCalculated.current) {
        hasCalculated.current = true;

        const box = new THREE.Box3().setFromObject(clonedScene);
        const sizeVec = new THREE.Vector3();
        const centerVec = new THREE.Vector3();
        box.getSize(sizeVec);
        box.getCenter(centerVec);

        // Perform auto-scaling math
        if (isCaricature) {
          // Read current scale factor (usually initialized to 4)
          const currentScale = clonedScene.scale.y || 4;
          const rawHeight = sizeVec.y / currentScale;
          const rawCenterY = centerVec.y / currentScale;
          const rawCenterZ = centerVec.z / currentScale;

          // Target height of ~0.65 units so the head takes up a good portion of viewport
          const targetHeight = 0.65;
          const finalScale = targetHeight / rawHeight;

          // Target world position of head center should be [0, 0.28, 0]
          const targetCenterY = 0.28;
          const targetCenterZ = 0;

          const finalPosY = targetCenterY - (rawCenterY * finalScale);
          const finalPosZ = targetCenterZ - (rawCenterZ * finalScale);

          console.log(`[RPM Caricature Bounding Box] rawHeight=${rawHeight.toFixed(6)}, rawCenter=[0, ${rawCenterY.toFixed(6)}, ${rawCenterZ.toFixed(6)}]`);
          console.log(`[RPM Caricature Scaling] Setting scale to ${finalScale.toFixed(4)}, position to [0, ${finalPosY.toFixed(4)}, ${finalPosZ.toFixed(4)}]`);

          setModelScale(finalScale);
          setModelPos([0, finalPosY, finalPosZ]);
        } else {
          setModelScale(1);
          setModelPos([0, -1.32, 0]);
        }

        let meshDetails = '';
        clonedScene.traverse((obj) => {
          if ((obj as any).isMesh) {
            const mesh = obj as THREE.Mesh;
            const matType = mesh.material ? (Array.isArray(mesh.material) ? mesh.material.map(m => m.type).join(',') : mesh.material.type) : 'none';
            meshDetails += `\n- Mesh "${mesh.name}": visible=${mesh.visible}, mat=${matType}`;
          }
        });

        const debugMsg = `URL: ${url}
Size: [${sizeVec.x.toFixed(4)}, ${sizeVec.y.toFixed(4)}, ${sizeVec.z.toFixed(4)}]
Center: [${centerVec.x.toFixed(4)}, ${centerVec.y.toFixed(4)}, ${centerVec.z.toFixed(4)}]
Meshes: ${meshDetails}
Bones: Neck=${!!neckRef.current}, Head=${!!headRef.current}, Jaw=${!!jawRef.current}, Eyelids=[${!!paupGRef.current}, ${!!paupDRef.current}]`;

        console.log("[RPM] Bounding Box Details:", debugMsg);
        if (onDebugInfo) {
          onDebugInfo(debugMsg);
        }
      }
    }
  }, [clonedScene, onLoaded, isCaricature, url, onDebugInfo]);

  // Handle animation crossfades based on state
  useEffect(() => {
    if (isCaricature) {
      const action = actions['Take 001'];
      if (action) {
        action.reset().fadeIn(0.25).play();
      }
      return () => {
        if (action) action.fadeOut(0.25);
      };
    }

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
  }, [state, actions, isCaricature]);

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
    if (!clonedScene) return;

    const neck = neckRef.current;
    const head = headRef.current;

    // 1. Head Gaze tracking from pointer coordinates
    const mouseX = threeState.pointer?.x ?? threeState.mouse?.x ?? 0;
    const mouseY = threeState.pointer?.y ?? threeState.mouse?.y ?? 0;

    const targetRotY = mouseX * 0.30 * mouseTrackingIntensity;
    const targetRotX = -mouseY * 0.18 * mouseTrackingIntensity;

    if (isCaricature) {
      const targetNeckY = state === 'thinking' ? -0.18 : targetRotY;
      const targetNeckX = state === 'thinking' ? 0.12 : targetRotX;
      const targetHeadY = state === 'thinking' ? -0.05 : targetRotY * 0.2;
      const targetHeadX = state === 'thinking' ? 0.05 : targetRotX * 0.2;

      if (neck && defaultNeckRotation.current) {
        neck.rotation.y = THREE.MathUtils.lerp(neck.rotation.y, defaultNeckRotation.current.y + targetNeckY, 0.1);
        neck.rotation.x = THREE.MathUtils.lerp(neck.rotation.x, defaultNeckRotation.current.x + targetNeckX, 0.1);
      }
      if (head && defaultHeadRotation.current) {
        head.rotation.y = THREE.MathUtils.lerp(head.rotation.y, defaultHeadRotation.current.y + targetHeadY, 0.1);
        head.rotation.x = THREE.MathUtils.lerp(head.rotation.x, defaultHeadRotation.current.x + targetHeadX, 0.1);
      }
      
      // Eye Gaze Tracking
      const eyeD = eyeDRef.current;
      const eyeG = eyeGRef.current;
      if (eyeD && defaultEyeDRotation.current) {
        eyeD.rotation.y = THREE.MathUtils.lerp(eyeD.rotation.y, defaultEyeDRotation.current.y + targetRotY * 0.4, 0.1);
        eyeD.rotation.x = THREE.MathUtils.lerp(eyeD.rotation.x, defaultEyeDRotation.current.x + targetRotX * 0.4, 0.1);
      }
      if (eyeG && defaultEyeGRotation.current) {
        eyeG.rotation.y = THREE.MathUtils.lerp(eyeG.rotation.y, defaultEyeGRotation.current.y + targetRotY * 0.4, 0.1);
        eyeG.rotation.x = THREE.MathUtils.lerp(eyeG.rotation.x, defaultEyeGRotation.current.x + targetRotX * 0.4, 0.1);
      }
    } else {
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

    // Apply blink animation
    if (isCaricature) {
      const paupG = paupGRef.current;
      const paupD = paupDRef.current;
      if (paupG && defaultPaupGRotation.current) {
        paupG.rotation.z = defaultPaupGRotation.current.z + blinkVal.current * 0.22;
      }
      if (paupD && defaultPaupDRotation.current) {
        paupD.rotation.z = defaultPaupDRotation.current.z - blinkVal.current * 0.22;
      }
    } else {
      setMorphTarget(clonedScene, 'eyeBlinkLeft', blinkVal.current);
      setMorphTarget(clonedScene, 'eyeBlinkRight', blinkVal.current);
    }

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
    if (!isCaricature) {
      setMorphTarget(clonedScene, 'mouthSmileLeft', currentSmile.current);
      setMorphTarget(clonedScene, 'mouthSmileRight', currentSmile.current);
      setMorphTarget(clonedScene, 'mouthFrownLeft', currentFrown.current);
      setMorphTarget(clonedScene, 'mouthFrownRight', currentFrown.current);
    }

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
    } else {
      currentAa.current = THREE.MathUtils.lerp(currentAa.current, 0, 0.2);
      currentEe.current = THREE.MathUtils.lerp(currentEe.current, 0, 0.2);
      currentOo.current = THREE.MathUtils.lerp(currentOo.current, 0, 0.2);
    }

    if (isCaricature) {
      const jaw = jawRef.current;
      if (jaw && defaultJawRotation.current) {
        const mouthOpenVal = currentAa.current * 1.0 + currentOo.current * 0.7;
        jaw.rotation.z = defaultJawRotation.current.z + mouthOpenVal * 0.22;
      }
    } else {
      setMorphTarget(clonedScene, 'jawOpen', currentAa.current);
      setMorphTarget(clonedScene, 'mouthSmileLeft', state === 'speaking' ? Math.max(currentSmile.current, currentEe.current) : currentSmile.current);
      setMorphTarget(clonedScene, 'mouthSmileRight', state === 'speaking' ? Math.max(currentSmile.current, currentEe.current) : currentSmile.current);
      setMorphTarget(clonedScene, 'mouthPucker', currentOo.current);
      setMorphTarget(clonedScene, 'mouthFunnel', currentOo.current);
    }
  });

  return (
    <primitive 
      object={clonedScene} 
      position={modelPos} 
      scale={modelScale}
    />
  );
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
  onDebugInfo,
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
      className={`relative flex items-center justify-center rounded-3xl overflow-hidden border border-zinc-800/40 bg-zinc-950/40 ${className}`}
      style={{ width: size, height: size, ...style }}
    >
      {/* 3D R3F Canvas */}
      <Canvas
        camera={{ position: [0, 0.3, 1.14], fov: 41 }}
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

        <RpmErrorBoundary onError={(err) => setLoadError(err)} onDebugInfo={onDebugInfo}>
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
                onLoaded={setLoaded}
                onDebugInfo={onDebugInfo}
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
          target={[0, 0.28, 0]}
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
