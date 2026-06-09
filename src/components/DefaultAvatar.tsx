import React, { useEffect, useRef } from 'react';
import { motion, useAnimation } from 'motion/react';
import { AvatarState } from '../hooks/useGeminiLive';

export interface AvatarProps {
  state: AvatarState;
  analyser: AnalyserNode | null;
  size?: number;
}

export function DefaultAvatar({ state, analyser, size = 200 }: AvatarProps) {
  const mouthControls = useAnimation();
  const eyeControls = useAnimation();
  const requestRef = useRef<number | null>(null);

  useEffect(() => {
    if (!analyser || state !== 'speaking') {
      mouthControls.start({ d: "M 40 70 Q 50 70 60 70" }); // Closed mouth
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      return;
    }

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const updateMouth = () => {
      analyser.getByteFrequencyData(dataArray);
      
      // Calculate average volume
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const average = sum / dataArray.length;
      
      // Map volume to mouth opening (0 to 30)
      const opening = Math.min(30, Math.max(0, (average / 255) * 60));
      
      // Map high frequencies to mouth width
      let highSum = 0;
      for (let i = Math.floor(dataArray.length / 2); i < dataArray.length; i++) {
        highSum += dataArray[i];
      }
      const highAverage = highSum / (dataArray.length / 2);
      const widthOffset = Math.min(10, (highAverage / 255) * 20);

      const d = `M ${40 - widthOffset} 70 Q 50 ${70 + opening} ${60 + widthOffset} 70`;
      
      mouthControls.set({ d });
      
      requestRef.current = requestAnimationFrame(updateMouth);
    };

    requestRef.current = requestAnimationFrame(updateMouth);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [analyser, state, mouthControls]);

  // Blinking logic
  useEffect(() => {
    let active = true;
    const blink = async () => {
      while (active) {
        await new Promise(resolve => setTimeout(resolve, Math.random() * 4000 + 2000));
        if (!active) break;
        await eyeControls.start({ scaleY: 0.1, transition: { duration: 0.1 } });
        if (!active) break;
        await eyeControls.start({ scaleY: 1, transition: { duration: 0.1 } });
      }
    };
    blink();
    return () => { active = false; };
  }, [eyeControls]);

  // State colors
  const stateColors = {
    idle: '#9ca3af', // gray-400
    listening: '#3b82f6', // blue-500
    thinking: '#8b5cf6', // purple-500
    speaking: '#10b981' // emerald-500
  };

  return (
    <div className="relative flex flex-col items-center justify-center" style={{ width: size, height: size }}>
      {/* Glow Effect */}
      <motion.div
        className="absolute inset-0 rounded-full blur-2xl opacity-50"
        animate={{
          backgroundColor: stateColors[state],
          scale: state === 'speaking' || state === 'thinking' ? [1, 1.1, 1] : 1
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
          y: state === 'speaking' ? [0, -3, 0] : 0,
        }}
        transition={{
          repeat: state === 'speaking' ? Infinity : 0,
          duration: 0.4,
          ease: "easeInOut"
        }}
      >
        {/* Head */}
        <circle cx="50" cy="50" r="45" fill="#fcd34d" />
        
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
