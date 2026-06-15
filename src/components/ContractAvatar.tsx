import React, { useRef } from 'react';
import { AvatarState, StateColors } from '../lib/types';
import { useAvatarRuntime } from '../lib/useAvatarRuntime';

/**
 * Wraps any SVG implementing the layer contract (`#rra-*` hooks) and runs
 * the animation runtime over it. Used by the built-in contract presets
 * (geometric, …) and by `variant="byos"` where the children are the
 * developer's own SVG.
 */

export interface ContractAvatarProps {
  state: AvatarState;
  analyser: AnalyserNode | null;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  maxMouthOpening?: number;
  mouseTrackingIntensity?: number;
  blinkIntervalMin?: number;
  blinkIntervalMax?: number;
  blinkDuration?: number;
  stateColors?: StateColors;
  children: React.ReactNode;
}

export function ContractAvatar({
  state,
  analyser,
  size = 300,
  className = '',
  style,
  maxMouthOpening,
  mouseTrackingIntensity,
  blinkIntervalMin,
  blinkIntervalMax,
  blinkDuration,
  stateColors,
  children,
}: ContractAvatarProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useAvatarRuntime(containerRef, {
    state,
    analyser,
    stateColors,
    maxMouthOpening,
    mouseTrackingIntensity,
    blinkIntervalMin,
    blinkIntervalMax,
    blinkDuration,
  });

  return (
    <div
      ref={containerRef}
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: size, height: size, ...style }}
    >
      {children}
    </div>
  );
}
