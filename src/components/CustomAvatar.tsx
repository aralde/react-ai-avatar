import React, { useEffect, useRef } from 'react';
import { AvatarState } from '../hooks/useGeminiLive';
import avatarSvgRaw from '../../mi-av-5.svg?raw';

export interface CustomAvatarProps {
  state: AvatarState;
  analyser: AnalyserNode | null;
  size?: number;
}

type PathItem = {
  element: SVGPathElement;
  originalTransform: string;
  bbox: DOMRect | { x: number; y: number; width: number; height: number };
};

export function CustomAvatar({ state, analyser, size = 200 }: CustomAvatarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number | null>(null);

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
    const applyTransform = (item: PathItem, scaleY: number, originY: 'center' | 'top' | 'bottom' = 'center', translateY: number = 0) => {
      const cx = item.bbox.x + item.bbox.width / 2;
      let cy = item.bbox.y + item.bbox.height / 2;
      if (originY === 'top') cy = item.bbox.y;
      if (originY === 'bottom') cy = item.bbox.y + item.bbox.height;
      
      // We append the scale and translate transformation to the original transform
      item.element.setAttribute(
        'transform', 
        `${item.originalTransform} translate(${cx}, ${cy + translateY}) scale(1, ${scaleY}) translate(${-cx}, ${-cy})`
      );
    };

    // Blinking logic
    let isBlinking = true;
    const blink = async () => {
      while (isBlinking) {
        await new Promise(resolve => setTimeout(resolve, Math.random() * 4000 + 2000));
        if (!isBlinking) break;
        
        // Close eyes
        eyePaths.forEach(item => applyTransform(item, 0.1, 'center'));
        
        await new Promise(resolve => setTimeout(resolve, 150));
        if (!isBlinking) break;
        
        // Open eyes
        eyePaths.forEach(item => applyTransform(item, 1, 'center'));
      }
    };
    blink();

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
    animateHair();

    // Audio to Mouth Scale
    if (!analyser || state !== 'speaking') {
      mouthPaths.forEach(item => applyTransform(item, 1, 'center'));
      if (mouthBg) mouthBg.setAttribute('transform', mouthPaths[0]?.originalTransform || '');
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      return () => { isBlinking = false; };
    }

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    
    const updateMouth = () => {
      analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
      const average = sum / dataArray.length;
      
      // Calculate mouth opening based on volume
      const volume = average / 255;
      
      // Move lower lip down instead of just scaling
      const dropDownAmount = volume * 15; // Max drop 15px
      
      mouthPaths.forEach(item => {
        // We translate the lip down to reveal the dark background behind it
        applyTransform(item, 1, 'center', dropDownAmount);
      });
      
      // Scale the dark background to fill the gap
      if (mouthBg && mouthPaths.length > 0) {
        const bgItem = {
          element: mouthBg,
          originalTransform: mouthPaths[0].originalTransform,
          bbox: mouthPaths[0].bbox
        };
        // Scale the background vertically to fill the space left by the dropped lip
        applyTransform(bgItem, 1 + volume * 1.5, 'top');
      }
      
      requestRef.current = requestAnimationFrame(updateMouth);
    };
    
    updateMouth();
    
    return () => {
      isBlinking = false;
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [analyser, state]);

  return (
    <div 
      style={{ width: size, height: size, perspective: 1000 }}
      className="flex items-center justify-center drop-shadow-2xl"
    >
      <div 
        ref={containerRef}
        dangerouslySetInnerHTML={{ __html: avatarSvgRaw }}
        className="w-full h-full [&>svg]:w-full [&>svg]:h-full"
      />
    </div>
  );
}
