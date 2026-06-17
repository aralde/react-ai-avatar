import React, { Suspense, useEffect, useRef } from 'react';
import { AvatarCustomization } from './DefaultAvatar';
import { ContractAvatar } from './ContractAvatar';
import { GeometricAvatar } from './GeometricAvatar';
import { MemojiAvatar } from './MemojiAvatar';
import { PixelArtAvatar } from './PixelArtAvatar';
import { DoodleAvatar } from './DoodleAvatar';
import { CoderAvatar } from './CoderAvatar';
import { DiceBearAvatar } from './DiceBearAvatar';
import { AvatarState } from '../lib/types';
import type { SpeechActivitySource } from '../lib/speechActivity';
import { useStreamingTextActivity } from '../lib/useStreamingTextActivity';
import type { DiceBearCollection } from '../lib/dicebear';
import { useReducedMotion } from '../lib/useReducedMotion';
import { motion, useMotionValue } from 'motion/react';

// Lazy-loaded so the three.js stack (optional peer deps) is only fetched
// when variant="vrm" is actually rendered.
const VrmAvatarLazy = React.lazy(() =>
  import('./VrmAvatar').then((m) => ({ default: m.VrmAvatar }))
);

// Same deal for the GLB + ARKit renderer: the three.js stack is only fetched
// when variant="glb" is actually rendered.
const GlbAvatarLazy = React.lazy(() =>
  import('./GlbArkitAvatar').then((m) => ({ default: m.GlbArkitAvatar }))
);

// Note: DiceBearAvatar itself is lightweight and imported directly. The
// heavy, optional @dicebear/* packages are deferred at runtime by a dynamic
// import *inside* the component — so they're only fetched when actually used.

export interface RealtimeAvatarProps {
  state: AvatarState;
  /**
   * WebAudio AnalyserNode for the audio-reactive mouth (voice pipelines).
   * Optional: omit it (or pass `null`) and `speaking` falls back to a
   * synthetic speech-like pattern — so the minimal usage is just
   * `<RealtimeAvatar state={state} />`.
   */
  analyser?: AnalyserNode | null;
  /**
   * Token-rate mouth driver for text-streaming LLMs (OpenAI-style
   * `/chat/completions` or `/responses` with `stream: true`). Create one with
   * `createSpeechActivity()` and `push()` each streamed chunk. When provided,
   * it drives the mouth instead of `analyser` — so a text-only assistant still
   * gets a face that tracks the stream. See `createSpeechActivity`.
   */
  speechActivity?: SpeechActivitySource;
  /**
   * Declarative mouth driver for text-streaming chats. Pass the *accumulated*
   * assistant text (the kind a hook like the Vercel AI SDK's `useChat` hands
   * you — it grows each render); the avatar diffs its growth internally and
   * drives the mouth from token cadence. No `createSpeechActivity`, no reader
   * loop. Ignored when `speechActivity` is set; takes precedence over
   * `analyser`. See `useStreamingTextActivity`.
   */
  streamingText?: string;
  size?: number;
  variant?: 'geometric' | 'memoji' | 'pixelart' | 'doodle' | 'coder' | 'vrm' | 'glb' | 'dicebear' | 'byos';
  /** Your own contract-compliant SVG, rendered when variant="byos". */
  children?: React.ReactNode;
  vrmUrl?: string;
  /** CORS-enabled .glb URL with ARKit blendshapes, for variant="glb". */
  glbUrl?: string;
  /** DiceBear style id (curated CC0 set), for variant="dicebear". */
  dicebearCollection?: DiceBearCollection | string;
  /** Deterministic DiceBear seed, for variant="dicebear". */
  dicebearSeed?: string;
  subtitle?: string;
  thought?: string;
  showSubtitle?: boolean;
  className?: string;
  style?: React.CSSProperties;

  // Customizable Animation Parameters
  maxMouthOpening?: number;
  blinkIntervalMin?: number;
  blinkIntervalMax?: number;
  blinkDuration?: number;
  mouseTrackingIntensity?: number;

  // Customizable Theming
  stateColors?: {
    idle?: string;
    listening?: string;
    thinking?: string;
    speaking?: string;
  };
  stateLabels?: {
    idle?: string;
    listening?: string;
    thinking?: string;
    speaking?: string;
  };
  customization?: AvatarCustomization;
}

