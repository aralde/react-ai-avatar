import React, { useState, useEffect } from 'react';
import { 
  Mic,
  MicOff,
  AlertCircle,
  Shapes,
  Sparkles,
  Grid3x3,
  Brush,
  Smile,
  Dices,
  Captions,
  CaptionsOff,
  Cpu,
  Terminal,
  Clock,
  Code,
  Copy,
  Check,
  X,
  Maximize
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useGeminiLive } from './demo/useGeminiLive';
import { RealtimeAvatar } from './components/RealtimeAvatar';
import { AudioVisualizer } from './components/AudioVisualizer';
import { AvatarCustomization } from './components/DefaultAvatar';
import { DICEBEAR_STYLES, DiceBearCollection } from './lib/dicebear';

export default function App() {
  const { connect, disconnect, isConnected, state, error, analyser, subtitle, thought } = useGeminiLive();
  const [avatarSize, setAvatarSize] = useState<number>(300);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setAvatarSize(420); // larger size on desktop
      } else if (window.innerWidth >= 768) {
        setAvatarSize(360); // medium size on tablet
      } else {
        setAvatarSize(300); // smaller size on mobile to prevent overflow
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [variant, setVariant] = useState<'geometric' | 'memoji' | 'pixelart' | 'doodle' | 'default' | 'custom' | 'vrm' | 'glb' | 'dicebear'>('geometric');
  const [dicebearCollection, setDicebearCollection] = useState<DiceBearCollection>('pixel-art');
  const [dicebearSeed, setDicebearSeed] = useState<string>('realtime-avatar');
  const [vrmModelSource, setVrmModelSource] = useState<'default' | 'url' | 'file'>('default');
  const [vrmUrl, setVrmUrl] = useState<string>('/models/default-avatar.vrm');
  const [vrmFileUrl, setVrmFileUrl] = useState<string | null>(null);
  const [glbUrl, setGlbUrl] = useState<string>('/models/rocketbox.glb');
  const [catalogSelection, setCatalogSelection] = useState<'alicia' | 'cyberpunk' | 'orion' | 'voxels'>('alicia');
  const catalogUrls = {
    alicia: '/models/default-avatar.vrm',
    cyberpunk: '/models/avatar-b.vrm',
    orion: '/models/mannequin.vrm',
    voxels: '/models/voxels.vrm'
  };

  const activeVrmUrl = vrmModelSource === 'file'
    ? (vrmFileUrl || '')
    : (vrmModelSource === 'url'
      ? vrmUrl
      : catalogUrls[catalogSelection]);

  // Release the uploaded model's blob URL when it changes or on unmount
  useEffect(() => {
    return () => {
      if (vrmFileUrl) URL.revokeObjectURL(vrmFileUrl);
    };
  }, [vrmFileUrl]);

  const [showSubtitle, setShowSubtitle] = useState<boolean>(true);
  const [duration, setDuration] = useState<number>(0);

  // Configurable animation parameters
  const [maxMouthOpening, setMaxMouthOpening] = useState<number>(30);
  const [mouseTrackingIntensity, setMouseTrackingIntensity] = useState<number>(1.0);
  const [blinkIntervalMin, setBlinkIntervalMin] = useState<number>(2000);
  const [blinkIntervalMax, setBlinkIntervalMax] = useState<number>(6000);
  const [blinkDuration, setBlinkDuration] = useState<number>(100);

  // Active configuration control tab
  const [controlTab, setControlTab] = useState<'variant' | 'calibrate' | 'theme' | 'builder'>('variant');

  const [customization, setCustomization] = useState<AvatarCustomization>({
    skinColor: '#f5c7a9',
    hairColor: '#2c2c2c',
    clothingColor: '#3b7b9b',
    hoodieColor: '#3a3e45',
    bgColor: '#88c0b7',
    glasses: true,
    glassesColor: '#2c2c2c',
    headphones: true,
    headphonesColor: '#3a3b40'
  });

  // Configurable state colors and labels
  const [stateColors, setStateColors] = useState({
    idle: '#4b5563',
    listening: '#3b82f6',
    thinking: '#8b5cf6',
    speaking: '#10b981'
  });

  const [stateLabels, setStateLabels] = useState({
    idle: 'Idle',
    listening: 'Listening',
    thinking: 'Thinking...',
    speaking: 'Speaking'
  });

  // Code exporter modal state
  const [isCodeModalOpen, setIsCodeModalOpen] = useState<boolean>(false);
  const [copiedText, setCopiedText] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'code' | 'instructions'>('code');

  // Fullscreen avatar state
  const [isFullscreenOpen, setIsFullscreenOpen] = useState<boolean>(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFullscreenOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const generateJSXCode = () => {
    if (variant === 'vrm') {
      const displayUrl = vrmModelSource === 'url' ? vrmUrl : (vrmModelSource === 'file' ? '/* ObjectURL from local file */' : catalogUrls[catalogSelection]);
      return `import { RealtimeAvatar } from 'react-realtime-avatar';
import 'react-realtime-avatar/style.css';

// Note: 3D VRM rendering requires installing Three.js, React Three Fiber & Pixiv VRM:
// npm install three @react-three/fiber @react-three/drei @pixiv/three-vrm

function MyAvatarComponent() {
  // Pass active connection state ('idle' | 'listening' | 'thinking' | 'speaking')
  // and a WebAudio AnalyserNode for the audio-reactive mouth (optional:
  // without it, "speaking" falls back to a synthetic mouth pattern)
  
  return (
    <RealtimeAvatar 
      state="idle"
      analyser={null}
      size={300}
      variant="vrm"
      vrmUrl="${displayUrl}"
      maxMouthOpening={${maxMouthOpening}}
      mouseTrackingIntensity={${mouseTrackingIntensity}}
      blinkIntervalMin={${blinkIntervalMin}}
      blinkIntervalMax={${blinkIntervalMax}}
      blinkDuration={${blinkDuration}}
      stateColors={{
        idle: '${stateColors.idle}',
        listening: '${stateColors.listening}',
        thinking: '${stateColors.thinking}',
        speaking: '${stateColors.speaking}'
      }}
      stateLabels={{
        idle: '${stateLabels.idle}',
        listening: '${stateLabels.listening}',
        thinking: '${stateLabels.thinking}',
        speaking: '${stateLabels.speaking}'
      }}
    />
  );
}`;
    }

    if (variant === 'glb') {
      return `import { RealtimeAvatar } from 'react-realtime-avatar';
import 'react-realtime-avatar/style.css';

// Note: 3D GLB rendering requires installing the Three.js stack:
// npm install three @react-three/fiber @react-three/drei
// The .glb must expose ARKit blendshapes (jawOpen, eyeBlinkLeft, ...).

function MyAvatarComponent() {
  // Pass active connection state ('idle' | 'listening' | 'thinking' | 'speaking')
  // and a WebAudio AnalyserNode for the audio-reactive mouth (optional:
  // without it, "speaking" falls back to a synthetic mouth pattern)

  return (
    <RealtimeAvatar
      state="idle"
      analyser={null}
      size={300}
      variant="glb"
      glbUrl="${glbUrl}"
      maxMouthOpening={${maxMouthOpening}}
      mouseTrackingIntensity={${mouseTrackingIntensity}}
      blinkIntervalMin={${blinkIntervalMin}}
      blinkIntervalMax={${blinkIntervalMax}}
      blinkDuration={${blinkDuration}}
      stateColors={{
        idle: '${stateColors.idle}',
        listening: '${stateColors.listening}',
        thinking: '${stateColors.thinking}',
        speaking: '${stateColors.speaking}'
      }}
      stateLabels={{
        idle: '${stateLabels.idle}',
        listening: '${stateLabels.listening}',
        thinking: '${stateLabels.thinking}',
        speaking: '${stateLabels.speaking}'
      }}
    />
  );
}`;
    }

    if (variant === 'dicebear') {
      return `import { RealtimeAvatar } from 'react-realtime-avatar';
import 'react-realtime-avatar/style.css';

// DiceBear avatars are generated client-side. Install the optional peers:
// npm install @dicebear/core @dicebear/collection
// The curated catalog is CC0 1.0 — no attribution required.

function MyAvatarComponent() {
  // Pass active connection state ('idle' | 'listening' | 'thinking' | 'speaking')
  // and a WebAudio AnalyserNode for the audio-reactive bounce (optional:
  // without it, "speaking" falls back to a synthetic amplitude pattern)

  return (
    <RealtimeAvatar
      state="idle"
      analyser={null}
      size={300}
      variant="dicebear"
      dicebearCollection="${dicebearCollection}"
      dicebearSeed="${dicebearSeed}"
      maxMouthOpening={${maxMouthOpening}}
      stateColors={{
        idle: '${stateColors.idle}',
        listening: '${stateColors.listening}',
        thinking: '${stateColors.thinking}',
        speaking: '${stateColors.speaking}'
      }}
      stateLabels={{
        idle: '${stateLabels.idle}',
        listening: '${stateLabels.listening}',
        thinking: '${stateLabels.thinking}',
        speaking: '${stateLabels.speaking}'
      }}
    />
  );
}`;
    }

    return `import { RealtimeAvatar } from 'react-realtime-avatar';
import 'react-realtime-avatar/style.css';

function MyAvatarComponent() {
  // Pass active connection state ('idle' | 'listening' | 'thinking' | 'speaking')
  // and a WebAudio AnalyserNode for the audio-reactive mouth (optional:
  // without it, "speaking" falls back to a synthetic mouth pattern)
  
  return (
    <RealtimeAvatar 
      state="idle"
      analyser={null}
      size={300}
      variant="${variant}"
      maxMouthOpening={${maxMouthOpening}}
      mouseTrackingIntensity={${mouseTrackingIntensity}}
      blinkIntervalMin={${blinkIntervalMin}}
      blinkIntervalMax={${blinkIntervalMax}}
      blinkDuration={${blinkDuration}}
      stateColors={{
        idle: '${stateColors.idle}',
        listening: '${stateColors.listening}',
        thinking: '${stateColors.thinking}',
        speaking: '${stateColors.speaking}'
      }}
      stateLabels={{
        idle: '${stateLabels.idle}',
        listening: '${stateLabels.listening}',
        thinking: '${stateLabels.thinking}',
        speaking: '${stateLabels.speaking}'
      }}
      customization={{
        skinColor: '${customization.skinColor}',
        hairColor: '${customization.hairColor}',
        clothingColor: '${customization.clothingColor}',
        hoodieColor: '${customization.hoodieColor}',
        bgColor: '${customization.bgColor}',
        glasses: ${customization.glasses},
        glassesColor: '${customization.glassesColor}',
        headphones: ${customization.headphones},
        headphonesColor: '${customization.headphonesColor}'
      }}
    />
  );
}`;
  };

  const installCommand =
    variant === 'vrm'
      ? `npm install react-realtime-avatar motion three @react-three/fiber @react-three/drei @pixiv/three-vrm`
      : variant === 'glb'
      ? `npm install react-realtime-avatar motion three @react-three/fiber @react-three/drei`
      : variant === 'dicebear'
        ? `npm install react-realtime-avatar motion @dicebear/core @dicebear/collection`
        : `npm install react-realtime-avatar motion`;

  const copyToClipboard = () => {
    const text = activeTab === 'code' ? generateJSXCode() : installCommand;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    });
  };

  // Active session timer
  useEffect(() => {
    let interval: any;
    if (isConnected) {
      setDuration(0);
      interval = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } else {
      setDuration(0);
    }
    return () => clearInterval(interval);
  }, [isConnected]);

  const formatDuration = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Human readable description for states
  const telemetryStates = {
    idle: 'Console Standby. Ready to initiate neural link.',
    listening: 'Neural connection open. Listening to audio input...',
    thinking: 'Synthesizing response. Analyzing neural vectors...',
    speaking: 'Broadcasting voice output. Driving the audio-reactive mouth.'
  };

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden bg-zinc-950 text-zinc-100 flex items-center justify-center p-4 lg:p-6 font-sans overflow-x-hidden relative selection:bg-emerald-500/30 selection:text-emerald-400">
      
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-purple-900/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-emerald-900/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293708_1px,transparent_1px),linear-gradient(to_bottom,#1f293708_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

      <div className="w-full max-w-7xl h-full flex flex-col z-10 gap-4">
        
        {/* Sleek Horizontal Header */}
        <header className="flex flex-col sm:flex-row justify-between items-center bg-zinc-900/40 border border-zinc-800/40 rounded-2xl px-6 py-4 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
              <Cpu className="w-5 h-5 text-zinc-950 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                NEURAL AVATAR <span className="text-[10px] bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border border-emerald-500/20">v1.2</span>
              </h1>
              <p className="text-[10px] text-zinc-400 font-medium font-mono uppercase tracking-wider">Gemini Live Control Panel</p>
            </div>
          </div>
          <p className="hidden md:block text-xs text-zinc-400 max-w-md text-right leading-normal font-sans">
            Audio-reactive avatars for realtime LLM voice UIs. The runtime turns raw audio amplitude and state changes into a face that listens, thinks and speaks.
          </p>
        </header>

        {/* Workspace Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 lg:overflow-hidden min-h-0 pb-2">
          
          {/* LEFT COLUMN: Controls & Settings (lg:col-span-5) */}
          <div className="lg:col-span-5 flex flex-col gap-4 lg:h-full lg:overflow-y-hidden pr-1">
            
            {/* Config & Control Center (Tabbed) */}
            <div className="bg-zinc-900/40 border border-zinc-800/40 rounded-2xl backdrop-blur-md flex flex-col overflow-hidden flex-1 min-h-[350px] lg:min-h-0">
              {/* Tab Switcher */}
              <div className="flex border-b border-zinc-800/40 bg-zinc-950/20 shrink-0">
                <button 
                  onClick={() => setControlTab('variant')}
                  className={`flex-1 py-3 text-[10px] font-mono font-bold tracking-wider transition-all border-b-2 cursor-pointer ${
                    controlTab === 'variant' ? 'border-emerald-500 text-emerald-400 bg-zinc-900/10' : 'border-transparent text-zinc-500 hover:text-zinc-400'
                  }`}
                >
                  VARIANT
                </button>
                <button 
                  onClick={() => setControlTab('calibrate')}
                  className={`flex-1 py-3 text-[10px] font-mono font-bold tracking-wider transition-all border-b-2 cursor-pointer ${
                    controlTab === 'calibrate' ? 'border-emerald-500 text-emerald-400 bg-zinc-900/10' : 'border-transparent text-zinc-500 hover:text-zinc-400'
                  }`}
                >
                  CALIBRATE
                </button>
                <button 
                  onClick={() => setControlTab('theme')}
                  className={`flex-1 py-3 text-[10px] font-mono font-bold tracking-wider transition-all border-b-2 cursor-pointer ${
                    controlTab === 'theme' ? 'border-emerald-500 text-emerald-400 bg-zinc-900/10' : 'border-transparent text-zinc-500 hover:text-zinc-400'
                  }`}
                >
                  THEME
                </button>
                <button 
                  onClick={() => setControlTab('builder')}
                  className={`flex-1 py-3 text-[10px] font-mono font-bold tracking-wider transition-all border-b-2 cursor-pointer ${
                    controlTab === 'builder' ? 'border-emerald-500 text-emerald-400 bg-zinc-900/10' : 'border-transparent text-zinc-500 hover:text-zinc-400'
                  }`}
                >
                  BUILDER
                </button>
              </div>

              {/* Tab Content Body */}
              <div className="p-4 flex-1 overflow-y-auto min-h-0 scrollbar-thin">
                {controlTab === 'variant' && (
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setVariant('geometric')}
                        className={`flex flex-col text-left p-3 rounded-xl border transition-all duration-355 group relative overflow-hidden cursor-pointer ${
                          variant === 'geometric'
                            ? 'bg-zinc-800/60 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.05)]'
                            : 'bg-zinc-950/40 border-zinc-800/60 hover:bg-zinc-900/40 hover:border-zinc-700/60'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <Shapes className={`w-4.5 h-4.5 ${variant === 'geometric' ? 'text-emerald-400' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
                          {variant === 'geometric' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                        </div>
                        <span className="text-xs font-bold text-white mb-0.5">Geometric</span>
                        <span className="text-[10px] text-zinc-500 group-hover:text-zinc-400 leading-snug">Default preset. Layer-contract SVG driven by the runtime.</span>
                      </button>

                      <button
                        onClick={() => setVariant('memoji')}
                        className={`flex flex-col text-left p-3 rounded-xl border transition-all duration-355 group relative overflow-hidden cursor-pointer ${
                          variant === 'memoji'
                            ? 'bg-zinc-800/60 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.05)]'
                            : 'bg-zinc-950/40 border-zinc-800/60 hover:bg-zinc-900/40 hover:border-zinc-700/60'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <Sparkles className={`w-4.5 h-4.5 ${variant === 'memoji' ? 'text-emerald-400' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
                          {variant === 'memoji' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                        </div>
                        <span className="text-xs font-bold text-white mb-0.5">Memoji</span>
                        <span className="text-[10px] text-zinc-500 group-hover:text-zinc-400 leading-snug">Soft volumetric head with glossy eyes and blush.</span>
                      </button>

                      <button
                        onClick={() => setVariant('pixelart')}
                        className={`flex flex-col text-left p-3 rounded-xl border transition-all duration-355 group relative overflow-hidden cursor-pointer ${
                          variant === 'pixelart'
                            ? 'bg-zinc-800/60 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.05)]'
                            : 'bg-zinc-950/40 border-zinc-800/60 hover:bg-zinc-900/40 hover:border-zinc-700/60'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <Grid3x3 className={`w-4.5 h-4.5 ${variant === 'pixelart' ? 'text-emerald-400' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
                          {variant === 'pixelart' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                        </div>
                        <span className="text-xs font-bold text-white mb-0.5">Pixel Art</span>
                        <span className="text-[10px] text-zinc-500 group-hover:text-zinc-400 leading-snug">Retro 32x32 grid. Mouth and pupils move in whole pixels.</span>
                      </button>

                      <button
                        onClick={() => setVariant('doodle')}
                        className={`flex flex-col text-left p-3 rounded-xl border transition-all duration-355 group relative overflow-hidden cursor-pointer ${
                          variant === 'doodle'
                            ? 'bg-zinc-800/60 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.05)]'
                            : 'bg-zinc-950/40 border-zinc-800/60 hover:bg-zinc-900/40 hover:border-zinc-700/60'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <Brush className={`w-4.5 h-4.5 ${variant === 'doodle' ? 'text-emerald-400' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
                          {variant === 'doodle' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                        </div>
                        <span className="text-xs font-bold text-white mb-0.5">Doodle</span>
                        <span className="text-[10px] text-zinc-500 group-hover:text-zinc-400 leading-snug">Hand-drawn ink sketch with wobbly strokes.</span>
                      </button>

                      <button
                        onClick={() => setVariant('default')}
                        className={`flex flex-col text-left p-3 rounded-xl border transition-all duration-355 group relative overflow-hidden cursor-pointer ${
                          variant === 'default'
                            ? 'bg-zinc-800/60 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.05)]'
                            : 'bg-zinc-950/40 border-zinc-800/60 hover:bg-zinc-900/40 hover:border-zinc-700/60'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <Smile className={`w-4.5 h-4.5 ${variant === 'default' ? 'text-emerald-400' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
                          {variant === 'default' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                        </div>
                        <span className="text-xs font-bold text-white mb-0.5">Default Smiley</span>
                        <span className="text-[10px] text-zinc-500 group-hover:text-zinc-400 leading-snug">Basic animated vector shape.</span>
                      </button>

                      <button
                        onClick={() => setVariant('custom')}
                        className={`flex flex-col text-left p-3 rounded-xl border transition-all duration-355 group relative overflow-hidden cursor-pointer ${
                          variant === 'custom'
                            ? 'bg-zinc-800/60 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.05)]'
                            : 'bg-zinc-950/40 border-zinc-800/60 hover:bg-zinc-900/40 hover:border-zinc-700/60'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <Terminal className={`w-4.5 h-4.5 ${variant === 'custom' ? 'text-emerald-400' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
                          {variant === 'custom' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                        </div>
                        <span className="text-xs font-bold text-white mb-0.5">Custom (CLI)</span>
                        <span className="text-[10px] text-zinc-500 group-hover:text-zinc-400 leading-snug">Your custom SVG, compiled via our AI Agent builder.</span>
                      </button>

                      {/* DiceBear Avatar Button */}
                      <button
                        onClick={() => setVariant('dicebear')}
                        className={`col-span-2 flex flex-col text-left p-3 rounded-xl border transition-all duration-355 group relative overflow-hidden cursor-pointer ${
                          variant === 'dicebear'
                            ? 'bg-zinc-800/60 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.05)]'
                            : 'bg-zinc-950/40 border-zinc-800/60 hover:bg-zinc-900/40 hover:border-zinc-700/60'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <Dices className={`w-4.5 h-4.5 ${variant === 'dicebear' ? 'text-emerald-400' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
                          {variant === 'dicebear' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                        </div>
                        <span className="text-xs font-bold text-white mb-0.5">DiceBear (CC0)</span>
                        <span className="text-[10px] text-zinc-500 group-hover:text-zinc-400 leading-snug">Deterministic DiceBear styles, generated client-side. Talks via mouth-variant swapping.</span>
                      </button>

                      {/* 3D VRM Avatar Button */}
                      <button
                        onClick={() => setVariant('vrm')}
                        className={`col-span-2 flex flex-col text-left p-3 rounded-xl border transition-all duration-355 group relative overflow-hidden cursor-pointer ${
                          variant === 'vrm'
                            ? 'bg-zinc-800/60 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.05)]'
                            : 'bg-zinc-950/40 border-zinc-800/60 hover:bg-zinc-900/40 hover:border-zinc-700/60'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">🗿</span>
                            <span className="text-xs font-bold text-white">3D VRM Avatar</span>
                          </div>
                          {variant === 'vrm' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                        </div>
                        <span className="text-[10px] text-zinc-500 group-hover:text-zinc-400 leading-snug">
                          Real-time 3D model with full visemes, skeletal physics, and look-at tracking.
                        </span>
                      </button>

                      {/* 3D GLB + ARKit Avatar Button */}
                      <button
                        onClick={() => setVariant('glb')}
                        className={`col-span-2 flex flex-col text-left p-3 rounded-xl border transition-all duration-355 group relative overflow-hidden cursor-pointer ${
                          variant === 'glb'
                            ? 'bg-zinc-800/60 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.05)]'
                            : 'bg-zinc-950/40 border-zinc-800/60 hover:bg-zinc-900/40 hover:border-zinc-700/60'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">🧑</span>
                            <span className="text-xs font-bold text-white">3D GLB · ARKit</span>
                          </div>
                          {variant === 'glb' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                        </div>
                        <span className="text-[10px] text-zinc-500 group-hover:text-zinc-400 leading-snug">
                          Any .glb with the 52 ARKit blendshapes (e.g. Microsoft Rocketbox, MIT). Realistic lip-sync.
                        </span>
                      </button>

                    </div>

                    {/* VRM Configuration Sub-Panel */}
                    {variant === 'vrm' && (
                      <div className="bg-zinc-950/45 border border-zinc-800/60 rounded-xl p-3 flex flex-col gap-3">
                        <span className="text-[9px] font-bold font-mono uppercase tracking-widest text-emerald-400">
                          VRM Model Configuration
                        </span>
                        
                        {/* Selector Segmented Control */}
                        <div className="grid grid-cols-3 gap-1 bg-zinc-900/50 p-0.5 rounded-lg border border-zinc-850">
                          {(['default', 'url', 'file'] as const).map((src) => (
                            <button
                              key={src}
                              type="button"
                              onClick={() => setVrmModelSource(src)}
                              className={`py-1 text-[9px] font-mono font-bold rounded-md uppercase transition-all cursor-pointer ${
                                vrmModelSource === src
                                  ? 'bg-emerald-500 text-zinc-950 shadow-sm'
                                  : 'text-zinc-400 hover:text-zinc-200'
                              }`}
                            >
                              {src}
                            </button>
                          ))}
                        </div>

                        {/* Source Configuration Input Field */}
                        {vrmModelSource === 'default' && (
                          <div className="flex flex-col gap-1.5 mt-1">
                            <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wide">Select Pre-loaded Model</span>
                            <div className="flex flex-col gap-1">
                              {(Object.keys(catalogUrls) as Array<keyof typeof catalogUrls>).map((key) => {
                                const names = {
                                  alicia: 'Alicia Solid (Fully Featured)',
                                  cyberpunk: 'Cyberpunk Girl (ChatVRM Default)',
                                  orion: 'Mannequin Orion (Wireframe Test)',
                                  voxels: 'Voxels Character (Retro/Lightweight)'
                                };
                                const descs = {
                                  alicia: 'Mascot with full expressions, blinking, textures',
                                  cyberpunk: 'Highly optimized for conversation, expressions, lipsync',
                                  orion: 'Skeleton rig, head tracking, no facial expressions',
                                  voxels: 'Blocky voxel model, custom retro aesthetics'
                                };
                                return (
                                  <button
                                    key={key}
                                    onClick={() => setCatalogSelection(key)}
                                    className={`flex flex-col items-start text-left px-2.5 py-1.5 rounded-lg border transition-all ${
                                      catalogSelection === key
                                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                        : 'bg-zinc-950/40 border-zinc-800/40 text-zinc-400 hover:border-zinc-700/60 hover:text-zinc-300'
                                    }`}
                                  >
                                    <span className="text-[10px] font-bold tracking-wide">{names[key]}</span>
                                    <span className="text-[9px] opacity-75 font-sans leading-normal mt-0.5">{descs[key]}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {vrmModelSource === 'url' && (
                          <div className="flex flex-col gap-1">
                            <label className="text-[9px] font-mono text-zinc-500 uppercase tracking-wide">CORS-Enabled .vrm URL</label>
                            <input
                              type="text"
                              value={vrmUrl}
                              onChange={(e) => setVrmUrl(e.target.value)}
                              placeholder="https://example.com/avatar.vrm"
                              className="w-full bg-zinc-950/60 border border-zinc-800/80 rounded-lg px-2 py-1.5 text-xs font-mono text-zinc-200 focus:outline-none focus:border-emerald-500/50"
                            />
                          </div>
                        )}

                        {vrmModelSource === 'file' && (
                          <div className="flex flex-col gap-1">
                            <label className="text-[9px] font-mono text-zinc-500 uppercase tracking-wide">Upload Custom .vrm File</label>
                            <div className="relative border border-dashed border-zinc-800 hover:border-emerald-500/35 transition-colors rounded-lg p-3 flex flex-col items-center justify-center bg-zinc-950/30 cursor-pointer group">
                              <input
                                type="file"
                                accept=".vrm"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    // Previous blob URL is revoked by the effect watching vrmFileUrl
                                    setVrmFileUrl(URL.createObjectURL(file));
                                  }
                                }}
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                              />
                              <span className="text-[10px] text-zinc-400 group-hover:text-zinc-200 font-bold mb-0.5">
                                {vrmFileUrl ? 'Change Loaded VRM' : 'Select VRM Model File'}
                              </span>
                              <span className="text-[9px] text-zinc-650 group-hover:text-zinc-550">
                                {vrmFileUrl ? 'Custom model ready client-side' : 'Supports Vroid standard exports'}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* GLB + ARKit Configuration Sub-Panel */}
                    {variant === 'glb' && (
                      <div className="bg-zinc-950/45 border border-zinc-800/60 rounded-xl p-3 flex flex-col gap-3">
                        <span className="text-[9px] font-bold font-mono uppercase tracking-widest text-emerald-400">
                          GLB Model Configuration
                        </span>
                        <div className="flex flex-col gap-1">
                          <label className="text-[9px] font-mono text-zinc-500 uppercase tracking-wide">CORS-Enabled .glb URL (ARKit blendshapes)</label>
                          <input
                            type="text"
                            value={glbUrl}
                            onChange={(e) => setGlbUrl(e.target.value)}
                            placeholder="/models/rocketbox.glb"
                            className="w-full bg-zinc-950/60 border border-zinc-800/80 rounded-lg px-2 py-1.5 text-xs font-mono text-zinc-200 focus:outline-none focus:border-emerald-500/50"
                          />
                          <span className="text-[9px] text-zinc-600 font-sans leading-normal">
                            Drop a converted Microsoft Rocketbox (MIT) avatar into <code>public/models/rocketbox.glb</code>, or point to any glTF with the 52 ARKit morph targets (jawOpen, eyeBlinkLeft, …).
                          </span>
                        </div>
                      </div>
                    )}

                    {/* DiceBear Configuration Sub-Panel */}
                    {variant === 'dicebear' && (
                      <div className="bg-zinc-950/45 border border-zinc-800/60 rounded-xl p-3 flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-bold font-mono uppercase tracking-widest text-emerald-400">
                            DiceBear Style
                          </span>
                          <span className="text-[8px] font-mono uppercase tracking-wider text-zinc-500 bg-zinc-900/60 px-1.5 py-0.5 rounded border border-zinc-800">
                            CC0 1.0 · no attribution
                          </span>
                        </div>

                        {/* Style picker */}
                        <div className="grid grid-cols-3 gap-1.5">
                          {DICEBEAR_STYLES.map((s) => (
                            <button
                              key={s.id}
                              onClick={() => setDicebearCollection(s.id)}
                              className={`px-2 py-1.5 rounded-lg border text-left transition-all cursor-pointer ${
                                dicebearCollection === s.id
                                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                  : 'bg-zinc-950/40 border-zinc-800/40 text-zinc-400 hover:border-zinc-700/60 hover:text-zinc-300'
                              }`}
                            >
                              <span className="text-[10px] font-bold tracking-wide block leading-tight">{s.label}</span>
                            </button>
                          ))}
                        </div>

                        {/* Seed input */}
                        <div className="flex flex-col gap-1">
                          <label className="text-[9px] font-mono text-zinc-500 uppercase tracking-wide">Seed (deterministic)</label>
                          <input
                            type="text"
                            value={dicebearSeed}
                            onChange={(e) => setDicebearSeed(e.target.value)}
                            placeholder="any-string"
                            className="w-full bg-zinc-950/60 border border-zinc-800/80 rounded-lg px-2 py-1.5 text-xs font-mono text-zinc-200 focus:outline-none focus:border-emerald-500/50"
                          />
                          <span className="text-[9px] text-zinc-600 font-sans leading-normal">Same seed + style always renders the same avatar. Styles with a face swap mouth/eye variants while speaking (real articulation); abstract styles bounce.</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {controlTab === 'calibrate' && (
                  <div className="flex flex-col gap-4">
                    {/* Mouth Opening Sensitivity */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-zinc-400 font-medium text-[11px]">Mouth Opening Limit (maxMouthOpening)</span>
                        <span className="text-emerald-400 font-mono font-bold text-[10px] bg-zinc-950/60 px-1.5 py-0.5 rounded border border-zinc-800/80">{maxMouthOpening}px</span>
                      </div>
                      <input 
                        type="range" 
                        min="10" 
                        max="60" 
                        value={maxMouthOpening} 
                        onChange={(e) => setMaxMouthOpening(parseInt(e.target.value))}
                        className="w-full h-1 bg-zinc-950 rounded-lg appearance-none cursor-pointer accent-emerald-500 border border-zinc-800/50"
                      />
                    </div>

                    {/* Mouse Tracking Intensity */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-zinc-400 font-medium text-[11px]">Mouse Gaze Intensity</span>
                        <span className="text-emerald-400 font-mono font-bold text-[10px] bg-zinc-950/60 px-1.5 py-0.5 rounded border border-zinc-800/80">{(mouseTrackingIntensity * 100).toFixed(0)}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max="2" 
                        step="0.1"
                        value={mouseTrackingIntensity} 
                        onChange={(e) => setMouseTrackingIntensity(parseFloat(e.target.value))}
                        className="w-full h-1 bg-zinc-950 rounded-lg appearance-none cursor-pointer accent-emerald-500 border border-zinc-800/50"
                      />
                    </div>

                    {/* Eye Blinking Calibration */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">Min Blink Delay</label>
                        <div className="flex items-center gap-1.5">
                          <input 
                            type="range" 
                            min="200" 
                            max="4000" 
                            step="100"
                            value={blinkIntervalMin} 
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              setBlinkIntervalMin(val);
                              if (val > blinkIntervalMax) setBlinkIntervalMax(val + 500);
                            }}
                            className="flex-1 h-1 bg-zinc-950 rounded-lg appearance-none cursor-pointer accent-emerald-500 border border-zinc-800/50"
                          />
                          <span className="text-[10px] font-mono text-zinc-400 min-w-[32px] text-right">{(blinkIntervalMin / 1000).toFixed(1)}s</span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">Max Blink Delay</label>
                        <div className="flex items-center gap-1.5">
                          <input 
                            type="range" 
                            min="2000" 
                            max="12000" 
                            step="200"
                            value={blinkIntervalMax} 
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              setBlinkIntervalMax(val);
                              if (val < blinkIntervalMin) setBlinkIntervalMin(Math.max(200, val - 500));
                            }}
                            className="flex-1 h-1 bg-zinc-950 rounded-lg appearance-none cursor-pointer accent-emerald-500 border border-zinc-800/50"
                          />
                          <span className="text-[10px] font-mono text-zinc-400 min-w-[32px] text-right">{(blinkIntervalMax / 1000).toFixed(1)}s</span>
                        </div>
                      </div>
                    </div>

                    {/* Blink Duration */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-zinc-400 font-medium text-[11px]">Blink Motion Duration</span>
                        <span className="text-emerald-400 font-mono font-bold text-[10px] bg-zinc-950/60 px-1.5 py-0.5 rounded border border-zinc-800/80">{blinkDuration}ms</span>
                      </div>
                      <input 
                        type="range" 
                        min="50" 
                        max="300" 
                        step="10"
                        value={blinkDuration} 
                        onChange={(e) => setBlinkDuration(parseInt(e.target.value))}
                        className="w-full h-1 bg-zinc-950 rounded-lg appearance-none cursor-pointer accent-emerald-500 border border-zinc-800/50"
                      />
                    </div>
                  </div>
                )}

                {controlTab === 'theme' && (
                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-bold font-mono uppercase tracking-widest text-emerald-400">Palette Tuning</span>
                      <button 
                        onClick={() => {
                          setStateColors({
                            idle: '#4b5563',
                            listening: '#3b82f6',
                            thinking: '#8b5cf6',
                            speaking: '#10b981'
                          });
                          setStateLabels({
                            idle: 'Idle',
                            listening: 'Listening',
                            thinking: 'Thinking...',
                            speaking: 'Speaking'
                          });
                        }}
                        className="text-[9px] bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-white px-2 py-0.5 rounded font-mono transition-colors border border-zinc-800/60 cursor-pointer"
                      >
                        RESET
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                      {(Object.keys(stateColors) as Array<keyof typeof stateColors>).map((key) => (
                        <div key={key} className="flex flex-col gap-1">
                          <label className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">{key} State</label>
                          <div className="flex gap-2">
                            <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-zinc-800 shrink-0 bg-zinc-950 flex items-center justify-center">
                              <input 
                                type="color" 
                                value={stateColors[key]} 
                                onChange={(e) => setStateColors(prev => ({ ...prev, [key]: e.target.value }))}
                                className="absolute inset-0 w-full h-full p-0 border-0 cursor-pointer opacity-0"
                              />
                              <div 
                                className="w-4 h-4 rounded-full border border-white/20 shadow-inner"
                                style={{ backgroundColor: stateColors[key] }}
                              />
                            </div>
                            <input 
                              type="text" 
                              value={stateLabels[key]} 
                              onChange={(e) => setStateLabels(prev => ({ ...prev, [key]: e.target.value }))}
                              className="w-full bg-zinc-950/60 border border-zinc-800/80 rounded-lg px-2 text-xs font-mono text-zinc-200 focus:outline-none focus:border-emerald-500/50"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {controlTab === 'builder' && (
                  <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-bold font-mono uppercase tracking-widest text-emerald-400">Cosmetics Editor</span>
                      <button 
                        onClick={() => {
                          setCustomization({
                            skinColor: '#f5c7a9',
                            hairColor: '#2c2c2c',
                            clothingColor: '#3b7b9b',
                            hoodieColor: '#3a3e45',
                            bgColor: '#88c0b7',
                            glasses: true,
                            glassesColor: '#2c2c2c',
                            headphones: true,
                            headphonesColor: '#3a3b40'
                          });
                        }}
                        className="text-[9px] bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-white px-2 py-0.5 rounded font-mono transition-colors border border-zinc-800/60 cursor-pointer"
                      >
                        RESET
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                      {/* Skin Color */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">Skin tone</label>
                        <div className="flex gap-2 items-center">
                          <input 
                            type="color" 
                            value={customization.skinColor} 
                            onChange={(e) => setCustomization(prev => ({ ...prev, skinColor: e.target.value }))}
                            className="w-8 h-8 rounded-lg overflow-hidden border border-zinc-800 cursor-pointer bg-zinc-950 p-1"
                          />
                          <span className="text-xs font-mono text-zinc-300 uppercase">{customization.skinColor}</span>
                        </div>
                      </div>

                      {/* Hair Color */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">Hair color</label>
                        <div className="flex gap-2 items-center">
                          <input 
                            type="color" 
                            value={customization.hairColor} 
                            onChange={(e) => setCustomization(prev => ({ ...prev, hairColor: e.target.value }))}
                            className="w-8 h-8 rounded-lg overflow-hidden border border-zinc-800 cursor-pointer bg-zinc-950 p-1"
                          />
                          <span className="text-xs font-mono text-zinc-300 uppercase">{customization.hairColor}</span>
                        </div>
                      </div>

                      {/* Shirt Color */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">Shirt color</label>
                        <div className="flex gap-2 items-center">
                          <input 
                            type="color" 
                            value={customization.clothingColor} 
                            onChange={(e) => setCustomization(prev => ({ ...prev, clothingColor: e.target.value }))}
                            className="w-8 h-8 rounded-lg overflow-hidden border border-zinc-800 cursor-pointer bg-zinc-950 p-1"
                          />
                          <span className="text-xs font-mono text-zinc-300 uppercase">{customization.clothingColor}</span>
                        </div>
                      </div>

                      {/* Hoodie Color */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">Hoodie color</label>
                        <div className="flex gap-2 items-center">
                          <input 
                            type="color" 
                            value={customization.hoodieColor} 
                            onChange={(e) => setCustomization(prev => ({ ...prev, hoodieColor: e.target.value }))}
                            className="w-8 h-8 rounded-lg overflow-hidden border border-zinc-800 cursor-pointer bg-zinc-950 p-1"
                          />
                          <span className="text-xs font-mono text-zinc-300 uppercase">{customization.hoodieColor}</span>
                        </div>
                      </div>

                      {/* Bg Color */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">Stage BG color</label>
                        <div className="flex gap-2 items-center">
                          <input 
                            type="color" 
                            value={customization.bgColor} 
                            onChange={(e) => setCustomization(prev => ({ ...prev, bgColor: e.target.value }))}
                            className="w-8 h-8 rounded-lg overflow-hidden border border-zinc-800 cursor-pointer bg-zinc-950 p-1"
                          />
                          <span className="text-xs font-mono text-zinc-300 uppercase">{customization.bgColor}</span>
                        </div>
                      </div>
                    </div>

                    {/* Accessories Checkboxes */}
                    <div className="border-t border-zinc-800/40 mt-2 pt-3 flex flex-col gap-3">
                      <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">Accessories</span>

                      {/* Glasses Toggle */}
                      <div className="flex items-center justify-between bg-zinc-950/45 border border-zinc-800 p-2.5 rounded-xl">
                        <div className="flex items-center gap-2">
                          <input 
                            type="checkbox" 
                            id="glasses-toggle"
                            checked={customization.glasses}
                            onChange={(e) => setCustomization(prev => ({ ...prev, glasses: e.target.checked }))}
                            className="rounded bg-zinc-900 border-zinc-800 text-emerald-500 focus:ring-emerald-500"
                          />
                          <label htmlFor="glasses-toggle" className="text-xs font-bold text-zinc-200 cursor-pointer">Glasses</label>
                        </div>
                        {customization.glasses && (
                          <div className="flex items-center gap-1.5">
                            <input 
                              type="color" 
                              value={customization.glassesColor} 
                              onChange={(e) => setCustomization(prev => ({ ...prev, glassesColor: e.target.value }))}
                              className="w-6 h-6 rounded border border-zinc-800 cursor-pointer bg-zinc-900 p-0.5"
                            />
                            <span className="text-[10px] font-mono text-zinc-400 uppercase">{customization.glassesColor}</span>
                          </div>
                        )}
                      </div>

                      {/* Headphones Toggle */}
                      <div className="flex items-center justify-between bg-zinc-950/45 border border-zinc-800 p-2.5 rounded-xl">
                        <div className="flex items-center gap-2">
                          <input 
                            type="checkbox" 
                            id="headphones-toggle"
                            checked={customization.headphones}
                            onChange={(e) => setCustomization(prev => ({ ...prev, headphones: e.target.checked }))}
                            className="rounded bg-zinc-900 border-zinc-800 text-emerald-500 focus:ring-emerald-500"
                          />
                          <label htmlFor="headphones-toggle" className="text-xs font-bold text-zinc-200 cursor-pointer">Headphones</label>
                        </div>
                        {customization.headphones && (
                          <div className="flex items-center gap-1.5">
                            <input 
                              type="color" 
                              value={customization.headphonesColor} 
                              onChange={(e) => setCustomization(prev => ({ ...prev, headphonesColor: e.target.value }))}
                              className="w-6 h-6 rounded border border-zinc-800 cursor-pointer bg-zinc-900 p-0.5"
                            />
                            <span className="text-[10px] font-mono text-zinc-400 uppercase">{customization.headphonesColor}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Action Trigger / Button */}
            <div className="flex flex-col gap-2 shrink-0 mt-auto">
              <button
                onClick={isConnected ? disconnect : connect}
                disabled={state === 'thinking'}
                className={`
                  w-full flex items-center justify-center gap-3 px-5 py-4 rounded-xl font-bold text-sm transition-all duration-300 active:scale-98 cursor-pointer
                  ${isConnected 
                    ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30' 
                    : 'bg-emerald-500 hover:bg-emerald-400 hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] text-zinc-950 border border-emerald-400/20'
                  }
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
              >
                {isConnected ? (
                  <>
                    <MicOff className="w-4.5 h-4.5 stroke-[2.5]" />
                    DISCONNECT SESSION
                  </>
                ) : (
                  <>
                    <Mic className="w-4.5 h-4.5 stroke-[2.5]" />
                    ESTABLISH NEURAL CONNECT
                  </>
                )}
              </button>

              {/* Session Time & Error banner */}
              {isConnected && (
                <div className="flex items-center justify-center gap-2 text-xs font-mono text-zinc-400 bg-zinc-900/20 py-1.5 border border-zinc-800/40 rounded-xl">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>ACTIVE TIME: {formatDuration(duration)}</span>
                </div>
              )}

              {error && (
                <div className="flex items-start gap-2 text-red-400 bg-red-500/10 px-4 py-3 rounded-xl border border-red-500/20 text-xs leading-normal">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="font-bold block uppercase font-mono tracking-wider mb-0.5">Connection Error</span>
                    <p className="text-zinc-300">{error}</p>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* RIGHT COLUMN: Hologram Stage (lg:col-span-7) */}
          <div className="lg:col-span-7 flex flex-col justify-between bg-zinc-900/20 rounded-3xl border border-zinc-800/40 p-6 relative overflow-hidden lg:h-full min-h-[450px]">
            
            {/* Grid background inside stage */}
            <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(24,24,27,0.3)_1px,transparent_1px)] bg-[size:100%_4px] pointer-events-none" />
            <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-emerald-500/[0.02] rounded-full blur-[80px] pointer-events-none" />
            
            {/* Stage Header Controls */}
            <div className="flex justify-between items-center z-10 w-full">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}`} />
                <span className="text-[10px] font-bold font-mono tracking-widest text-zinc-400 uppercase">
                  {isConnected ? 'STREAM CHANNEL ACTIVE' : 'STAGE LINK STANDBY'}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSubtitle(!showSubtitle)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono font-bold transition-all border cursor-pointer ${
                    showSubtitle 
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                      : 'bg-zinc-900/50 text-zinc-500 border-zinc-800 hover:text-zinc-300'
                  }`}
                  title="Toggle Subtitles"
                >
                  {showSubtitle ? (
                    <>
                      <Captions className="w-3.5 h-3.5" />
                      <span>CAPTIONS ON</span>
                    </>
                  ) : (
                    <>
                      <CaptionsOff className="w-3.5 h-3.5" />
                      <span>CAPTIONS OFF</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => setIsCodeModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono font-bold transition-all border bg-zinc-900/50 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:border-zinc-700 cursor-pointer"
                  title="Get Avatar Integration Code"
                >
                  <Code className="w-3.5 h-3.5 text-emerald-400" />
                  <span>CODE</span>
                </button>

                <button
                  onClick={() => setIsFullscreenOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono font-bold transition-all border bg-zinc-900/50 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:border-zinc-700 cursor-pointer"
                  title="View Avatar Fullscreen"
                >
                  <Maximize className="w-3.5 h-3.5 text-emerald-400" />
                  <span>FULLSCREEN</span>
                </button>
              </div>
            </div>

            {/* Center Avatar Core Stage */}
            <div className="flex-1 flex items-center justify-center w-full my-4 min-h-[300px] lg:min-h-[420px]">
              <RealtimeAvatar 
                state={state} 
                analyser={analyser} 
                size={avatarSize} 
                variant={variant}
                vrmUrl={activeVrmUrl}
                glbUrl={glbUrl}
                dicebearCollection={dicebearCollection}
                dicebearSeed={dicebearSeed}
                subtitle={subtitle}
                thought={thought}
                showSubtitle={showSubtitle}
                maxMouthOpening={maxMouthOpening}
                mouseTrackingIntensity={mouseTrackingIntensity}
                blinkIntervalMin={blinkIntervalMin}
                blinkIntervalMax={blinkIntervalMax}
                blinkDuration={blinkDuration}
                stateColors={stateColors}
                stateLabels={stateLabels}
                customization={customization}
              />
            </div>

            {/* Audio Waveform Telemetry Overlay */}
            <div className="z-10 w-full mb-3 shrink-0 flex flex-col gap-2">
              <AudioVisualizer analyser={analyser} state={state} height={70} stateColors={stateColors} />
              <div className="text-[10px] font-mono text-zinc-400 text-center uppercase tracking-widest leading-normal">
                {telemetryStates[state]}
              </div>
            </div>

            {/* Footer Telemetry Stamp */}
            <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500 border-t border-zinc-800/40 pt-4 z-10">
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                <span>CORE NODE: GEMINI-3.1-FLASH-LIVE</span>
                <span className="hidden sm:inline text-zinc-800">|</span>
                <span>LINK: {isConnected ? 'ACTIVE' : 'STANDBY'}</span>
                <span className="hidden sm:inline text-zinc-800">|</span>
                <span className="uppercase" style={{ color: stateColors[state as keyof typeof stateColors] }}>
                  STATE: {stateLabels[state as keyof typeof stateLabels] || state}
                </span>
              </div>
              <span className="animate-pulse flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                SYSTEM ONLINE
              </span>
            </div>

          </div>

        </div>

      </div>

      <AnimatePresence>
        {isCodeModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCodeModalOpen(false)}
              className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            />

            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="bg-zinc-900 border border-zinc-800/80 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl z-10 text-zinc-100"
            >
              {/* Modal Header */}
              <div className="flex justify-between items-center p-6 border-b border-zinc-800/60 bg-zinc-900/50 backdrop-blur-md">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-emerald-500/15 flex items-center justify-center border border-emerald-500/20">
                    <Code className="w-4 h-4 text-emerald-400" />
                  </div>
                  <h3 className="text-base font-bold font-sans text-white uppercase tracking-wider">
                    Avatar Code Exporter
                  </h3>
                </div>
                <button
                  onClick={() => setIsCodeModalOpen(false)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tab Switcher */}
              <div className="flex border-b border-zinc-800/40 px-6 bg-zinc-900/30">
                <button
                  onClick={() => { setActiveTab('code'); setCopiedText(false); }}
                  className={`py-3.5 px-4 text-xs font-mono font-bold tracking-wider transition-all border-b-2 cursor-pointer ${
                    activeTab === 'code'
                      ? 'border-emerald-500 text-emerald-400'
                      : 'border-transparent text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  [ 1. JSX USAGE ]
                </button>
                <button
                  onClick={() => { setActiveTab('instructions'); setCopiedText(false); }}
                  className={`py-3.5 px-4 text-xs font-mono font-bold tracking-wider transition-all border-b-2 cursor-pointer ${
                    activeTab === 'instructions'
                      ? 'border-emerald-500 text-emerald-400'
                      : 'border-transparent text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  [ 2. SETUP GUIDE ]
                </button>
              </div>

              {/* Modal Body / Code Panel */}
              <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
                <div className="relative flex-1 bg-zinc-950/80 border border-zinc-850 rounded-2xl p-4 overflow-x-auto font-mono text-xs select-text leading-relaxed text-zinc-300">
                  <button
                    onClick={copyToClipboard}
                    className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold font-mono uppercase transition-all bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 hover:border-zinc-700 cursor-pointer"
                  >
                    {copiedText ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">COPIED!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-zinc-400" />
                        <span>COPY CODE</span>
                      </>
                    )}
                  </button>
                  <pre className="whitespace-pre overflow-x-auto select-text pr-16 max-h-[40vh] scrollbar-thin">
                    {activeTab === 'code' ? generateJSXCode() : `# 1. Install react-realtime-avatar${variant === 'vrm' ? ' and 3D VRM dependencies' : variant === 'glb' ? ' and the 3D GLB dependencies' : variant === 'dicebear' ? ' and the DiceBear packages (CC0 styles)' : ' and dependencies'}
${installCommand}

# 2. Add styles in your main entry file (e.g. main.tsx or App.tsx)
import 'react-realtime-avatar/style.css';

# 3. Mount the <RealtimeAvatar /> component inside your application
# (See the "JSX Usage" tab for your customized code snippet)`}
                  </pre>
                </div>

                <div className="text-[11px] font-mono text-zinc-500 leading-relaxed border-t border-zinc-800/40 pt-4 flex flex-col gap-1.5">
                  <span className="text-emerald-400 font-bold uppercase tracking-wider text-[10px]">INTEGRATION NOTES</span>
                  <p>
                    Ensure your parent container has relative styling and fits the dimension specified in <code className="text-zinc-300 bg-zinc-950 px-1 py-0.5 rounded border border-zinc-800/40 font-semibold">size</code> (defaults to 280px).
                  </p>
                  <p>
                    Make sure to pass the active <code className="text-zinc-300 bg-zinc-950 px-1 py-0.5 rounded border border-zinc-800/40 font-semibold">state</code> ('idle' | 'listening' | 'thinking' | 'speaking') and a WebAudio <code className="text-zinc-300 bg-zinc-950 px-1 py-0.5 rounded border border-zinc-800/40 font-semibold">analyser</code> node for the audio-reactive mouth. Without an analyser, speaking falls back to a synthetic mouth pattern.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
        {isFullscreenOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/95 backdrop-blur-2xl p-6">
            {/* Close handler backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFullscreenOpen(false)}
              className="absolute inset-0 cursor-zoom-out"
            />

            {/* Floating Close Button */}
            <button
              onClick={() => setIsFullscreenOpen(false)}
              className="absolute top-6 right-6 z-50 p-3 rounded-full border border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 hover:rotate-90 transition-all duration-300 cursor-pointer"
              title="Close Fullscreen (Esc)"
            >
              <X className="w-6 h-6" />
            </button>

            {/* ESC Guide Tag */}
            <div className="absolute top-6 left-6 z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-zinc-800 bg-zinc-900/60 text-zinc-500 text-[10px] font-mono font-bold tracking-widest uppercase">
              <span>Esc to exit</span>
            </div>

            {/* Massive Avatar Component */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 150 }}
              className="relative z-10 w-full h-full max-w-5xl max-h-[85vh] flex items-center justify-center"
            >
              <RealtimeAvatar 
                state={state} 
                analyser={analyser} 
                size={Math.min(window.innerHeight * 0.75, window.innerWidth * 0.75)} 
                variant={variant}
                vrmUrl={activeVrmUrl}
                glbUrl={glbUrl}
                dicebearCollection={dicebearCollection}
                dicebearSeed={dicebearSeed}
                subtitle={subtitle}
                thought={thought}
                showSubtitle={showSubtitle}
                maxMouthOpening={maxMouthOpening}
                mouseTrackingIntensity={mouseTrackingIntensity}
                blinkIntervalMin={blinkIntervalMin}
                blinkIntervalMax={blinkIntervalMax}
                blinkDuration={blinkDuration}
                stateColors={stateColors}
                stateLabels={stateLabels}
                customization={customization}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
