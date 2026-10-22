/**
 * Pure decision logic behind <VideoAvatar />: which clip a state shows, when an
 * idle variation may play, and how long to wait before switching clips. Kept
 * free of timers and DOM so it can be unit-tested without a browser.
 */
import type { AvatarState } from './types';

/** One clip: a single URL, or WebM + MP4 sources (the browser picks the first it can play). */
export type VideoClipSource = string | { webm?: string; mp4?: string };

/** `idle` is required; missing states fall back (working → thinking → idle, the rest → idle). */
export type VideoClips = { idle: VideoClipSource } & Partial<Record<AvatarState, VideoClipSource>>;

export interface IdleVariation {
  /** A one-shot clip that starts and ends near the hub frame. */
  clip: VideoClipSource;
  /** Only eligible once the avatar has been idle this long (ms). Default 0. */
  afterIdleMs?: number;
  /** Minimum time (ms) before this variation can play again. Default 0. */
  cooldownMs?: number;
}

const FALLBACK: Record<AvatarState, AvatarState[]> = {
  idle: ['idle'],
  listening: ['listening', 'idle'],
  thinking: ['thinking', 'idle'],
  speaking: ['speaking', 'idle'],
  working: ['working', 'thinking', 'idle'],
};

/** The clip key a state shows, following the fallback chain to one that exists. */
export function resolveClip(clips: VideoClips, state: AvatarState): AvatarState {
  return FALLBACK[state].find((s) => clips[s] !== undefined) ?? 'idle';
}

/** `<source>` entries for a clip, WebM first so browsers that play it prefer it. */
export function clipSources(clip: VideoClipSource): { src: string; type?: string }[] {
  if (typeof clip === 'string') return [{ src: clip }];
  return [
    ...(clip.webm ? [{ src: clip.webm, type: 'video/webm' }] : []),
    ...(clip.mp4 ? [{ src: clip.mp4, type: 'video/mp4' }] : []),
  ];
}

/** Element id for the i-th idle variation, distinct from every state key. */
export const variationId = (index: number) => `idle-variation-${index}`;

export function randomBetween([min, max]: [number, number], random = Math.random): number {
  return min + random() * (max - min);
}

export interface PickVariationInput {
  /** How long the avatar has been idle, in ms. */
  idleMs: number;
  /** Per-variation timestamp of its last play (same clock as `now`). */
  lastPlayed: readonly (number | undefined)[];
  now: number;
  random?: () => number;
}

/** Index of a random eligible variation, or `null` if none may play yet. */
export function pickIdleVariation(
  variations: readonly IdleVariation[],
  { idleMs, lastPlayed, now, random = Math.random }: PickVariationInput,
): number | null {
  const eligible = variations
    .map((v, i) => ({ v, i }))
    .filter(({ v, i }) => {
      const last = lastPlayed[i];
      return idleMs >= (v.afterIdleMs ?? 0) && (last === undefined || now - last >= (v.cooldownMs ?? 0));
    });
  if (eligible.length === 0) return null;
  return eligible[Math.floor(random() * eligible.length)].i;
}

const BUSY = new Set<string>(['thinking', 'working']);

export interface SwitchDelayInput {
  desired: string;
  shown: string;
  /** When the shown clip came on screen (same clock as `now`). */
  lastSwitch: number;
  now: number;
  /** Minimum time a clip stays on screen. */
  holdMs: number;
  /** How long thinking/working must stay steady before swapping between them. */
  busySettleMs: number;
}

/**
 * Ms to wait before showing `desired`. Never switches more often than once per
 * `holdMs`; swaps between the busy clips (thinking ↔ working) also wait
 * `busySettleMs`, restarted on every change, so a burst of short tool calls
 * doesn't move the face and only a long-running tool shows the working clip.
 */
export function switchDelay({ desired, shown, lastSwitch, now, holdMs, busySettleMs }: SwitchDelayInput): number {
  if (desired === shown) return 0;
  const holdLeft = lastSwitch + holdMs - now;
  const settle = BUSY.has(desired) && BUSY.has(shown) ? busySettleMs : 0;
  return Math.max(0, holdLeft, settle);
}
