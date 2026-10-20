import React, { useEffect, useRef, useState } from 'react';
import type { AvatarState } from '../lib/types';
import { createMouthEngine, type MouthSource } from '../lib/mouthEngine';
import type { SpeechActivitySource } from '../lib/speechActivity';
import { useReducedMotion } from '../lib/useReducedMotion';
import {
  clipSources,
  pickIdleVariation,
  randomBetween,
  resolveClip,
  switchDelay,
  variationId,
  type IdleVariation,
  type VideoClips,
} from '../lib/videoClips';

/**
 * VideoAvatar — the "clip" technique: instead of drawing a face, it plays a
 * short looping video per state (e.g. generated with a text-to-video model or
 * recorded) and crossfades between them when `state` changes. Every clip should
 * start and end on the same neutral "hub" frame so loops and cuts don't jump.
 *
 * - Lip-sync is gated, not frame-accurate: with `speechActivity` or `analyser`,
 *   the `speaking` clip only shows while there is actual speech energy; in
 *   pauses it falls back to the idle clip.
 * - `idleVariations` are one-shot clips (a stretch, a sip of coffee) played now
 *   and then while idle, so a long wait doesn't look like the same loop forever.
 * - `minHoldMs` / `busySettleMs` keep an agent that flips thinking ↔ working on
 *   every tool call from making the face flicker.
 *
 * The library ships no footage: the host passes the clip URLs.
 */

export interface VideoAvatarProps {
  clips: VideoClips;
  state?: AvatarState;
  /** Token-rate speech driver for text-streaming LLMs. Takes precedence over `analyser`. */
  speechActivity?: SpeechActivitySource;
  /** WebAudio analyser of the assistant's voice. Gates the `speaking` clip on speech energy. */
  analyser?: AnalyserNode | null;
  /** One-shot clips interleaved with the idle loop. Keep the array stable
   *  (module constant or `useMemo`): a new array restarts the idle timer. */
  idleVariations?: IdleVariation[];
  /** Random wait between idle variations, `[min, max]` in ms. */
  idleVariationIntervalMs?: [number, number];
  /** Minimum time a clip stays on screen before the next switch (ms). */
  minHoldMs?: number;
  /** How long thinking/working must stay steady before swapping between them (ms). */
  busySettleMs?: number;
  /** Image shown before the first clip can play (ideally the hub frame). */
  poster?: string;
  /** Width/height. Defaults to `'100%'`. */
  size?: number | string;
  /** Crossfade duration between clips, in ms. */
  crossfadeMs?: number;
  /** Accessible name for the avatar. */
  label?: string;
  className?: string;
  style?: React.CSSProperties;
}

/** Mouth level above which the speaker counts as talking. */
const TALK_ON = 0.08;
/** Silence this long (ms) before the speaking clip yields to idle. Long enough
 *  that commas and word gaps don't flicker the crossfade; only real pauses do. */
const SILENCE_HOLD_MS = 700;

