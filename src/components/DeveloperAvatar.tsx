import React, { useEffect, useRef } from 'react';
import { motion, useAnimation, useMotionValue, useSpring, useTransform, useScroll } from 'motion/react';
import { AvatarProps, darkenColor } from './DefaultAvatar';

export function DeveloperAvatar({ 
  state, 
  analyser, 
  size = 200,
  className = '',
  style,
  maxMouthOpening = 30,
  blinkIntervalMin = 2000,
  blinkIntervalMax = 6000,
  blinkDuration = 100,
  mouseTrackingIntensity = 1.0,
  stateColors,
  customization
}: AvatarProps) {
  const mouthControls = useAnimation();
  const leftEyelidControls = useAnimation();
  const rightEyelidControls = useAnimation();
  const leftEyebrowControls = useAnimation();
  const rightEyebrowControls = useAnimation();
  const requestRef = useRef<number | null>(null);
  const currentEyelidTargetScaleYLeft = useRef(0);
  const currentEyelidTargetScaleYRight = useRef(0);

  // Gaze tracking
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const smoothX = useSpring(mouseX, { stiffness: 100, damping: 20 });
  const smoothY = useSpring(mouseY, { stiffness: 100, damping: 20 });
  
  const headRotateY = useTransform(smoothX, (v) => v * 10 * mouseTrackingIntensity);
  const headRotateXMouse = useTransform(smoothY, (v) => -v * 10 * mouseTrackingIntensity);

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
        await new Promise(resolve => setTimeout(resolve, Math.random() * (blinkIntervalMax - blinkIntervalMin) + blinkIntervalMin));
        if (!active) break;
        leftEyelidControls.start({ scaleY: 1, transition: { duration: blinkDuration / 1000 } });
        rightEyelidControls.start({ scaleY: 1, transition: { duration: blinkDuration / 1000 } });
        await new Promise(resolve => setTimeout(resolve, blinkDuration));
        if (!active) break;
        leftEyelidControls.start({ scaleY: currentEyelidTargetScaleYLeft.current, transition: { duration: blinkDuration / 1000 } });
        rightEyelidControls.start({ scaleY: currentEyelidTargetScaleYRight.current, transition: { duration: blinkDuration / 1000 } });
      }
    };
    blink();
    return () => { active = false; };
  }, [leftEyelidControls, rightEyelidControls, blinkIntervalMin, blinkIntervalMax, blinkDuration]);

  // Mouth and Expressions
  useEffect(() => {
    if (!analyser || state !== 'speaking') {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      
      currentEyelidTargetScaleYLeft.current = 0;
      currentEyelidTargetScaleYRight.current = 0;
      leftEyelidControls.start({ scaleY: 0, transition: { duration: 0.3 } });
      rightEyelidControls.start({ scaleY: 0, transition: { duration: 0.3 } });

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

    // Micro-expression logic
    const applyEmotion = (emo: string) => {
      if (emo === 'neutral') {
        leftEyebrowControls.start({ d: "M 135 128 Q 155 118 175 128", transition: { duration: 0.4 } });
        rightEyebrowControls.start({ d: "M 225 128 Q 245 118 265 128", transition: { duration: 0.4 } });
        currentEyelidTargetScaleYLeft.current = 0;
        currentEyelidTargetScaleYRight.current = 0;
      } else if (emo === 'surprised') {
        leftEyebrowControls.start({ d: "M 135 115 Q 155 95 175 115", transition: { duration: 0.4 } });
        rightEyebrowControls.start({ d: "M 225 115 Q 245 95 265 115", transition: { duration: 0.4 } });
        currentEyelidTargetScaleYLeft.current = -0.15;
        currentEyelidTargetScaleYRight.current = -0.15;
      } else if (emo === 'concerned') {
        leftEyebrowControls.start({ d: "M 135 133 Q 155 133 175 123", transition: { duration: 0.4 } });
        rightEyebrowControls.start({ d: "M 225 123 Q 245 133 265 133", transition: { duration: 0.4 } });
        currentEyelidTargetScaleYLeft.current = 0.25;
        currentEyelidTargetScaleYRight.current = 0.25;
      } else if (emo === 'skeptical') {
        leftEyebrowControls.start({ d: "M 135 118 Q 155 108 175 118", transition: { duration: 0.4 } });
        rightEyebrowControls.start({ d: "M 225 133 Q 245 128 265 133", transition: { duration: 0.4 } });
        currentEyelidTargetScaleYLeft.current = 0;
        currentEyelidTargetScaleYRight.current = 0.2;
      } else if (emo === 'happy') {
        leftEyebrowControls.start({ d: "M 135 124 Q 155 114 175 124", transition: { duration: 0.4 } });
        rightEyebrowControls.start({ d: "M 225 124 Q 245 114 265 124", transition: { duration: 0.4 } });
        currentEyelidTargetScaleYLeft.current = 0.15;
        currentEyelidTargetScaleYRight.current = 0.15;
      }
      leftEyelidControls.start({ scaleY: currentEyelidTargetScaleYLeft.current, transition: { duration: 0.4 } });
      rightEyelidControls.start({ scaleY: currentEyelidTargetScaleYRight.current, transition: { duration: 0.4 } });
    };

    // Initialize with neutral speaking expression
    applyEmotion('neutral');

    const triggerRandomEmotion = () => {
      const r = Math.random();
      if (r < 0.55) {
        applyEmotion('neutral');
      } else if (r < 0.70) {
        applyEmotion('surprised');
      } else if (r < 0.82) {
        applyEmotion('concerned');
      } else if (r < 0.91) {
        applyEmotion('skeptical');
      } else {
        applyEmotion('happy');
      }
    };

    const emotionInterval = setInterval(triggerRandomEmotion, 3500);

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

      const opening = normalizedVolume * maxMouthOpening * currentHeightMult;
      const widthOffset = normalizedVolume * 10 * currentWidthMult;

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
      if (emotionInterval) clearInterval(emotionInterval);
    };
  }, [analyser, state, mouthControls, leftEyebrowControls, rightEyebrowControls, leftEyelidControls, rightEyelidControls, maxMouthOpening]);

  const resolvedStateColors = {
    idle: stateColors?.idle ?? '#3f3f46',
    listening: stateColors?.listening ?? '#3b82f6',
    thinking: stateColors?.thinking ?? '#8b5cf6',
    speaking: stateColors?.speaking ?? '#10b981'
  };

  const skin = customization?.skinColor ?? '#f5c7a9';
  const skinShadow = darkenColor(skin, 10);
  const skinShadowDarker = darkenColor(skin, 20);
  const hair = customization?.hairColor ?? '#2c2c2c';
  const bg = customization?.bgColor ?? '#88c0b7';
  const clothing = customization?.clothingColor ?? '#3b7b9b';
  const hoodie = customization?.hoodieColor ?? '#3a3e45';
  const showGlasses = customization?.glasses ?? true;
  const glassesColor = customization?.glassesColor ?? '#2c2c2c';
  const showHeadphones = customization?.headphones ?? true;
  const headphonesColor = customization?.headphonesColor ?? '#3a3b40';

  return (
    <motion.div 
      className={`relative flex flex-col items-center justify-center cursor-pointer overflow-hidden rounded-2xl ${className}`} 
      style={{ width: size, height: size, perspective: 1000, ...style }}
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      {/* Background Aura */}
      <motion.div
        className="absolute inset-0 opacity-40 mix-blend-overlay"
        animate={{
          backgroundColor: resolvedStateColors[state],
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
            <radialGradient id="bgGrad" cx="50%" cy="40%" r="60%">
              <stop offset="0%" stopColor={bg} />
              <stop offset="100%" stopColor={darkenColor(bg, 15)} />
            </radialGradient>
            <linearGradient id="lightBeamGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.16" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Background */}
          <rect width="400" height="400" fill="url(#bgGrad)" />
          
          {/* Ceiling Lamp & Beam */}
          <polygon points="135,15 265,15 370,400 30,400" fill="url(#lightBeamGrad)" />
          <rect x="130" y="0" width="140" height="15" fill="#1e2528" rx="2" />
          <line x1="130" y1="15" x2="270" y2="15" stroke="#333d42" strokeWidth="2" />

          {/* Monitors */}
          <g opacity="0.9">
            {/* Left Monitor (tilted) */}
            <g transform="rotate(4 105 235)">
              <rect x="20" y="180" width="170" height="110" rx="4" fill="#2a3b38" stroke="#1f2c2a" strokeWidth="2" />
              <rect x="30" y="190" width="150" height="90" fill="#1f2c2a" />
              <line x1="40" y1="200" x2="100" y2="200" stroke="#4ade80" strokeWidth="3" strokeLinecap="round" opacity="0.7"/>
              <line x1="40" y1="210" x2="140" y2="210" stroke="#4ade80" strokeWidth="3" strokeLinecap="round" opacity="0.7"/>
              <line x1="40" y1="220" x2="80" y2="220" stroke="#4ade80" strokeWidth="3" strokeLinecap="round" opacity="0.7"/>
              <line x1="50" y1="230" x2="120" y2="230" stroke="#4ade80" strokeWidth="3" strokeLinecap="round" opacity="0.7"/>
              <line x1="50" y1="240" x2="160" y2="240" stroke="#4ade80" strokeWidth="3" strokeLinecap="round" opacity="0.7"/>
            </g>
 
            {/* Right Monitor (tilted) */}
            <g transform="rotate(-4 295 235)">
              <rect x="210" y="180" width="170" height="110" rx="4" fill="#2a3b38" stroke="#1f2c2a" strokeWidth="2" />
              <rect x="220" y="190" width="150" height="90" fill="#1f2c2a" />
              <line x1="230" y1="200" x2="300" y2="200" stroke="#4ade80" strokeWidth="3" strokeLinecap="round" opacity="0.7"/>
              <line x1="230" y1="210" x2="350" y2="210" stroke="#4ade80" strokeWidth="3" strokeLinecap="round" opacity="0.7"/>
              <line x1="230" y1="220" x2="280" y2="220" stroke="#4ade80" strokeWidth="3" strokeLinecap="round" opacity="0.7"/>
              <line x1="240" y1="230" x2="320" y2="230" stroke="#4ade80" strokeWidth="3" strokeLinecap="round" opacity="0.7"/>
            </g>
          </g>

          {/* Desk */}
          <rect x="0" y="320" width="400" height="80" fill="#d4a373" opacity="0.8" />
          <rect x="350" y="330" width="30" height="15" rx="7.5" fill="#2c2f33" /> {/* Mouse */}
 
          {/* Desk Plants (Cacti matching original illustration) */}
          {/* Left Plant */}
          <g>
            <path d="M 45 320 L 75 320 L 70 345 L 50 345 Z" fill="#b87355" opacity="0.9" />
            <rect x="55" y="275" width="10" height="45" rx="5" fill="#4d7c5a" />
            <path d="M 55 295 L 47 295 L 47 285" fill="none" stroke="#4d7c5a" strokeWidth="5" strokeLinecap="round" />
            <path d="M 65 290 L 73 290 L 73 280" fill="none" stroke="#4d7c5a" strokeWidth="5" strokeLinecap="round" />
          </g>
          {/* Right Plant */}
          <g>
            <path d="M 325 320 L 355 320 L 350 345 L 330 345 Z" fill="#b87355" opacity="0.9" />
            <rect x="335" y="275" width="10" height="45" rx="5" fill="#4d7c5a" />
            <path d="M 335 290 L 327 290 L 327 280" fill="none" stroke="#4d7c5a" strokeWidth="5" strokeLinecap="round" />
            <path d="M 345 295 L 353 295 L 353 285" fill="none" stroke="#4d7c5a" strokeWidth="5" strokeLinecap="round" />
          </g>

          {/* Body */}
          <g>
            {/* Shirt */}
            <path d="M 130 400 L 130 300 C 160 330, 240 330, 270 300 L 270 400 Z" fill={clothing} />
            
            {/* CPU chip */}
            <rect x="186" y="342" width="28" height="28" rx="4" fill={clothing} stroke={bg} strokeWidth="2" opacity="0.7" />
            <rect x="192" y="348" width="16" height="16" rx="2" fill="none" stroke={bg} strokeWidth="1.5" opacity="0.7" />
 
            {/* Circuit pattern on shirt */}
            <g stroke={bg} strokeWidth="2" opacity="0.5" fill="none">
              {/* CPU connection pins */}
              <line x1="186" y1="356" x2="175" y2="356" />
              <line x1="214" y1="356" x2="225" y2="356" />
              
              {/* Branching lines */}
              <path d="M 175 356 L 155 356 L 145 365 L 145 400" />
              <circle cx="155" cy="356" r="3.0" fill={bg} />
              
              <path d="M 175 356 L 165 365 L 165 400" />
              <circle cx="165" cy="365" r="3.0" fill={bg} />
              
              <path d="M 186 350 L 175 339" />
              <circle cx="175" cy="339" r="3.0" fill={bg} />
              
              <path d="M 214 350 L 225 339" />
              <circle cx="225" cy="339" r="3.0" fill={bg} />
              
              <path d="M 225 356 L 235 365 L 235 400" />
              <circle cx="235" cy="365" r="3.0" fill={bg} />
              
              <path d="M 225 356 L 245 356 L 255 365 L 255 400" />
              <circle cx="245" cy="356" r="3.0" fill={bg} />
            </g>

            {/* Hoodie */}
            <path d="M 40 400 C 40 320, 90 270, 140 270 L 140 300 C 110 320, 90 350, 90 400 Z" fill={hoodie} />
            <path d="M 360 400 C 360 320, 310 270, 260 270 L 260 300 C 290 320, 310 350, 310 400 Z" fill={hoodie} />
            {/* Hoodie strings */}
            <line x1="130" y1="310" x2="130" y2="380" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" />
            <line x1="270" y1="310" x2="270" y2="380" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" />

            {/* Headphones (Refined elliptical cushions) */}
            {showHeadphones && (
              <>
                <path d="M 110 285 C 110 335, 290 335, 290 285" fill="none" stroke="#1a1c1e" strokeWidth="16" strokeLinecap="round" />
                <g transform="translate(110, 275) rotate(-15)">
                  <ellipse cx="0" cy="0" rx="18" ry="28" fill={headphonesColor} />
                  <ellipse cx="0" cy="0" rx="12" ry="20" fill="#1a1c1e" />
                  <rect x="-4" y="-32" width="8" height="8" rx="2" fill="#1a1c1e" />
                </g>
                <g transform="translate(290, 275) rotate(15)">
                  <ellipse cx="0" cy="0" rx="18" ry="28" fill={headphonesColor} />
                  <ellipse cx="0" cy="0" rx="12" ry="20" fill="#1a1c1e" />
                  <rect x="-4" y="-32" width="8" height="8" rx="2" fill="#1a1c1e" />
                </g>
              </>
            )}
          </g>

          {/* Head */}
          <g>
            {/* Neck */}
            <rect x="170" y="230" width="60" height="60" fill={skinShadow} />
            <path d="M 170 250 C 190 270, 210 270, 230 250 L 230 230 L 170 230 Z" fill={skinShadowDarker} />

            {/* Ears */}
            <path d="M 120 160 C 100 160, 100 200, 120 210 Z" fill={skinShadow} />
            <path d="M 280 160 C 300 160, 300 200, 280 210 Z" fill={skinShadow} />

            {/* Face Base */}
            <rect x="120" y="100" width="160" height="150" rx="60" fill={skin} />

            {/* Hair Back/Sides */}
            <path d="M 110 160 C 100 120, 110 80, 150 60 C 200 40, 250 40, 280 70 C 300 90, 300 130, 290 160 C 280 120, 260 90, 200 90 C 140 90, 120 120, 110 160 Z" fill={hair} />
            
            {/* Hair Top */}
            <path d="M 120 100 C 110 60, 150 30, 200 30 C 250 30, 290 60, 280 100 C 290 70, 260 40, 200 40 C 140 40, 110 70, 120 100 Z" fill={hair} />
            <path d="M 140 60 C 160 20, 220 20, 250 50 C 230 30, 180 30, 140 60 Z" fill={hair} />
            <path d="M 170 40 C 190 10, 230 20, 240 40 C 220 20, 190 20, 170 40 Z" fill={hair} />
            <path d="M 120 100 C 140 80, 180 80, 200 110 C 180 90, 140 90, 120 100 Z" fill={hair} />
            <path d="M 200 110 C 220 80, 260 80, 280 100 C 260 90, 220 90, 200 110 Z" fill={hair} />
 
            {/* Hair Highlights (translucent white overlays for volume) */}
            <path d="M 140 70 C 160 50, 190 50, 210 65 Q 180 55, 140 70 Z" fill="#ffffff" opacity="0.08" />
            <path d="M 170 45 C 190 30, 220 30, 235 45 Q 200 35, 170 45 Z" fill="#ffffff" opacity="0.08" />
            <path d="M 210 80 Q 235 65 265 80 Q 240 70 210 80 Z" fill="#ffffff" opacity="0.08" />

            {/* Beard */}
            <path d="M 118 170 C 110 220, 130 270, 200 270 C 270 270, 290 220, 282 170 C 270 200, 240 210, 200 210 C 160 210, 130 200, 118 170 Z" fill={hair} />
            
            {/* Mustache */}
            <path d="M 145 215 C 170 200, 230 200, 255 215 C 230 225, 170 225, 145 215 Z" fill={hair} />
            
            {/* Nose */}
            <path d="M 200 160 L 200 190 C 200 200, 185 200, 185 190" fill="none" stroke={skinShadow} strokeWidth="5" strokeLinecap="round" />

            {/* Eyes */}
            <g transform="translate(155, 155)">
              <circle cx="0" cy="0" r="7" fill={hair} />
              <circle cx="2" cy="-2" r="2" fill="#ffffff" />
              <motion.rect x="-10" y="-10" width="20" height="20" fill={skin} animate={leftEyelidControls} style={{ originY: 0 }} initial={{ scaleY: 0 }} />
            </g>
            <g transform="translate(245, 155)">
              <circle cx="0" cy="0" r="7" fill={hair} />
              <circle cx="2" cy="-2" r="2" fill="#ffffff" />
              <motion.rect x="-10" y="-10" width="20" height="20" fill={skin} animate={rightEyelidControls} style={{ originY: 0 }} initial={{ scaleY: 0 }} />
            </g>

            {/* Eyebrows */}
            <motion.path d="M 135 130 Q 155 120 175 130" fill="none" stroke={hair} strokeWidth="8" strokeLinecap="round" animate={leftEyebrowControls} />
            <motion.path d="M 225 130 Q 245 120 265 130" fill="none" stroke={hair} strokeWidth="8" strokeLinecap="round" animate={rightEyebrowControls} />

            {/* Glasses (Thin round frames matching original PNG) */}
            {showGlasses && (
              <>
                <circle cx="155" cy="155" r="32" fill="none" stroke={glassesColor} strokeWidth="3.5" />
                <circle cx="245" cy="155" r="32" fill="none" stroke={glassesColor} strokeWidth="3.5" />
                <path d="M 187 145 Q 200 135 213 145" fill="none" stroke={glassesColor} strokeWidth="3" strokeLinecap="round" />
                <line x1="123" y1="150" x2="110" y2="145" stroke={glassesColor} strokeWidth="3" strokeLinecap="round" />
                <line x1="277" y1="150" x2="290" y2="145" stroke={glassesColor} strokeWidth="3" strokeLinecap="round" />
              </>
            )}

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
