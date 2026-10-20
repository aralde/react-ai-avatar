import { describe, it, expect } from 'vitest';
import {
  clipSources,
  pickIdleVariation,
  randomBetween,
  resolveClip,
  switchDelay,
  variationId,
  type IdleVariation,
  type VideoClips,
} from './videoClips';

describe('resolveClip', () => {
  const full: VideoClips = {
    idle: 'idle.webm',
    listening: 'listening.webm',
    thinking: 'thinking.webm',
    speaking: 'speaking.webm',
    working: 'working.webm',
  };

  it('uses the state clip when it exists', () => {
    expect(resolveClip(full, 'working')).toBe('working');
    expect(resolveClip(full, 'listening')).toBe('listening');
  });

  it('falls back working → thinking → idle', () => {
    expect(resolveClip({ idle: 'i', thinking: 't' }, 'working')).toBe('thinking');
    expect(resolveClip({ idle: 'i' }, 'working')).toBe('idle');
  });

  it('falls back to idle for the other states', () => {
    for (const state of ['listening', 'thinking', 'speaking'] as const) {
      expect(resolveClip({ idle: 'i' }, state)).toBe('idle');
    }
  });
});

describe('clipSources', () => {
  it('lists WebM before MP4 and types both', () => {
    expect(clipSources({ mp4: 'a.mp4', webm: 'a.webm' })).toEqual([
      { src: 'a.webm', type: 'video/webm' },
      { src: 'a.mp4', type: 'video/mp4' },
    ]);
  });

  it('passes a plain URL through untyped', () => {
    expect(clipSources('a.mov')).toEqual([{ src: 'a.mov' }]);
  });
});

describe('pickIdleVariation', () => {
  const chin: IdleVariation = { clip: 'chin', cooldownMs: 20_000 };
  const coffee: IdleVariation = { clip: 'coffee', afterIdleMs: 30_000, cooldownMs: 90_000 };
  const first = () => 0;
  const last = () => 0.999;

  it('returns null with no variations', () => {
    expect(pickIdleVariation([], { idleMs: 60_000, lastPlayed: [], now: 0 })).toBeNull();
  });

  it('keeps a long-idle variation out until afterIdleMs', () => {
    const input = { lastPlayed: [], now: 100_000, random: last };
    expect(pickIdleVariation([chin, coffee], { ...input, idleMs: 29_999 })).toBe(0);
    expect(pickIdleVariation([chin, coffee], { ...input, idleMs: 30_000 })).toBe(1);
  });

  it('respects each variation cooldown', () => {
    const now = 100_000;
    expect(pickIdleVariation([chin], { idleMs: 0, lastPlayed: [now - 19_999], now })).toBeNull();
    expect(pickIdleVariation([chin], { idleMs: 0, lastPlayed: [now - 20_000], now })).toBe(0);
  });

  it('picks among the eligible ones with the injected random', () => {
    const input = { idleMs: 60_000, lastPlayed: [], now: 0 };
    expect(pickIdleVariation([chin, coffee], { ...input, random: first })).toBe(0);
    expect(pickIdleVariation([chin, coffee], { ...input, random: last })).toBe(1);
  });
});

describe('switchDelay', () => {
  const base = { lastSwitch: 0, holdMs: 1200, busySettleMs: 1000 };

  it('is zero when nothing changes', () => {
    expect(switchDelay({ ...base, desired: 'idle', shown: 'idle', now: 0 })).toBe(0);
  });

  it('waits out the minimum hold of the shown clip', () => {
    expect(switchDelay({ ...base, desired: 'speaking', shown: 'idle', now: 200 })).toBe(1000);
    expect(switchDelay({ ...base, desired: 'speaking', shown: 'idle', now: 5000 })).toBe(0);
  });

  it('makes thinking ↔ working settle even after the hold', () => {
    expect(switchDelay({ ...base, desired: 'working', shown: 'thinking', now: 5000 })).toBe(1000);
    expect(switchDelay({ ...base, desired: 'thinking', shown: 'working', now: 5000 })).toBe(1000);
  });

  it('does not delay leaving the busy pair', () => {
    expect(switchDelay({ ...base, desired: 'speaking', shown: 'working', now: 5000 })).toBe(0);
  });
});

describe('helpers', () => {
  it('variation ids never collide with state keys', () => {
    expect(variationId(0)).toBe('idle-variation-0');
    expect(['idle', 'listening', 'thinking', 'speaking', 'working']).not.toContain(variationId(0));
  });

  it('randomBetween spans [min, max)', () => {
    expect(randomBetween([10, 20], () => 0)).toBe(10);
    expect(randomBetween([10, 20], () => 0.5)).toBe(15);
  });
});
