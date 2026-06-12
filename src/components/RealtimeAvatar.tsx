import React, { Suspense, useEffect, useRef } from 'react';
import { DefaultAvatar, AvatarCustomization } from './DefaultAvatar';
import { CustomAvatar } from './CustomAvatar';
import { ContractAvatar } from './ContractAvatar';
import { GeometricAvatar } from './GeometricAvatar';
import { MemojiAvatar } from './MemojiAvatar';
import { PixelArtAvatar } from './PixelArtAvatar';
import { DoodleAvatar } from './DoodleAvatar';
import { AvatarState } from '../lib/types';
import { useReducedMotion } from '../lib/useReducedMotion';
import { motion, useMotionValue } from 'motion/react';

// Lazy-loaded so the three.js stack (optional peer deps) is only fetched
// when variant="vrm" is actually rendered.
const VrmAvatarLazy = React.lazy(() =>
  import('./VrmAvatar').then((m) => ({ default: m.VrmAvatar }))
);

export interface RealtimeAvatarProps {
  state: AvatarState;
  analyser: AnalyserNode | null;
  size?: number;
  variant?: 'geometric' | 'memoji' | 'pixelart' | 'doodle' | 'default' | 'custom' | 'vrm' | 'byos';
  /** Your own contract-compliant SVG, rendered when variant="byos". */
  children?: React.ReactNode;
  vrmUrl?: string;
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
  analyser,
  size = 280,
  variant = 'geometric',
  children,
  vrmUrl,
  subtitle,
  thought,
  showSubtitle = true,
  className = '',
  style,
  maxMouthOpening,
  blinkIntervalMin,
  blinkIntervalMax,
  blinkDuration,
  mouseTrackingIntensity,
  stateColors,
  stateLabels,
  customization
}: RealtimeAvatarProps) {
  const avatarProps = {
    state,
    analyser,
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
  } else if (variant === 'custom') {
    AvatarComponent = <CustomAvatar {...avatarProps} />;
  } else if (variant === 'byos') {
    AvatarComponent = <ContractAvatar {...avatarProps}>{children}</ContractAvatar>;
  } else if (variant === 'default') {
    AvatarComponent = <DefaultAvatar {...avatarProps} />;
  } else {
    const presets = {
      geometric: GeometricAvatar,
      memoji: MemojiAvatar,
      pixelart: PixelArtAvatar,
      doodle: DoodleAvatar,
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
  const scaleValue = useMotionValue(1);
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
    if (!analyser || (state !== 'speaking' && state !== 'listening')) {
      scaleValue.set(1);
      glowScaleValue.set(state === 'thinking' ? 1.1 : 1);
      glowOpacityValue.set(state === 'thinking' ? 0.35 : 0.15);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      return;
    }

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    
    const updateGlow = () => {
      analyser.getByteTimeDomainData(dataArray);
      let maxVal = 0;
      for (let i = 0; i < dataArray.length; i++) {
        const dev = Math.abs(dataArray[i] - 128);
        if (dev > maxVal) maxVal = dev;
      }
      const vol = Math.min(1.0, maxVal / 128);
      
      scaleValue.set(1 + vol * 0.08);
      glowScaleValue.set(1 + vol * 0.35);
      glowOpacityValue.set(0.15 + vol * 0.35);
      
      requestRef.current = requestAnimationFrame(updateGlow);
    };

    requestRef.current = requestAnimationFrame(updateGlow);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [analyser, state, scaleValue, glowScaleValue, glowOpacityValue]);

  return (
    <div className={`relative flex flex-col items-center justify-center ${className}`} style={{ width: size, height: size, ...style }}>
      
      {/* Futuristic Holographic Projection Ring / Aura Behind Avatar */}
      <motion.div
        className="absolute rounded-[2rem] border-2 border-dashed pointer-events-none"
        style={{
          width: size * 1.05,
          height: size * 1.05,
          borderColor: hexToRgba(resolvedStateColors[state], 0.25),
          scale: scaleValue,
        }}
        animate={{
          rotate: !reducedMotion && state === 'thinking' ? 360 : 0,
        }}
        transition={{
          rotate: !reducedMotion && state === 'thinking' ? { repeat: Infinity, duration: 10, ease: "linear" } : { duration: 0.5 },
        }}
      />

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
