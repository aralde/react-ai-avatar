import React, { useEffect, useRef } from 'react';
import { motion, useAnimation, useMotionValue, useSpring, useTransform, useScroll } from 'motion/react';
import { AvatarProps } from './DefaultAvatar';

export function DeveloperAvatar({ state, analyser, size = 200 }: AvatarProps) {
  const mouthControls = useAnimation();
  const leftEyelidControls = useAnimation();
  const rightEyelidControls = useAnimation();
  const leftEyebrowControls = useAnimation();
  const rightEyebrowControls = useAnimation();
  const requestRef = useRef<number | null>(null);

  // Gaze tracking
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const smoothX = useSpring(mouseX, { stiffness: 100, damping: 20 });
  const smoothY = useSpring(mouseY, { stiffness: 100, damping: 20 });
  
  const headRotateY = useTransform(smoothX, [-1, 1], [-10, 10]);
  const headRotateXMouse = useTransform(smoothY, [-1, 1], [10, -10]);

  // Scroll tracking
  const { scrollY } = useScroll();
  const headRotateXScroll = useTransform(scrollY, [0, 500], [0, -10]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = (e.clientY / window.innerHeight) * 2 - 1;
      mouseX.set(x);
      mouseY.set(y);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  // Blinking
  useEffect(() => {
    let active = true;
    const blink = async () => {
      while (active) {
        await new Promise(resolve => setTimeout(resolve, Math.random() * 4000 + 2000));
        if (!active) break;
        leftEyelidControls.start({ scaleY: 1, transition: { duration: 0.1 } });
        rightEyelidControls.start({ scaleY: 1, transition: { duration: 0.1 } });
        await new Promise(resolve => setTimeout(resolve, 100));
        if (!active) break;
        leftEyelidControls.start({ scaleY: 0, transition: { duration: 0.1 } });
        rightEyelidControls.start({ scaleY: 0, transition: { duration: 0.1 } });
      }
    };
    blink();
    return () => { active = false; };
  }, [leftEyelidControls, rightEyelidControls]);

  // Mouth and Expressions
  useEffect(() => {
    if (!analyser || state !== 'speaking') {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      
      if (state === 'listening') {
        // Big Smile
        mouthControls.start({ d: "M 165 225 Q 200 235 235 225 Q 200 245 165 225", transition: { duration: 0.3 } });
        leftEyebrowControls.start({ d: "M 135 125 Q 155 115 175 125", transition: { duration: 0.3 } });
        rightEyebrowControls.start({ d: "M 225 125 Q 245 115 265 125", transition: { duration: 0.3 } });
      } else if (state === 'thinking') {
        // Hmm
        mouthControls.start({ d: "M 170 230 Q 200 225 230 230 Q 200 230 170 230", transition: { duration: 0.3 } });
        leftEyebrowControls.start({ d: "M 135 135 Q 155 130 175 135", transition: { duration: 0.3 } });
        rightEyebrowControls.start({ d: "M 225 125 Q 245 115 265 125", transition: { duration: 0.3 } });
      } else {
        // Neutral / Slight smile
        mouthControls.start({ d: "M 165 225 Q 200 230 235 225 Q 200 230 165 225", transition: { duration: 0.3 } });
        leftEyebrowControls.start({ d: "M 135 130 Q 155 120 175 130", transition: { duration: 0.3 } });
        rightEyebrowControls.start({ d: "M 225 130 Q 245 120 265 130", transition: { duration: 0.3 } });
      }
      return;
    }

    // Speaking eyebrows
    leftEyebrowControls.start({ d: "M 135 128 Q 155 118 175 128", transition: { duration: 0.2 } });
    rightEyebrowControls.start({ d: "M 225 128 Q 245 118 265 128", transition: { duration: 0.2 } });

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const updateMouth = () => {
      analyser.getByteTimeDomainData(dataArray);
      
      // Calculate peak deviation from 128 (normalized volume between 0 and 1)
      let maxVal = 0;
      for (let i = 0; i < dataArray.length; i++) {
        const dev = Math.abs(dataArray[i] - 128);
        if (dev > maxVal) {
          maxVal = dev;
        }
      }
      
      const normalizedVolume = Math.min(1.0, maxVal / 128);
      const opening = normalizedVolume * 30;
      const widthOffset = normalizedVolume * 10;

      const topY = 225 - opening * 0.2;
      const bottomY = 225 + opening;
      const leftX = 165 - widthOffset;
      const rightX = 235 + widthOffset;

      const d = `M ${leftX} 225 Q 200 ${topY} ${rightX} 225 Q 200 ${bottomY} ${leftX} 225`;
      mouthControls.set({ d });
      
      requestRef.current = requestAnimationFrame(updateMouth);
    };

    requestRef.current = requestAnimationFrame(updateMouth);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [analyser, state, mouthControls, leftEyebrowControls, rightEyebrowControls]);

  const stateColors = {
    idle: '#3f3f46',
    listening: '#3b82f6',
    thinking: '#8b5cf6',
    speaking: '#10b981'
  };

  return (
    <motion.div 
      className="relative flex flex-col items-center justify-center cursor-pointer overflow-hidden rounded-2xl" 
      style={{ width: size, height: size, perspective: 1000 }}
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      {/* Background Aura */}
      <motion.div
        className="absolute inset-0 opacity-40 mix-blend-overlay"
        animate={{
          backgroundColor: stateColors[state],
        }}
        transition={{ duration: 1 }}
      />
      
      <motion.div
        style={{ 
          width: '100%', 
          height: '100%', 
          rotateX: useTransform(() => headRotateXMouse.get() + headRotateXScroll.get()), 
          rotateY: headRotateY,
          transformStyle: 'preserve-3d'
        }}
        className="relative z-10"
      >
        <svg viewBox="0 0 400 400" className="w-full h-full drop-shadow-2xl">
          <defs>
            <clipPath id="mouthClip">
              <motion.path d="M 165 225 Q 200 225 235 225 Q 200 225 165 225" animate={mouthControls} />
            </clipPath>
          </defs>

          {/* Background */}
          <rect width="400" height="400" fill="#88c0b7" />
          <polygon points="100,0 300,0 350,400 50,400" fill="#ffffff" opacity="0.1" />

          {/* Monitors */}
          <g opacity="0.9">
            {/* Left Monitor */}
            <rect x="20" y="180" width="170" height="110" rx="4" fill="#2a3b38" stroke="#1f2c2a" strokeWidth="2" />
            <rect x="30" y="190" width="150" height="90" fill="#1f2c2a" />
            <line x1="40" y1="200" x2="100" y2="200" stroke="#4ade80" strokeWidth="3" strokeLinecap="round" opacity="0.7"/>
            <line x1="40" y1="210" x2="140" y2="210" stroke="#4ade80" strokeWidth="3" strokeLinecap="round" opacity="0.7"/>
            <line x1="40" y1="220" x2="80" y2="220" stroke="#4ade80" strokeWidth="3" strokeLinecap="round" opacity="0.7"/>
            <line x1="50" y1="230" x2="120" y2="230" stroke="#4ade80" strokeWidth="3" strokeLinecap="round" opacity="0.7"/>
            <line x1="50" y1="240" x2="160" y2="240" stroke="#4ade80" strokeWidth="3" strokeLinecap="round" opacity="0.7"/>

            {/* Right Monitor */}
            <rect x="210" y="180" width="170" height="110" rx="4" fill="#2a3b38" stroke="#1f2c2a" strokeWidth="2" />
            <rect x="220" y="190" width="150" height="90" fill="#1f2c2a" />
            <line x1="230" y1="200" x2="300" y2="200" stroke="#4ade80" strokeWidth="3" strokeLinecap="round" opacity="0.7"/>
            <line x1="230" y1="210" x2="350" y2="210" stroke="#4ade80" strokeWidth="3" strokeLinecap="round" opacity="0.7"/>
            <line x1="230" y1="220" x2="280" y2="220" stroke="#4ade80" strokeWidth="3" strokeLinecap="round" opacity="0.7"/>
            <line x1="240" y1="230" x2="320" y2="230" stroke="#4ade80" strokeWidth="3" strokeLinecap="round" opacity="0.7"/>
          </g>

          {/* Desk */}
          <rect x="0" y="320" width="400" height="80" fill="#d4a373" opacity="0.8" />
          <rect x="350" y="330" width="30" height="15" rx="7.5" fill="#2c2f33" /> {/* Mouse */}

          {/* Body */}
          <g>
            {/* Shirt */}
            <path d="M 130 400 L 130 300 C 160 330, 240 330, 270 300 L 270 400 Z" fill="#3b7b9b" />
            {/* Circuit pattern on shirt */}
            <path d="M 150 400 L 150 360 L 160 350 M 180 400 L 180 370 L 170 360 M 220 400 L 220 350 L 230 340 M 250 400 L 250 370" fill="none" stroke="#88c0b7" strokeWidth="2" opacity="0.5" />
            <circle cx="160" cy="350" r="3" fill="#88c0b7" opacity="0.5" />
            <circle cx="170" cy="360" r="3" fill="#88c0b7" opacity="0.5" />
            <circle cx="230" cy="340" r="3" fill="#88c0b7" opacity="0.5" />
            <circle cx="250" cy="370" r="3" fill="#88c0b7" opacity="0.5" />

            {/* Hoodie */}
            <path d="M 40 400 C 40 320, 90 270, 140 270 L 140 300 C 110 320, 90 350, 90 400 Z" fill="#3a3e45" />
            <path d="M 360 400 C 360 320, 310 270, 260 270 L 260 300 C 290 320, 310 350, 310 400 Z" fill="#3a3e45" />
            {/* Hoodie strings */}
            <line x1="130" y1="310" x2="130" y2="380" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" />
            <line x1="270" y1="310" x2="270" y2="380" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" />

            {/* Headphones */}
            <path d="M 110 320 C 110 370, 290 370, 290 320" fill="none" stroke="#1a1c1e" strokeWidth="16" strokeLinecap="round" />
            <g transform="translate(110, 310) rotate(-15)">
              <rect x="-15" y="-30" width="30" height="60" rx="15" fill="#2c2f33" />
              <rect x="-5" y="-20" width="20" height="40" rx="10" fill="#1a1c1e" />
            </g>
            <g transform="translate(290, 310) rotate(15)">
              <rect x="-15" y="-30" width="30" height="60" rx="15" fill="#2c2f33" />
              <rect x="-15" y="-20" width="20" height="40" rx="10" fill="#1a1c1e" />
            </g>
          </g>

          {/* Head */}
          <g>
            {/* Neck */}
            <rect x="170" y="230" width="60" height="60" fill="#e0a88a" />
            <path d="M 170 250 C 190 270, 210 270, 230 250 L 230 230 L 170 230 Z" fill="#c99073" />

            {/* Ears */}
            <path d="M 120 160 C 100 160, 100 200, 120 210 Z" fill="#f5c7a9" />
            <path d="M 280 160 C 300 160, 300 200, 280 210 Z" fill="#f5c7a9" />

            {/* Face Base */}
            <rect x="120" y="100" width="160" height="150" rx="60" fill="#f5c7a9" />

            {/* Hair Back/Sides */}
            <path d="M 110 160 C 100 120, 110 80, 150 60 C 200 40, 250 40, 280 70 C 300 90, 300 130, 290 160 C 280 120, 260 90, 200 90 C 140 90, 120 120, 110 160 Z" fill="#2c2c2c" />
            
            {/* Hair Top */}
            <path d="M 120 100 C 110 60, 150 30, 200 30 C 250 30, 290 60, 280 100 C 290 70, 260 40, 200 40 C 140 40, 110 70, 120 100 Z" fill="#2c2c2c" />
            <path d="M 140 60 C 160 20, 220 20, 250 50 C 230 30, 180 30, 140 60 Z" fill="#2c2c2c" />
            <path d="M 170 40 C 190 10, 230 20, 240 40 C 220 20, 190 20, 170 40 Z" fill="#2c2c2c" />
            <path d="M 120 100 C 140 80, 180 80, 200 110 C 180 90, 140 90, 120 100 Z" fill="#2c2c2c" />
            <path d="M 200 110 C 220 80, 260 80, 280 100 C 260 90, 220 90, 200 110 Z" fill="#2c2c2c" />

            {/* Beard */}
            <path d="M 118 170 C 110 220, 130 270, 200 270 C 270 270, 290 220, 282 170 C 270 200, 240 210, 200 210 C 160 210, 130 200, 118 170 Z" fill="#2c2c2c" />
            
            {/* Mustache */}
            <path d="M 145 215 C 170 200, 230 200, 255 215 C 230 225, 170 225, 145 215 Z" fill="#2c2c2c" />
            
            {/* Nose */}
            <path d="M 200 160 L 200 190 C 200 200, 185 200, 185 190" fill="none" stroke="#e0a88a" strokeWidth="5" strokeLinecap="round" />

            {/* Eyes */}
            <g transform="translate(155, 155)">
              <circle cx="0" cy="0" r="7" fill="#2c2c2c" />
              <circle cx="2" cy="-2" r="2" fill="#ffffff" />
              <motion.rect x="-10" y="-10" width="20" height="20" fill="#f5c7a9" animate={leftEyelidControls} style={{ originY: 0 }} initial={{ scaleY: 0 }} />
            </g>
            <g transform="translate(245, 155)">
              <circle cx="0" cy="0" r="7" fill="#2c2c2c" />
              <circle cx="2" cy="-2" r="2" fill="#ffffff" />
              <motion.rect x="-10" y="-10" width="20" height="20" fill="#f5c7a9" animate={rightEyelidControls} style={{ originY: 0 }} initial={{ scaleY: 0 }} />
            </g>

            {/* Eyebrows */}
            <motion.path d="M 135 130 Q 155 120 175 130" fill="none" stroke="#2c2c2c" strokeWidth="8" strokeLinecap="round" animate={leftEyebrowControls} />
            <motion.path d="M 225 130 Q 245 120 265 130" fill="none" stroke="#2c2c2c" strokeWidth="8" strokeLinecap="round" animate={rightEyebrowControls} />

            {/* Glasses */}
            <circle cx="155" cy="155" r="32" fill="none" stroke="#2c2c2c" strokeWidth="8" />
            <circle cx="245" cy="155" r="32" fill="none" stroke="#2c2c2c" strokeWidth="8" />
            <path d="M 187 145 Q 200 135 213 145" fill="none" stroke="#2c2c2c" strokeWidth="8" strokeLinecap="round" />
            <line x1="123" y1="150" x2="110" y2="145" stroke="#2c2c2c" strokeWidth="8" strokeLinecap="round" />
            <line x1="277" y1="150" x2="290" y2="145" stroke="#2c2c2c" strokeWidth="8" strokeLinecap="round" />

            {/* Mouth (Animatable) */}
            <g clipPath="url(#mouthClip)">
              <motion.path d="M 165 225 Q 200 225 235 225 Q 200 225 165 225" fill="#4a1515" animate={mouthControls} />
              {/* Teeth */}
              <path d="M 170 225 Q 200 220 230 225 L 225 235 Q 200 235 175 235 Z" fill="#ffffff" />
              {/* Tongue */}
              <circle cx="200" cy="250" r="15" fill="#f87171" />
            </g>
            {/* Mouth Outline */}
            <motion.path d="M 165 225 Q 200 225 235 225 Q 200 225 165 225" fill="none" stroke="#2c2c2c" strokeWidth="3" strokeLinecap="round" animate={mouthControls} />
          </g>
        </svg>
      </motion.div>
    </motion.div>
  );
}