/** True while the source reports speech, with a short hold to bridge word gaps. */
function useIsTalking(source: MouthSource, enabled: boolean): boolean {
  const [talking, setTalking] = useState(true);

  useEffect(() => {
    if (!enabled || !source) {
      setTalking(true);
      return;
    }
    const engine = createMouthEngine(source);
    let lastVoice = 0;
    let current = false;
    let raf = 0;
    const tick = () => {
      const now = performance.now();
      if (engine.read().level > TALK_ON) lastVoice = now;
      const next = now - lastVoice < SILENCE_HOLD_MS;
      if (next !== current) {
        current = next;
        setTalking(next);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [source, enabled]);

  return talking;
}

/**
 * While `idle`, picks an eligible variation every so often and returns its index
 * until the caller reports it ended. Any state change cancels it.
 */
function useIdleVariation(
  variations: IdleVariation[],
  idle: boolean,
  [minWait, maxWait]: [number, number],
): [number | null, () => void] {
  const [playing, setPlaying] = useState<number | null>(null);
  const [round, setRound] = useState(0);
  const lastPlayed = useRef<number[]>([]);
  const idleSince = useRef(0);

  useEffect(() => {
    if (idle) idleSince.current = performance.now();
  }, [idle]);

  useEffect(() => {
    if (!idle) {
      setPlaying(null);
      return;
    }
    if (variations.length === 0) return;
    let timer = 0;
    const schedule = () => {
      timer = window.setTimeout(() => {
        const now = performance.now();
        const pick = pickIdleVariation(variations, {
          idleMs: now - idleSince.current,
          lastPlayed: lastPlayed.current,
          now,
        });
        if (pick === null) return schedule();
        lastPlayed.current[pick] = now;
        setPlaying(pick);
      }, randomBetween([minWait, maxWait]));
    };
    schedule();
    return () => window.clearTimeout(timer);
    // `round` restarts the wait after each variation; the idle clock keeps
    // counting from when idle began, so long-idle variations stay reachable.
  }, [idle, variations, minWait, maxWait, round]);

  const done = () => {
    setPlaying(null);
    setRound((r) => r + 1);
  };
  return [playing, done];
}

/** `desired`, switched in only after `switchDelay` allows it (a debounce). */
function useHeld(desired: string, holdMs: number, busySettleMs: number): string {
  const [shown, setShown] = useState(desired);
  const lastSwitch = useRef(0);

  useEffect(() => {
    if (desired === shown) return;
    const delay = switchDelay({
      desired,
      shown,
      lastSwitch: lastSwitch.current,
      now: performance.now(),
      holdMs,
      busySettleMs,
    });
    const timer = window.setTimeout(() => {
      lastSwitch.current = performance.now();
      setShown(desired);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [desired, shown, holdMs, busySettleMs]);

  return shown;
}

export function VideoAvatar({
  clips,
  state = 'idle',
  speechActivity,
  analyser = null,
  idleVariations = [],
  idleVariationIntervalMs = [15000, 30000],
  minHoldMs = 1200,
  busySettleMs = 1000,
  poster,
  size = '100%',
  crossfadeMs = 350,
  label = 'Avatar',
  className,
  style,
}: VideoAvatarProps) {
  const reducedMotion = useReducedMotion();
  const talking = useIsTalking(speechActivity ?? analyser, state === 'speaking');
  const [variation, variationDone] = useIdleVariation(
    idleVariations,
    state === 'idle' && !reducedMotion,
    idleVariationIntervalMs,
  );
  const desired =
    variation !== null ? variationId(variation) : resolveClip(clips, state === 'speaking' && !talking ? 'idle' : state);
  const active = useHeld(desired, minHoldMs, busySettleMs);

  const entries = [
    ...(Object.keys(clips) as AvatarState[]).map((key) => ({ id: key as string, clip: clips[key]!, loop: true })),
    ...idleVariations.map((v, i) => ({ id: variationId(i), clip: v.clip, loop: false })),
  ];
  const refs = useRef<Record<string, HTMLVideoElement | null>>({});

  useEffect(() => {
    const incoming = refs.current[active];
    if (incoming) {
      if (!incoming.loop) incoming.currentTime = 0;
      if (reducedMotion) incoming.pause();
      else void incoming.play().catch(() => {});
    }
    // Let the outgoing clips keep moving through the crossfade, then pause them.
    const timer = window.setTimeout(() => {
      for (const [id, video] of Object.entries(refs.current)) {
        if (id !== active && video) video.pause();
      }
    }, crossfadeMs);
    return () => window.clearTimeout(timer);
  }, [active, reducedMotion, crossfadeMs]);

  return (
    <div
      role="img"
      aria-label={`${label} (${state})`}
      className={className}
      style={{ position: 'relative', width: size, aspectRatio: '1 / 1', overflow: 'hidden', ...style }}
    >
      {entries.map(({ id, clip, loop }) => (
        <video
          key={id}
          ref={(el) => {
            refs.current[id] = el;
          }}
          data-clip={id}
          muted
          loop={loop}
          playsInline
          preload="auto"
          poster={poster}
          aria-hidden="true"
          onEnded={loop ? undefined : variationDone}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: id === active ? 1 : 0,
            transition: reducedMotion ? 'none' : `opacity ${crossfadeMs}ms ease`,
          }}
        >
          {clipSources(clip).map((s) => (
            <source key={s.src} src={s.src} type={s.type} />
          ))}
        </video>
      ))}
    </div>
  );
}
