import { describe, it, expect } from 'vitest';
import { createSpeechActivity, isSpeechActivity } from './speechActivity';

/** Controllable clock so decay is deterministic in tests. */
function fakeClock() {
  let t = 0;
  return {
    now: () => t,
    advance: (ms: number) => {
      t += ms;
    },
  };
}

describe('createSpeechActivity', () => {
  it('starts closed', () => {
    const clock = fakeClock();
    const src = createSpeechActivity({ now: clock.now });
    expect(src.sample()).toBe(0);
  });

  it('opens when tokens are pushed', () => {
    const clock = fakeClock();
    const src = createSpeechActivity({ now: clock.now });
    src.push('Hello there');
    expect(src.sample()).toBeGreaterThan(0.3);
  });

  it('a single huge chunk cannot peg the mouth fully open past the cap', () => {
    const clock = fakeClock();
    const src = createSpeechActivity({ now: clock.now, maxChargePerPush: 0.5 });
    src.push('x'.repeat(10000));
    expect(src.sample()).toBeLessThanOrEqual(0.5 + 1e-9);
  });

  it('decays toward closed during a pause', () => {
    const clock = fakeClock();
    const src = createSpeechActivity({ now: clock.now, decayMs: 140 });
    src.push('streaming tokens arriving');
    const peak = src.sample();
    clock.advance(700); // ~5 time constants
    const after = src.sample();
    expect(after).toBeLessThan(peak * 0.1);
  });

  it('sustains energy while tokens keep arriving', () => {
    const clock = fakeClock();
    const src = createSpeechActivity({ now: clock.now, decayMs: 140 });
    // Feed a token every 40ms for a while, like a real stream.
    for (let i = 0; i < 20; i++) {
      src.push('tok');
      clock.advance(40);
    }
    expect(src.sample()).toBeGreaterThan(0.4);
  });

  it('reset() drops energy immediately (interrupted turn)', () => {
    const clock = fakeClock();
    const src = createSpeechActivity({ now: clock.now });
    src.push('a long stretch of speech');
    src.reset();
    expect(src.sample()).toBe(0);
  });

  it('ignores empty pushes', () => {
    const clock = fakeClock();
    const src = createSpeechActivity({ now: clock.now });
    src.push('');
    expect(src.sample()).toBe(0);
  });

  it('is recognized by the isSpeechActivity guard', () => {
    const src = createSpeechActivity();
    expect(isSpeechActivity(src)).toBe(true);
    expect(isSpeechActivity(null)).toBe(false);
    expect(isSpeechActivity({} as never)).toBe(false);
  });
});
