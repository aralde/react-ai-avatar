import React, { useEffect, useMemo, useRef } from 'react';
import type { AvatarState, StateColors } from '../lib/types';
import { createMouthEngine, type MouthSource } from '../lib/mouthEngine';
import { useAvatarState } from '../lib/avatarState';
import { useReducedMotion } from '../lib/useReducedMotion';
import { DEFAULT_STATE_COLORS } from '../lib/stateDefaults';

/**
 * OrbAvatar — the voice-assistant "orb": a glossy sphere instead of a face.
 * It breathes while idle, swirls while thinking, spins a ring while working
 * and swells with the voice while speaking. Same drivers as the faces
 * (`analyser`, `speechActivity`), and the state color tints it.
 *
 * Use it on its own, or as `<RealtimeAvatar variant="orb" />` to get the pill,
 * bubbles and subtitles around it.
 */
export interface OrbAvatarProps {
  /** Defaults to the enclosing avatar's state, else `'idle'`. */
  state?: AvatarState;
  /** Mouth source: AnalyserNode (audio), SpeechActivitySource (text), or null. */
  analyser?: MouthSource;
  /** Width/height. Defaults to `'100%'` so it fills its (sized) container. */
  size?: number | string;
  stateColors?: StateColors;
  className?: string;
  style?: React.CSSProperties;
}

/** Swirl speed in degrees per second, per state. */
const SPIN: Record<AvatarState, number> = {
  idle: 12,
  listening: 24,
  thinking: 140,
  speaking: 40,
  working: 60,
};

/** How much the orb swells with the voice, per state. */
const REACT: Record<AvatarState, number> = {
  idle: 0,
  listening: 0.06,
  thinking: 0,
  speaking: 0.16,
  working: 0,
};

const SWIRL =
  'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.55), transparent 45%),' +
  'radial-gradient(circle at 72% 64%, rgba(255,255,255,0.28), transparent 40%),' +
  'radial-gradient(circle at 40% 80%, rgba(0,0,0,0.28), transparent 50%)';

const SHINE =
  'radial-gradient(circle at 34% 26%, rgba(255,255,255,0.7), rgba(255,255,255,0) 32%),' +
  'radial-gradient(circle at 50% 50%, rgba(255,255,255,0) 58%, rgba(0,0,0,0.25) 100%)';

export function OrbAvatar({
  state: ownState,
  analyser = null,
  size = '100%',
  stateColors,
  className = '',
  style,
}: OrbAvatarProps) {
  const state = useAvatarState(ownState);
  const reducedMotion = useReducedMotion();
  const bodyRef = useRef<HTMLDivElement>(null);
  const swirlRef = useRef<HTMLDivElement>(null);
  const engine = useMemo(() => createMouthEngine(analyser), [analyser]);
  const color = stateColors?.[state] ?? DEFAULT_STATE_COLORS[state];

  useEffect(() => {
    const body = bodyRef.current;
    const swirl = swirlRef.current;
    if (!body || !swirl) return;
    if (reducedMotion) {
      body.style.transform = 'scale(1)';
      swirl.style.transform = 'rotate(0deg)';
      return;
    }

    let raf = 0;
    let angle = 0;
    let level = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      // Without an analyser the engine synthesizes speech, which only fits `speaking`.
      const reacts = state === 'speaking' || (state === 'listening' && analyser !== null);
      const target = reacts ? engine.read().level : 0;
      // Ease toward the voice level so the swell reads as breath, not jitter.
      level += (target - level) * Math.min(1, dt * 12);
      const breath = state === 'idle' ? Math.sin(now / 900) * 0.02 : 0;
      const busy = state === 'thinking' ? Math.sin(now / 160) * 0.015 : 0;
      angle = (angle + SPIN[state] * dt) % 360;
      body.style.transform = `scale(${1 + breath + busy + level * REACT[state]})`;
      swirl.style.transform = `rotate(${angle}deg)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [state, engine, analyser, reducedMotion]);

  return (
    <div
      data-orb=""
      data-state={state}
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: size, height: size, ...style }}
    >
      {state === 'working' && (
        <div
          data-orb-ring=""
          aria-hidden="true"
          className={`absolute rounded-full ${reducedMotion ? '' : 'animate-spin'}`}
          style={{
            inset: '3%',
            background: `conic-gradient(from 0deg, transparent 0 65%, ${color} 100%)`,
            mask: 'radial-gradient(circle, transparent 63%, #000 64%)',
            WebkitMask: 'radial-gradient(circle, transparent 63%, #000 64%)',
            animationDuration: '1.4s',
          }}
        />
      )}
      <div
        ref={bodyRef}
        data-orb-body=""
        className="rra-glow relative rounded-full overflow-hidden"
        style={{
          width: '80%',
          height: '80%',
          backgroundColor: color,
          boxShadow: `0 0 40px -6px ${color}`,
        }}
      >
        <div
          ref={swirlRef}
          aria-hidden="true"
          className="absolute rounded-full"
          style={{ inset: '-15%', background: SWIRL, filter: 'blur(6px)' }}
        />
        <div aria-hidden="true" className="absolute inset-0 rounded-full" style={{ background: SHINE }} />
      </div>
    </div>
  );
}