function hexToRgba(color: string, opacity: number): string {
  if (!color || !color.startsWith('#')) return color || 'transparent';
  const cleanHex = color.replace('#', '');
  let r = 0, g = 0, b = 0;
  if (cleanHex.length === 3) {
    r = parseInt(cleanHex[0] + cleanHex[0], 16);
    g = parseInt(cleanHex[1] + cleanHex[1], 16);
    b = parseInt(cleanHex[2] + cleanHex[2], 16);
  } else if (cleanHex.length === 6) {
    r = parseInt(cleanHex.substring(0, 2), 16);
    g = parseInt(cleanHex.substring(2, 4), 16);
    b = parseInt(cleanHex.substring(4, 6), 16);
  }
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

export function RealtimeAvatar({
  state,
  analyser = null,
  speechActivity,
  streamingText,
  size = 280,
  variant = 'geometric',
  children,
  vrmUrl,
  glbUrl,
  subtitle,
  thought,
  showSubtitle = true,
  className = '',
  style,
  dicebearCollection,
  dicebearSeed,
  maxMouthOpening,
  blinkIntervalMin,
  blinkIntervalMax,
  blinkDuration,
  mouseTrackingIntensity,
  stateColors,
  stateLabels,
  customization
}: RealtimeAvatarProps) {
  // A token-rate speech activity source takes precedence over the audio
  // analyser as the mouth driver, so a text-streaming LLM gets a face too.
  // It can come two ways: the explicit `speechActivity` prop (imperative —
  // host owns the stream and calls push()), or `streamingText` (declarative —
  // host passes accumulated text and we diff its growth here). Both collapse
  // to one SpeechActivitySource; explicit wins. Whatever we land on rides the
  // same internal channel (createMouthEngine detects the kind).
  const textActivity = useStreamingTextActivity(streamingText);
  const activitySource = speechActivity ?? textActivity;
  const mouthSource = activitySource ?? analyser;

  const avatarProps = {
    state,
    analyser: mouthSource,
    size,
    maxMouthOpening,
    blinkIntervalMin,
    blinkIntervalMax,
    blinkDuration,
    mouseTrackingIntensity,
    stateColors,
    customization
  };

  let AvatarComponent;
  if (variant === 'vrm') {
    AvatarComponent = (
      <Suspense fallback={null}>
        <VrmAvatarLazy {...avatarProps} vrmUrl={vrmUrl} />
      </Suspense>
    );
  } else if (variant === 'glb') {
    AvatarComponent = (
      <Suspense fallback={null}>
        <GlbAvatarLazy {...avatarProps} glbUrl={glbUrl} />
      </Suspense>
    );
  } else if (variant === 'dicebear') {
    AvatarComponent = (
      <DiceBearAvatar
        state={state}
        analyser={mouthSource}
        size={size}
        maxMouthOpening={maxMouthOpening}
        stateColors={stateColors}
        collection={dicebearCollection}
        seed={dicebearSeed}
      />
    );
  } else if (variant === 'byos') {
    AvatarComponent = <ContractAvatar {...avatarProps}>{children}</ContractAvatar>;
  } else {
    const presets = {
      geometric: GeometricAvatar,
      memoji: MemojiAvatar,
      pixelart: PixelArtAvatar,
      doodle: DoodleAvatar,
      coder: CoderAvatar,
    } as const;
    const Preset = presets[variant] ?? GeometricAvatar;
    AvatarComponent = (
      // Keyed by variant so switching presets remounts the runtime cleanly
      <ContractAvatar key={variant} {...avatarProps}>
        <Preset size={size} customization={customization} />
      </ContractAvatar>
    );
  }

  // Motion values for volume-reactive pulsing
  const glowScaleValue = useMotionValue(1);
  const glowOpacityValue = useMotionValue(0.15);
  const requestRef = useRef<number | null>(null);
  const reducedMotion = useReducedMotion();

  // Resolved theme mappings with standard fallbacks
  const resolvedStateColors = {
    idle: stateColors?.idle ?? '#4b5563', // gray-600
    listening: stateColors?.listening ?? '#3b82f6', // blue-500
    thinking: stateColors?.thinking ?? '#8b5cf6', // purple-500
    speaking: stateColors?.speaking ?? '#10b981' // emerald-500
  };

  const resolvedStateLabels = {
    idle: stateLabels?.idle ?? 'Idle',
    listening: stateLabels?.listening ?? 'Listening',
    thinking: stateLabels?.thinking ?? 'Thinking...',
    speaking: stateLabels?.speaking ?? 'Speaking'
  };

  const glowShadows = {
    idle: hexToRgba(resolvedStateColors.idle, 0.15),
    listening: hexToRgba(resolvedStateColors.listening, 0.35),
    thinking: hexToRgba(resolvedStateColors.thinking, 0.4),
    speaking: hexToRgba(resolvedStateColors.speaking, 0.45)
  };

  useEffect(() => {
    // Glow reacts to whichever driver is live: audio amplitude when an
    // analyser is present, otherwise token-rate energy in text-stream mode.
    const audioReactive = analyser && (state === 'speaking' || state === 'listening');
    const textReactive = !analyser && activitySource && state === 'speaking';

    if (!audioReactive && !textReactive) {
      glowScaleValue.set(state === 'thinking' ? 1.1 : 1);
      glowOpacityValue.set(state === 'thinking' ? 0.35 : 0.15);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      return;
    }

    const dataArray = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;

    const updateGlow = () => {
      let vol: number;
      if (analyser && dataArray) {
        analyser.getByteTimeDomainData(dataArray);
        let maxVal = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const dev = Math.abs(dataArray[i] - 128);
          if (dev > maxVal) maxVal = dev;
        }
        vol = Math.min(1.0, maxVal / 128);
      } else {
        vol = activitySource ? activitySource.sample() : 0;
      }

      glowScaleValue.set(1 + vol * 0.35);
      glowOpacityValue.set(0.15 + vol * 0.35);

      requestRef.current = requestAnimationFrame(updateGlow);
    };

    requestRef.current = requestAnimationFrame(updateGlow);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [analyser, activitySource, state, glowScaleValue, glowOpacityValue]);

  return (
    <div className={`relative flex flex-col items-center justify-center ${className}`} style={{ width: size, height: size, ...style }}>
      
      {/* Soft ambient color glow behind the avatar, reacting to audio + state.
          The old dashed "holographic projection ring" was removed: several
          avatars already carry their own container, so the rotating border was
          redundant and clashed with the realistic 3D model. */}
      <motion.div
        className="absolute rounded-[1.75rem] pointer-events-none filter blur-2xl"
        style={{
          width: size * 0.9,
          height: size * 0.9,
          backgroundColor: resolvedStateColors[state],
          scale: glowScaleValue,
          opacity: glowOpacityValue,
        }}
      />
      
      {/* Absolute center of the avatar image */}
      <div className="w-full h-full relative flex items-center justify-center z-10">
        {AvatarComponent}
      </div>

      {/* Comic-style Thought Bubble (Floats Center ABOVE the Avatar) */}
      {showSubtitle && thought && (
        <motion.div 
          initial={{ opacity: 0, y: 15, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="absolute bottom-[108%] left-1/2 -translate-x-1/2 w-[90vw] max-w-[340px] md:max-w-[420px] text-left pointer-events-none z-40"
        >
          <div className="relative bg-zinc-900/90 backdrop-blur-xl text-zinc-100 px-5 py-4 rounded-3xl shadow-[0_10px_30px_rgba(139,92,246,0.15)] border border-purple-500/25 text-sm italic break-words">
            <div className="text-purple-400 text-[10px] uppercase tracking-widest font-mono font-bold mb-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
              Thought process
            </div>
            <p className="leading-relaxed text-zinc-200">{thought}</p>
            
            {/* Elegant thought trail bubble circles pointing down toward avatar center */}
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-4 h-4 bg-zinc-900/90 rounded-full border border-purple-500/20 shadow-md backdrop-blur-md"></div>
            <div className="absolute -bottom-6 left-[48%] -translate-x-1/2 w-2.5 h-2.5 bg-zinc-900/90 rounded-full border border-purple-500/15 shadow-sm backdrop-blur-md"></div>
            <div className="absolute -bottom-8 left-[47%] -translate-x-1/2 w-1.5 h-1.5 bg-zinc-900/90 rounded-full border border-purple-500/10 backdrop-blur-md"></div>
          </div>
        </motion.div>
      )}

      {/* Unified State Indicator Pill (Positioned right under the avatar, consistent for all) */}
      <motion.div
        role="status"
        aria-live="polite"
        className="absolute -bottom-6 px-4 py-1.5 rounded-full text-xs font-bold text-white uppercase tracking-widest shadow-lg z-30 cursor-default select-none border border-white/10"
        animate={{
          backgroundColor: resolvedStateColors[state],
          boxShadow: `0 4px 14px rgba(0,0,0,0.4), 0 0 16px ${glowShadows[state]}`
        }}
        transition={{ duration: 0.3 }}
      >
        <span className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full bg-white ${!reducedMotion && (state === 'speaking' || state === 'thinking') ? 'animate-ping' : ''}`} />
          {resolvedStateLabels[state]}
        </span>
      </motion.div>

      {/* Movie-style Subtitles Overlay (Floats Centered BELOW the indicator, responsive & generous padding) */}
      {showSubtitle && subtitle && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute top-[115%] left-1/2 -translate-x-1/2 w-[90vw] max-w-[500px] md:max-w-[640px] text-center pointer-events-none z-50 pb-8"
        >
          <span 
            className="inline-block px-6 py-4 text-base md:text-lg font-medium text-zinc-100 break-words leading-relaxed shadow-2xl border"
            style={{
              textShadow: '0px 1px 3px rgba(0,0,0,0.5)',
              background: 'rgba(9, 9, 11, 0.8)', // zinc-950 at 0.8
              backdropFilter: 'blur(12px)',
              borderColor: 'rgba(63, 63, 70, 0.4)',
              borderRadius: '20px',
            }}
          >
            {subtitle}
          </span>
        </motion.div>
      )}
    </div>
  );
}
