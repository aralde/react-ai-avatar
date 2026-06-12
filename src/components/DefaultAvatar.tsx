import React, { useEffect, useRef } from 'react';
import { motion, useAnimation } from 'motion/react';
import { AvatarState } from '../lib/types';
import { useReducedMotion } from '../lib/useReducedMotion';
import { useAudioMouth } from '../lib/useAudioMouth';

export interface AvatarCustomization {
  skinColor: string;
  hairColor: string;
  clothingColor: string;
  hoodieColor: string;
  bgColor: string;
  glasses: boolean;
  glassesColor: string;
  headphones: boolean;
  headphonesColor: string;
}

export function darkenColor(hex: string, percent: number): string {
  const cleanHex = hex.replace("#", "");
  const num = parseInt(cleanHex, 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) - amt;
  const G = ((num >> 8) & 0x00ff) - amt;
  const B = (num & 0x0000ff) - amt;
  return "#" + (
    0x1000000 +
    (R < 0 ? 0 : R > 255 ? 255 : R) * 0x10000 +
    (G < 0 ? 0 : G > 255 ? 255 : G) * 0x100 +
    (B < 0 ? 0 : B > 255 ? 255 : B)
  ).toString(16).slice(1);
}

export interface AvatarProps {
  state: AvatarState;
  analyser: AnalyserNode | null;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  maxMouthOpening?: number;
  blinkIntervalMin?: number;
  blinkIntervalMax?: number;
  blinkDuration?: number;
  mouseTrackingIntensity?: number;
  stateColors?: {
    idle?: string;
    listening?: string;
    thinking?: string;
    speaking?: string;
  };
  customization?: AvatarCustomization;
}

export function DefaultAvatar({ 
  state, 
  analyser, 
  size = 200,
  className = '',
  style,
  maxMouthOpening = 30,
  blinkIntervalMin = 2000,
  blinkIntervalMax = 6000,
  blinkDuration = 100,
  stateColors,
  customization
}: AvatarProps) {
  const mouthControls = useAnimation();
  const eyeControls = useAnimation();
  const reducedMotion = useReducedMotion();

  // Shared engine: audio-reactive when an analyser is provided, synthetic
  // speech-like fallback otherwise (the mouth never freezes shut).
  const mouthSmooth = useRef({ width: 1, height: 1 });
  useAudioMouth({
    analyser,
    enabled: state === 'speaking',
    onFrame: ({ level, shape }) => {
      let targetWidthMult = 1.0;
      let targetHeightMult = 1.0;
      if (shape === 'e') {
        targetWidthMult = 1.4;
        targetHeightMult = 0.55;
      } else if (shape === 'o') {
        targetWidthMult = 0.65;
        targetHeightMult = 1.35;
      }
      mouthSmooth.current.width += (targetWidthMult - mouthSmooth.current.width) * 0.25;
      mouthSmooth.current.height += (targetHeightMult - mouthSmooth.current.height) * 0.25;

      const opening = level * maxMouthOpening * mouthSmooth.current.height;
      const widthOffset = level * 10 * mouthSmooth.current.width;
      mouthControls.set({ d: `M ${40 - widthOffset} 70 Q 50 ${70 + opening} ${60 + widthOffset} 70` });
    },
    onStop: () => {
      mouthControls.start({ d: 'M 40 70 Q 50 70 60 70' }); // Closed mouth
    },
  });

  // Blinking logic (disabled when the user prefers reduced motion)
  useEffect(() => {
    if (reducedMotion) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const blink = async () => {
      while (active) {
        await new Promise(resolve => {
          timer = setTimeout(resolve, Math.random() * (blinkIntervalMax - blinkIntervalMin) + blinkIntervalMin);
        });
        if (!active) break;
        await eyeControls.start({ scaleY: 0.1, transition: { duration: blinkDuration / 1000 } });
        if (!active) break;
        await eyeControls.start({ scaleY: 1, transition: { duration: blinkDuration / 1000 } });
      }
    };
    blink();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [eyeControls, blinkIntervalMin, blinkIntervalMax, blinkDuration, reducedMotion]);

  // State colors
  const resolvedStateColors = {
    idle: stateColors?.idle ?? '#9ca3af', // gray-400
    listening: stateColors?.listening ?? '#3b82f6', // blue-500
    thinking: stateColors?.thinking ?? '#8b5cf6', // purple-500
    speaking: stateColors?.speaking ?? '#10b981' // emerald-500
  };

  return (
    <div className={`relative flex flex-col items-center justify-center ${className}`} style={{ width: size, height: size, ...style }}>
      {/* Glow Effect */}
      <motion.div
        className="absolute inset-0 rounded-3xl blur-2xl opacity-50"
        animate={{
          backgroundColor: resolvedStateColors[state],
          scale: !reducedMotion && (state === 'speaking' || state === 'thinking') ? [1, 1.1, 1] : 1
        }}
        transition={{
          repeat: state === 'speaking' || state === 'thinking' ? Infinity : 0,
          duration: 1.5,
          ease: "easeInOut"
        }}
      />
      
      <motion.svg
        viewBox="0 0 100 100"
        className="w-full h-full relative z-10 drop-shadow-2xl"
        animate={{
          y: !reducedMotion && state === 'speaking' ? [0, -3, 0] : 0,
        }}
        transition={{
          repeat: state === 'speaking' ? Infinity : 0,
          duration: 0.4,
          ease: "easeInOut"
        }}
      >
        {/* Head */}
        <circle cx="50" cy="50" r="45" fill={customization?.skinColor ?? '#fcd34d'} />
        
        {/* Eyes */}
        <motion.g animate={eyeControls} style={{ transformOrigin: '50px 40px' }}>
          <circle cx="35" cy="40" r="5" fill="#1f2937" />
          <circle cx="65" cy="40" r="5" fill="#1f2937" />
        </motion.g>

        {/* Mouth */}
        <motion.path
          d="M 40 70 Q 50 70 60 70"
          fill="transparent"
          stroke="#1f2937"
          strokeWidth="4"
          strokeLinecap="round"
          animate={mouthControls}
        />
      </motion.svg>
    </div>
  );
}
