import React, { useEffect, useRef } from 'react';
import { motion, useAnimation } from 'motion/react';
import { AvatarState } from '../lib/types';
import { useReducedMotion } from '../lib/useReducedMotion';

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
  const requestRef = useRef<number | null>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (state !== 'speaking') {
      mouthControls.start({ d: "M 40 70 Q 50 70 60 70" }); // Closed mouth
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      return;
    }

    // No analyser? Degrade gracefully: animate the mouth with a synthetic
    // speech-like pattern instead of leaving it frozen shut.
    if (!analyser) {
      let phase = Math.random() * 100;

      const tickProcedural = () => {
        phase += 0.18;
        const amp =
          0.35 +
          0.30 * Math.sin(phase) +
          0.25 * Math.sin(phase * 1.7 + 1.3) +
          0.10 * Math.sin(phase * 3.1);
        const level = Math.min(1, Math.max(0, amp));

        const opening = level * maxMouthOpening * 0.8;
        const widthOffset = level * 6;
        mouthControls.set({ d: `M ${40 - widthOffset} 70 Q 50 ${70 + opening} ${60 + widthOffset} 70` });

        requestRef.current = requestAnimationFrame(tickProcedural);
      };

      requestRef.current = requestAnimationFrame(tickProcedural);
      return () => {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
      };
    }

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const frequencyData = new Uint8Array(analyser.frequencyBinCount);

    const sampleRate = analyser.context.sampleRate || 24000;
    const Nyquist = sampleRate / 2;
    const binWidth = Nyquist / analyser.frequencyBinCount;

    const lowStart = Math.round(200 / binWidth);
    const lowEnd = Math.round(800 / binWidth);
    const midStart = Math.round(800 / binWidth);
    const midEnd = Math.round(1800 / binWidth);
    const highStart = Math.round(1800 / binWidth);
    const highEnd = Math.round(3200 / binWidth);

    let currentWidthMult = 1.0;
    let currentHeightMult = 1.0;

    const updateMouth = () => {
      analyser.getByteTimeDomainData(dataArray);
      analyser.getByteFrequencyData(frequencyData);
      
      // Calculate peak deviation from 128 (normalized volume between 0 and 1)
      let maxVal = 0;
      for (let i = 0; i < dataArray.length; i++) {
        const dev = Math.abs(dataArray[i] - 128);
        if (dev > maxVal) {
          maxVal = dev;
        }
      }
      
      const normalizedVolume = Math.min(1.0, maxVal / 128);

      let targetWidthMult = 1.0;
      let targetHeightMult = 1.0;

      if (normalizedVolume > 0.05) {
        let energyLow = 0;
        for (let i = lowStart; i <= lowEnd; i++) energyLow += frequencyData[i];
        let energyMid = 0;
        for (let i = midStart; i <= midEnd; i++) energyMid += frequencyData[i];
        let energyHigh = 0;
        for (let i = highStart; i <= highEnd; i++) energyHigh += frequencyData[i];

        const totalEnergy = energyLow + energyMid + energyHigh + 0.001;
        const ratioHigh = energyHigh / totalEnergy;
        const ratioMid = energyMid / totalEnergy;

        if (ratioHigh > 0.35) {
          // "E" viseme (Smile / Stretch)
          targetWidthMult = 1.4;
          targetHeightMult = 0.55;
        } else if (ratioMid > 0.40 && ratioHigh < 0.20) {
          // "O" viseme (Round / Narrow)
          targetWidthMult = 0.65;
          targetHeightMult = 1.35;
        }
      }

      currentWidthMult += (targetWidthMult - currentWidthMult) * 0.25;
      currentHeightMult += (targetHeightMult - currentHeightMult) * 0.25;
      
      // Map volume to mouth opening (0 to maxMouthOpening) and width (0 to 10)
      const opening = normalizedVolume * maxMouthOpening * currentHeightMult;
      const widthOffset = normalizedVolume * 10 * currentWidthMult;

      const d = `M ${40 - widthOffset} 70 Q 50 ${70 + opening} ${60 + widthOffset} 70`;
      
      mouthControls.set({ d });
      
      requestRef.current = requestAnimationFrame(updateMouth);
    };

    requestRef.current = requestAnimationFrame(updateMouth);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [analyser, state, mouthControls, maxMouthOpening]);

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
