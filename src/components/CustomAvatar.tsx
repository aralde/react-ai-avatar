import React, { useEffect, useRef } from 'react';
import { AvatarState } from '../lib/types';
import { createMouthEngine } from '../lib/mouthEngine';
import { useReducedMotion } from '../lib/useReducedMotion';
import { AvatarCustomization, darkenColor } from './DefaultAvatar';
import avatarSvgRaw from '../../mi-av-5.svg?raw';

export interface CustomAvatarProps {
  state: AvatarState;
  analyser: AnalyserNode | null;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  maxMouthOpening?: number;
  blinkIntervalMin?: number;
  blinkIntervalMax?: number;
  blinkDuration?: number;
  stateColors?: {
    idle?: string;
    listening?: string;
    thinking?: string;
    speaking?: string;
  };
  customization?: AvatarCustomization;
}

type PathItem = {
  element: SVGPathElement;
  originalTransform: string;
  bbox: DOMRect | { x: number; y: number; width: number; height: number };
};

export function CustomAvatar({ 
  state, 
  analyser, 
  size = 200,
  className = '',
  style,
  maxMouthOpening = 15,
  blinkIntervalMin = 2000,
  blinkIntervalMax = 6000,
  blinkDuration = 100,
  customization
}: CustomAvatarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number | null>(null);
  const reducedMotion = useReducedMotion();

  const svgHtml = React.useMemo(() => {
    return { __html: avatarSvgRaw };
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    
    const svg = containerRef.current.querySelector('svg');
    if (svg) {
      // Ensure SVG has viewBox for proper scaling
      if (!svg.getAttribute('viewBox')) {
        svg.setAttribute('viewBox', '0 0 334 400');
      }
    }

    const paths = Array.from(containerRef.current.querySelectorAll('path')) as SVGPathElement[];
    
    // Apply dynamic cosmetic customization if customization prop is provided
    if (customization) {
      const skinColors = ['#F5C7A9', '#E8A885', '#D69471', '#C98A6B']; // Skin tones used in SVG
      const hairColors = ['#243152', '#1C2740', '#1D2841'];          // Hair tones used in SVG
      
      paths.forEach(p => {
        const fill = p.getAttribute('fill');
        if (fill) {
          const upperFill = fill.toUpperCase();
          if (skinColors.includes(upperFill)) {
            if (upperFill === '#F5C7A9') {
              p.setAttribute('fill', customization.skinColor);
            } else {
              p.setAttribute('fill', darkenColor(customization.skinColor, 10));
            }
          } else if (hairColors.includes(upperFill)) {
            p.setAttribute('fill', customization.hairColor);
          }
        }
      });
    }
    
    // Find mouth paths based on fill colors and position
    // We only want the bottom lip to move down to reveal the dark background
    const mouthColors = ['#AB3611', '#BD5727', '#D65F2D', '#BA4B21'];
    const mouthPaths: PathItem[] = paths.filter(p => {
      const fill = p.getAttribute('fill');
      const transform = p.getAttribute('transform') || '';
      const isMouthColor = fill && mouthColors.includes(fill.toUpperCase());
      
      const match = transform.match(/translate\(([^,]+),\s*([0-9.]+)\)/);
      const yPos = match ? parseFloat(match[2]) : 0;
      
      // The mouth is translated to roughly y=203 to y=232
      // We specifically exclude the nose which is around y=190-200
      return isMouthColor && yPos > 210 && yPos < 250;
    }).map(p => {
      let bbox = { x: 0, y: 0, width: 0, height: 0 };
      try { bbox = p.getBBox(); } catch(e) {}
      return {
        element: p,
        originalTransform: p.getAttribute('transform') || '',
        bbox
      };
    });

    // Create a dark background for the mouth if it doesn't exist
    let mouthBg = containerRef.current.querySelector('#mouth-bg') as SVGPathElement;
    if (!mouthBg && mouthPaths.length > 0) {
      const firstMouthPart = mouthPaths[0].element;
      mouthBg = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      mouthBg.setAttribute('id', 'mouth-bg');
      mouthBg.setAttribute('fill', '#1A0B0C'); // Dark red/black color for inside mouth
      mouthBg.setAttribute('d', firstMouthPart.getAttribute('d') || '');
      mouthBg.setAttribute('transform', firstMouthPart.getAttribute('transform') || '');
      // Insert it right before the first mouth part so it sits behind it
      firstMouthPart.parentNode?.insertBefore(mouthBg, firstMouthPart);
    }

    // Find eye paths based on colors and position
    const eyeColors = ['#277BC4', '#246AA9', '#141518', '#FFFFFF', '#0B0F14', '#151618'];
    const eyePaths: PathItem[] = paths.filter(p => {
      const fill = p.getAttribute('fill');
      const transform = p.getAttribute('transform') || '';
      const isEyeColor = fill && eyeColors.includes(fill.toUpperCase());
      
      const match = transform.match(/translate\(([^,]+),\s*([0-9.]+)\)/);
      const yPos = match ? parseFloat(match[2]) : 0;
      
      return isEyeColor && yPos > 150 && yPos < 180;
    }).map(p => {
      let bbox = { x: 0, y: 0, width: 0, height: 0 };
      try { bbox = p.getBBox(); } catch(e) {}
      return {
        element: p,
        originalTransform: p.getAttribute('transform') || '',
        bbox
      };
    });

    // Find hair paths
    const hairColors = ['#243152', '#1C2740', '#1D2841'];
    const hairPaths: PathItem[] = paths.filter(p => {
      const fill = p.getAttribute('fill');
      const transform = p.getAttribute('transform') || '';
      const isHairColor = fill && hairColors.includes(fill.toUpperCase());
      
      const match = transform.match(/translate\(([^,]+),\s*([0-9.]+)\)/);
      const yPos = match ? parseFloat(match[2]) : 0;
      
      // Hair is mostly in the upper section
      return isHairColor && yPos < 150;
    }).map(p => {
      let bbox = { x: 0, y: 0, width: 0, height: 0 };
      try { bbox = p.getBBox(); } catch(e) {}
      return {
        element: p,
        originalTransform: p.getAttribute('transform') || '',
        bbox
      };
    });

    // Helper to apply SVG transform mathematically
    const applyTransform = (item: PathItem, scaleY: number, originY: 'center' | 'top' | 'bottom' = 'center', translateY: number = 0, scaleX: number = 1) => {
      const match = item.originalTransform.match(/translate\(([^,]+),\s*([0-9.]+)\)/);
      if (match) {
        const tx = parseFloat(match[1]);
        const ty = parseFloat(match[2]);
        item.element.setAttribute(
          'transform', 
          `translate(${tx}, ${ty + translateY}) scale(${scaleX}, ${scaleY})`
        );
      } else {
        item.element.setAttribute(
          'transform', 
          `${item.originalTransform} scale(${scaleX}, ${scaleY}) translate(0, ${translateY})`
        );
      }
    };

    let targetEyeScaleY = 1.0;

    // Blinking logic (skipped under prefers-reduced-motion; the flag also
    // doubles as the "loops active" guard for hair animation)
    let isBlinking = true;
    const blink = async () => {
      while (isBlinking) {
        await new Promise(resolve => setTimeout(resolve, Math.random() * (blinkIntervalMax - blinkIntervalMin) + blinkIntervalMin));
        if (!isBlinking) break;
        
        // Close eyes
        eyePaths.forEach(item => applyTransform(item, 0.1, 'center'));
        
        await new Promise(resolve => setTimeout(resolve, blinkDuration));
        if (!isBlinking) break;
        
        // Open eyes to active emotional scale
        eyePaths.forEach(item => applyTransform(item, targetEyeScaleY, 'center'));
      }
    };
    if (!reducedMotion) blink();

    // Idle Hair Animation
    let hairTime = 0;
    const animateHair = () => {
      if (!isBlinking) return;
      hairTime += 0.05;
      
      // Gentle floating motion for hair
      const hairScale = 1 + Math.sin(hairTime) * 0.02;
      const hairTranslateY = Math.sin(hairTime * 1.5) * 2;
      
      hairPaths.forEach(item => {
        applyTransform(item, hairScale, 'bottom', hairTranslateY);
      });
      
      if (isBlinking) {
        requestAnimationFrame(animateHair);
      }
    };
    if (!reducedMotion) animateHair();

    // Emotion interval timer (Option A: randomized eye micro-expressions)
    let emotionInterval: NodeJS.Timeout | null = null;
    if (state === 'speaking' && !reducedMotion) {
      emotionInterval = setInterval(() => {
        const r = Math.random();
        if (r < 0.55) {
          targetEyeScaleY = 1.0; // neutral
        } else if (r < 0.70) {
          targetEyeScaleY = 1.25; // surprised
        } else if (r < 0.85) {
          targetEyeScaleY = 0.75; // concerned / squinted
        } else {
          targetEyeScaleY = 0.85; // happy squint
        }
        // Apply immediately to eyes (if not blinking)
        eyePaths.forEach(item => applyTransform(item, targetEyeScaleY, 'center'));
      }, 3500);
    }

    // Audio-reactive mouth (procedural fallback when analyser is null)
    if (state !== 'speaking') {
      mouthPaths.forEach(item => applyTransform(item, 1, 'center'));
      if (mouthBg) mouthBg.setAttribute('transform', mouthPaths[0]?.originalTransform || '');
      eyePaths.forEach(item => applyTransform(item, 1, 'center')); // Reset eye scale
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      return () => {
        isBlinking = false;
        if (emotionInterval) clearInterval(emotionInterval);
      };
    }

    const engine = createMouthEngine(analyser);

    let currentWidthMult = 1.0;
    let currentHeightMult = 1.0;

    const updateMouth = () => {
      const frame = engine.read();
      const volume = frame.level;

      let targetWidthMult = 1.0;
      let targetHeightMult = 1.0;
      if (frame.shape === 'e') {
        // "E" viseme (Smile / Stretch)
        targetWidthMult = 1.35;
        targetHeightMult = 0.6;
      } else if (frame.shape === 'o') {
        // "O" viseme (Round / Narrow)
        targetWidthMult = 0.7;
        targetHeightMult = 1.3;
      }

      currentWidthMult += (targetWidthMult - currentWidthMult) * 0.25;
      currentHeightMult += (targetHeightMult - currentHeightMult) * 0.25;

      // Move lower lip down instead of just scaling, and scale width by currentWidthMult
      const dropDownAmount = volume * maxMouthOpening * currentHeightMult;
      
      mouthPaths.forEach(item => {
        // Translate lip down and stretch horizontally
        applyTransform(item, 1, 'center', dropDownAmount, currentWidthMult);
      });
      
      // Scale the dark background to fill the gap
      if (mouthBg && mouthPaths.length > 0) {
        const bgItem = {
          element: mouthBg,
          originalTransform: mouthPaths[0].originalTransform,
          bbox: mouthPaths[0].bbox
        };
        // Scale the background vertically and horizontally
        applyTransform(bgItem, 1 + volume * 1.5 * currentHeightMult, 'top', 0, currentWidthMult);
      }
      
      requestRef.current = requestAnimationFrame(updateMouth);
    };
    
    updateMouth();
    
    return () => {
      isBlinking = false;
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (emotionInterval) clearInterval(emotionInterval);
    };
  }, [analyser, state, maxMouthOpening, blinkIntervalMin, blinkIntervalMax, blinkDuration, reducedMotion]);

  return (
    <div 
      style={{ width: size, height: size, perspective: 1000, ...style }}
      className={`flex items-center justify-center drop-shadow-2xl ${className}`}
    >
      <div 
        ref={containerRef}
        dangerouslySetInnerHTML={svgHtml}
        className="w-full h-full [&>svg]:w-full [&>svg]:h-full"
      />
    </div>
  );
}
