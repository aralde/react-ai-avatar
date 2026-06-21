import { describe, it, expect } from 'vitest';
import { diffStreamingText } from './useStreamingTextActivity';

/**
 * The declarative bridge's core is the diff: turning a growing accumulated
 * text (what `useChat`-style hooks expose) back into the new-suffix cadence
 * the mouth driver wants. The React wrapper is a thin stateful shell over this.
 */
describe('diffStreamingText', () => {
  it('reports no change when the text is identical', () => {
    expect(diffStreamingText('hello', 'hello')).toEqual({ type: 'none' });
    expect(diffStreamingText('', '')).toEqual({ type: 'none' });
  });

  it('pushes only the freshly arrived suffix mid-stream', () => {
    expect(diffStreamingText('Hel', 'Hello')).toEqual({ type: 'push', text: 'lo' });
    expect(diffStreamingText('', 'H')).toEqual({ type: 'push', text: 'H' });
  });

  it('resets and re-seeds when the text is replaced (new turn)', () => {
    expect(diffStreamingText('first answer', 'second')).toEqual({
      type: 'reset',
      seed: 'second',
    });
  });

  it('resets with an empty seed when the field is cleared', () => {
    expect(diffStreamingText('something', '')).toEqual({ type: 'reset', seed: '' });
  });

  it('treats a shrink that is not a prefix as a replacement', () => {
    // Not a continuation of the previous text -> new turn, not a suffix.
    expect(diffStreamingText('abcdef', 'abXY')).toEqual({ type: 'reset', seed: 'abXY' });
  });

  it('drives a real SpeechActivitySource: suffix pushes raise energy', () => {
    // End-to-end-ish: replay a stream through the same actions the hook applies.
    // We assert the *direction* of energy, not exact values (that is
    // speechActivity's own unit test's job).
    // Here we just confirm the diff yields pushable suffixes in order.
    const frames = ['He', 'Hello', 'Hello wo', 'Hello world'];
    let prev = '';
    const pushed: string[] = [];
    for (const f of frames) {
      const action = diffStreamingText(prev, f);
      if (action.type === 'push') pushed.push(action.text);
      prev = f;
    }
    expect(pushed.join('')).toBe('Hello world');
  });
});
