import React, { useEffect, useRef } from 'react';
import { motion, useAnimation, useMotionValue, useSpring, useTransform, useScroll } from 'motion/react';
import { AvatarProps } from './DefaultAvatar';

export function DeveloperAvatar2({ 
  state, 
  analyser, 
  size = 200,
  className = '',
  style,
  maxMouthOpening = 35,
  blinkIntervalMin = 2000,
  blinkIntervalMax = 6000,
  blinkDuration = 100,
  mouseTrackingIntensity = 1.0,
  stateColors
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
  
  const headRotateY = useTransform(smoothX, (v) => v * 8 * mouseTrackingIntensity);
  const headRotateXMouse = useTransform(smoothY, (v) => -v * 8 * mouseTrackingIntensity);
  const pupilX = useTransform(smoothX, (v) => v * 3 * mouseTrackingIntensity);
  const pupilY = useTransform(smoothY, (v) => v * 3 * mouseTrackingIntensity);

  // Scroll tracking
  const { scrollY } = useScroll();
  const headRotateXScroll = useTransform(scrollY, [0, 500], [0, -8]);

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
        mouthControls.start({ d: "M 160 215 Q 200 230 240 215 Q 200 250 160 215", transition: { duration: 0.3 } });
        leftEyebrowControls.start({ d: "M 135 115 Q 155 105 175 115", transition: { duration: 0.3 } });
        rightEyebrowControls.start({ d: "M 225 115 Q 245 105 265 115", transition: { duration: 0.3 } });
      } else if (state === 'thinking') {
        // Hmm
        mouthControls.start({ d: "M 165 220 Q 200 215 235 220 Q 200 225 165 220", transition: { duration: 0.3 } });
        leftEyebrowControls.start({ d: "M 135 125 Q 155 120 175 125", transition: { duration: 0.3 } });
        rightEyebrowControls.start({ d: "M 225 115 Q 245 105 265 115", transition: { duration: 0.3 } });
      } else {
        // Neutral / Slight smile
        mouthControls.start({ d: "M 160 215 Q 200 225 240 215 Q 200 235 160 215", transition: { duration: 0.3 } });
        leftEyebrowControls.start({ d: "M 135 120 Q 155 110 175 120", transition: { duration: 0.3 } });
        rightEyebrowControls.start({ d: "M 225 120 Q 245 110 265 120", transition: { duration: 0.3 } });
      }
      return;
    }

    // Micro-expression logic
    const applyEmotion = (emo: string) => {
      if (emo === 'neutral') {
        leftEyebrowControls.start({ d: "M 135 118 Q 155 108 175 118", transition: { duration: 0.4 } });
        rightEyebrowControls.start({ d: "M 225 118 Q 245 108 265 118", transition: { duration: 0.4 } });
        currentEyelidTargetScaleYLeft.current = 0;
        currentEyelidTargetScaleYRight.current = 0;
      } else if (emo === 'surprised') {
        leftEyebrowControls.start({ d: "M 135 105 Q 155 85 175 105", transition: { duration: 0.4 } });
        rightEyebrowControls.start({ d: "M 225 105 Q 245 85 265 105", transition: { duration: 0.4 } });
        currentEyelidTargetScaleYLeft.current = -0.15;
        currentEyelidTargetScaleYRight.current = -0.15;
      } else if (emo === 'concerned') {
        leftEyebrowControls.start({ d: "M 135 125 Q 155 125 175 115", transition: { duration: 0.4 } });
        rightEyebrowControls.start({ d: "M 225 115 Q 245 125 265 125", transition: { duration: 0.4 } });
        currentEyelidTargetScaleYLeft.current = 0.25;
        currentEyelidTargetScaleYRight.current = 0.25;
      } else if (emo === 'skeptical') {
        leftEyebrowControls.start({ d: "M 135 108 Q 155 98 175 108", transition: { duration: 0.4 } });
        rightEyebrowControls.start({ d: "M 225 125 Q 245 120 265 125", transition: { duration: 0.4 } });
        currentEyelidTargetScaleYLeft.current = 0;
        currentEyelidTargetScaleYRight.current = 0.2;
      } else if (emo === 'happy') {
        leftEyebrowControls.start({ d: "M 135 114 Q 155 104 175 114", transition: { duration: 0.4 } });
        rightEyebrowControls.start({ d: "M 225 114 Q 245 104 265 114", transition: { duration: 0.4 } });
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
      const widthOffset = normalizedVolume * 12 * currentWidthMult;

      const topY = 215 - opening * 0.15;
      const bottomY = 215 + opening;
      const leftX = 160 - widthOffset;
      const rightX = 240 + widthOffset;

      const d = `M ${leftX} 215 Q 200 ${topY} ${rightX} 215 Q 200 ${bottomY} ${leftX} 215`;
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

  // Colors extracted from the image
  const colors = {
    bg: '#8cbab4',
    monitorBg: '#2a3236',
    monitorScreen: '#1e2528',
    code: '#4ade80',
    desk: '#c28b65',
    hoodie: '#3a3b40',
    shirt: '#3a7ca5',
    skin: '#e8a885',
    skinShadow: '#d69471',
    hair: '#2d2b2c',
    glasses: '#262425',
    mouthDark: '#3a1c1c',
    teeth: '#ffffff',
    tongue: '#e06c6c'
  };

  return (
    <motion.div 
      className={`relative flex flex-col items-center justify-center cursor-pointer overflow-hidden rounded-2xl ${className}`} 
      style={{ width: size, height: size, perspective: 1000, ...style }}
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      {/* Background Aura */}
      <motion.div
        className="absolute inset-0 opacity-30 mix-blend-overlay"
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
            <clipPath id="mouthClip2">
              <motion.path d="M 160 215 Q 200 215 240 215 Q 200 215 160 215" animate={mouthControls} />
            </clipPath>
            <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity="0.15" />
            </filter>
          </defs>

          {/* Background */}
          <rect width="400" height="400" fill={colors.bg} />
          
          {/* Light rays */}
          <polygon points="150,0 250,0 350,400 50,400" fill="#ffffff" opacity="0.05" />

          {/* Monitors */}
          <g opacity="0.85">
            {/* Left Monitor */}
            <rect x="-20" y="170" width="200" height="120" rx="4" fill={colors.monitorBg} />
            <rect x="-10" y="180" width="180" height="100" fill={colors.monitorScreen} />
            <g opacity="0.6">
              <line x1="0" y1="190" x2="80" y2="190" stroke={colors.code} strokeWidth="2.5" strokeLinecap="round" />
              <line x1="0" y1="200" x2="120" y2="200" stroke={colors.code} strokeWidth="2.5" strokeLinecap="round" />
              <line x1="0" y1="210" x2="60" y2="210" stroke={colors.code} strokeWidth="2.5" strokeLinecap="round" />
              <line x1="10" y1="220" x2="100" y2="220" stroke={colors.code} strokeWidth="2.5" strokeLinecap="round" />
              <line x1="10" y1="230" x2="140" y2="230" stroke={colors.code} strokeWidth="2.5" strokeLinecap="round" />
              <line x1="10" y1="240" x2="90" y2="240" stroke={colors.code} strokeWidth="2.5" strokeLinecap="round" />
              <line x1="0" y1="250" x2="110" y2="250" stroke={colors.code} strokeWidth="2.5" strokeLinecap="round" />
              <line x1="0" y1="260" x2="70" y2="260" stroke={colors.code} strokeWidth="2.5" strokeLinecap="round" />
            </g>

            {/* Right Monitor */}
            <rect x="220" y="170" width="200" height="120" rx="4" fill={colors.monitorBg} />
            <rect x="230" y="180" width="180" height="100" fill={colors.monitorScreen} />
            <g opacity="0.6">
              <line x1="240" y1="190" x2="320" y2="190" stroke={colors.code} strokeWidth="2.5" strokeLinecap="round" />
              <line x1="240" y1="200" x2="360" y2="200" stroke={colors.code} strokeWidth="2.5" strokeLinecap="round" />
              <line x1="240" y1="210" x2="290" y2="210" stroke={colors.code} strokeWidth="2.5" strokeLinecap="round" />
              <line x1="250" y1="220" x2="340" y2="220" stroke={colors.code} strokeWidth="2.5" strokeLinecap="round" />
              <line x1="250" y1="230" x2="310" y2="230" stroke={colors.code} strokeWidth="2.5" strokeLinecap="round" />
            </g>
          </g>

          {/* Desk */}
          <rect x="0" y="320" width="400" height="80" fill={colors.desk} />
          <rect x="360" y="330" width="25" height="12" rx="6" fill="#2c2f33" /> {/* Mouse */}

          {/* Body */}
          <g>
            {/* Shirt */}
            <path d="M 120 400 L 120 290 C 160 320, 240 320, 280 290 L 280 400 Z" fill={colors.shirt} />
            {/* Circuit pattern on shirt */}
            <g stroke="#8cbab4" strokeWidth="2" opacity="0.6" fill="none">
              <path d="M 145 400 L 145 365 L 155 355" />
              <circle cx="155" cy="355" r="2.5" fill="#8cbab4" />
              
              <path d="M 165 400 L 165 375 L 175 365" />
              <circle cx="175" cy="365" r="2.5" fill="#8cbab4" />
              
              <path d="M 185 400 L 185 350 L 195 340" />
              <circle cx="195" cy="340" r="2.5" fill="#8cbab4" />
              
              <path d="M 215 400 L 215 360 L 205 350" />
              <circle cx="205" cy="350" r="2.5" fill="#8cbab4" />
              
              <path d="M 235 400 L 235 380 L 225 370" />
              <circle cx="225" cy="370" r="2.5" fill="#8cbab4" />
              
              <path d="M 255 400 L 255 365 L 245 355" />
              <circle cx="245" cy="355" r="2.5" fill="#8cbab4" />
            </g>

            {/* Hoodie */}
            <path d="M 30 400 C 30 310, 80 260, 140 260 L 140 290 C 100 310, 80 340, 80 400 Z" fill={colors.hoodie} />
            <path d="M 370 400 C 370 310, 320 260, 260 260 L 260 290 C 300 310, 320 340, 320 400 Z" fill={colors.hoodie} />
            {/* Hoodie inner shadow/collar */}
            <path d="M 140 260 C 160 290, 240 290, 260 260 L 280 290 C 240 330, 160 330, 120 290 Z" fill="#2d2e32" />
            
            {/* Hoodie strings */}
            <line x1="115" y1="320" x2="115" y2="400" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />
            <line x1="285" y1="320" x2="285" y2="400" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />

            {/* Headphones */}
            <path d="M 100 310 C 100 370, 300 370, 300 310" fill="none" stroke="#262425" strokeWidth="18" strokeLinecap="round" />
            <g transform="translate(100, 300) rotate(-15)">
              <rect x="-20" y="-35" width="40" height="70" rx="20" fill="#3a3b40" />
              <rect x="-10" y="-25" width="30" height="50" rx="15" fill="#1e1f22" />
            </g>
            <g transform="translate(300, 300) rotate(15)">
              <rect x="-20" y="-35" width="40" height="70" rx="20" fill="#3a3b40" />
              <rect x="-20" y="-25" width="30" height="50" rx="15" fill="#1e1f22" />
            </g>
            {/* Headphone wire */}
            <path d="M 215 365 Q 210 380 200 400" fill="none" stroke="#1e1f22" strokeWidth="2" />
          </g>

          {/* Head */}
          <g>
            {/* Neck */}
            <rect x="165" y="220" width="70" height="60" fill={colors.skinShadow} />
            <path d="M 165 240 C 185 260, 215 260, 235 240 L 235 220 L 165 220 Z" fill={colors.skin} />

            {/* Ears */}
            <path d="M 120 145 C 105 145, 105 185, 125 195 Z" fill={colors.skinShadow} />
            <path d="M 280 145 C 295 145, 295 185, 275 195 Z" fill={colors.skinShadow} />
            {/* Inner ear details */}
            <path d="M 115 160 Q 120 170 115 180" fill="none" stroke="#c98a6b" strokeWidth="2" strokeLinecap="round" />
            <path d="M 285 160 Q 280 170 285 180" fill="none" stroke="#c98a6b" strokeWidth="2" strokeLinecap="round" />

            {/* Face Base */}
            <path d="M 125 130 C 125 240, 150 260, 200 260 C 250 260, 275 240, 275 130 C 275 80, 250 60, 200 60 C 150 60, 125 80, 125 130 Z" fill={colors.skin} />

            {/* Hair Back/Volume */}
            <path d="M 115 150 C 100 100, 120 50, 170 30 C 220 10, 270 30, 290 70 C 310 110, 290 150, 285 150 C 295 120, 270 70, 200 60 C 130 50, 110 100, 115 150 Z" fill={colors.hair} />
            
            {/* Hair Front/Bangs (Detailed swoops) */}
            <path d="M 120 130 C 110 80, 140 40, 200 40 C 260 40, 290 80, 280 130 C 285 100, 260 60, 200 60 C 140 60, 115 100, 120 130 Z" fill={colors.hair} />
            <path d="M 130 80 C 160 40, 220 40, 250 70 C 230 40, 180 40, 130 80 Z" fill={colors.hair} />
            <path d="M 160 50 C 190 20, 240 30, 250 60 C 230 30, 190 30, 160 50 Z" fill={colors.hair} />
            <path d="M 125 110 C 145 80, 180 80, 200 100 C 180 85, 145 90, 125 110 Z" fill={colors.hair} />
            <path d="M 190 100 C 220 75, 260 80, 275 110 C 255 90, 220 85, 190 100 Z" fill={colors.hair} />
            {/* Extra messy strands */}
            <path d="M 170 35 Q 180 20 195 30" fill="none" stroke={colors.hair} strokeWidth="6" strokeLinecap="round" />
            <path d="M 220 35 Q 240 20 255 40" fill="none" stroke={colors.hair} strokeWidth="5" strokeLinecap="round" />
            <path d="M 115 90 Q 100 110 115 130" fill="none" stroke={colors.hair} strokeWidth="5" strokeLinecap="round" />

            {/* Beard Base */}
            <path d="M 123 150 C 120 200, 130 265, 200 265 C 270 265, 280 200, 277 150 C 270 180, 250 200, 200 200 C 150 200, 130 180, 123 150 Z" fill={colors.hair} />
            
            {/* Mustache */}
            <path d="M 145 205 C 170 190, 230 190, 255 205 C 235 215, 165 215, 145 205 Z" fill={colors.hair} />
            
            {/* Soul Patch */}
            <path d="M 190 245 Q 200 255 210 245 Z" fill={colors.hair} />

            {/* Nose */}
            <path d="M 200 150 L 200 185 C 200 195, 185 195, 185 185" fill="none" stroke={colors.skinShadow} strokeWidth="4" strokeLinecap="round" />

            {/* Eyes */}
            <g transform="translate(160, 145)">
              {/* Sclera */}
              <path d="M -15 0 Q 0 -12 15 0 Q 0 12 -15 0" fill="#ffffff" />
              {/* Iris & Pupil */}
              <motion.g style={{ x: pupilX, y: pupilY }}>
                <circle cx="0" cy="0" r="6" fill="#4a3022" />
                <circle cx="0" cy="0" r="3" fill="#1a110c" />
                <circle cx="2" cy="-2" r="1.5" fill="#ffffff" />
              </motion.g>
              {/* Eyelid for blinking */}
              <motion.path 
                d="M -16 -12 L 16 -12 L 16 2 Q 0 14 -16 2 Z" 
                fill={colors.skin} 
                animate={leftEyelidControls} 
                style={{ originY: 0 }} 
                initial={{ scaleY: 0 }} 
              />
            </g>
            <g transform="translate(240, 145)">
              {/* Sclera */}
              <path d="M -15 0 Q 0 -12 15 0 Q 0 12 -15 0" fill="#ffffff" />
              {/* Iris & Pupil */}
              <motion.g style={{ x: pupilX, y: pupilY }}>
                <circle cx="0" cy="0" r="6" fill="#4a3022" />
                <circle cx="0" cy="0" r="3" fill="#1a110c" />
                <circle cx="2" cy="-2" r="1.5" fill="#ffffff" />
              </motion.g>
              {/* Eyelid for blinking */}
              <motion.path 
                d="M -16 -12 L 16 -12 L 16 2 Q 0 14 -16 2 Z" 
                fill={colors.skin} 
                animate={rightEyelidControls} 
                style={{ originY: 0 }} 
                initial={{ scaleY: 0 }} 
              />
            </g>

            {/* Eyebrows */}
            <motion.path d="M 135 120 Q 155 110 175 120" fill="none" stroke={colors.hair} strokeWidth="8" strokeLinecap="round" animate={leftEyebrowControls} />
            <motion.path d="M 225 120 Q 245 110 265 120" fill="none" stroke={colors.hair} strokeWidth="8" strokeLinecap="round" animate={rightEyebrowControls} />

            {/* Glasses (Thick round frames) */}
            <circle cx="160" cy="145" r="30" fill="none" stroke={colors.glasses} strokeWidth="7" />
            <circle cx="240" cy="145" r="30" fill="none" stroke={colors.glasses} strokeWidth="7" />
            {/* Bridge */}
            <path d="M 190 135 Q 200 130 210 135" fill="none" stroke={colors.glasses} strokeWidth="6" strokeLinecap="round" />
            {/* Arms */}
            <line x1="130" y1="140" x2="115" y2="135" stroke={colors.glasses} strokeWidth="6" strokeLinecap="round" />
            <line x1="270" y1="140" x2="285" y2="135" stroke={colors.glasses} strokeWidth="6" strokeLinecap="round" />

            {/* Mouth (Animatable) */}
            <g clipPath="url(#mouthClip2)">
              <motion.path d="M 160 215 Q 200 215 240 215 Q 200 215 160 215" fill={colors.mouthDark} animate={mouthControls} />
              {/* Teeth */}
              <path d="M 165 215 Q 200 210 235 215 L 230 225 Q 200 230 170 225 Z" fill={colors.teeth} />
              {/* Tongue */}
              <circle cx="200" cy="245" r="15" fill={colors.tongue} />
            </g>
            {/* Mouth Outline/Smile lines */}
            <motion.path d="M 160 215 Q 200 215 240 215 Q 200 215 160 215" fill="none" stroke={colors.mouthDark} strokeWidth="2" strokeLinecap="round" animate={mouthControls} />
            {/* Smile creases */}
            <path d="M 150 205 Q 145 215 155 225" fill="none" stroke={colors.skinShadow} strokeWidth="2" strokeLinecap="round" />
            <path d="M 250 205 Q 255 215 245 225" fill="none" stroke={colors.skinShadow} strokeWidth="2" strokeLinecap="round" />
          </g>
        </svg>
      </motion.div>
    </motion.div>
  );
}
