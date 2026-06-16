import { useEffect, useRef } from 'react';
import { createSpeechActivity, SpeechActivitySource } from './speechActivity';

/**
 * Pure diff between the previously-seen accumulated text and the latest one.
 * Streaming hooks (e.g. the Vercel AI SDK's `useChat`) expose the *growing*
 * assistant message, not raw chunks — so we infer what's new:
 *
 * - `push`  — `next` continues `prev` (the common case mid-stream): the new
 *   suffix is the token cadence to feed the mouth.
 * - `reset` — `next` replaced or shrank `prev` (a new turn, or the field was
 *   cleared): drop energy and re-seed with `next` (empty seed = just clear).
 * - `none`  — unchanged.
 *
 * Exported for unit tests; the hook below is a thin stateful wrapper.
 */
export type StreamingTextAction =
  | { type: 'push'; text: string }
  | { type: 'reset'; seed: string }
  | { type: 'none' };

export function diffStreamingText(prev: string, next: string): StreamingTextAction {
  if (next === prev) return { type: 'none' };
  if (next.length > prev.length && next.startsWith(prev)) {
    return { type: 'push', text: next.slice(prev.length) };
  }
  return { type: 'reset', seed: next };
}

/**
 * Declarative bridge for the dominant chat pattern: hooks like `useChat` hand
 * you the *accumulated* assistant text (it grows every render), not stream
 * chunks. This hook diffs that growth and feeds the new suffix into an internal
 * `SpeechActivitySource`, so the mouth tracks the stream without the host ever
 * touching `createSpeechActivity` or a reader loop.
 *
 * Pass `<RealtimeAvatar streamingText={lastAssistantText} />` and you're done:
 *
 *   const { messages, status } = useChat();
 *   const last = messages.at(-1);
 *   <RealtimeAvatar
 *     state={status === 'submitted' ? 'thinking'
 *          : status === 'streaming' ? 'speaking' : 'idle'}
 *     streamingText={last?.role === 'assistant' ? last.text : ''}
 *   />
 *
 * Returns `null` when `text` is `undefined` (the prop wasn't used), so the
 * caller can fall through to the `analyser` mouth driver. The low-level
 * `createSpeechActivity` push() API stays available for imperative streams.
 */
export function useStreamingTextActivity(text: string | undefined): SpeechActivitySource | null {
  // One long-lived source drives the mouth across turns.
  const sourceRef = useRef<SpeechActivitySource | null>(null);
  if (sourceRef.current === null) sourceRef.current = createSpeechActivity();

  // Last text we've already accounted for, to compute the delta.
  const prevRef = useRef('');

  useEffect(() => {
    if (text === undefined) return;
    const source = sourceRef.current!;
    const action = diffStreamingText(prevRef.current, text);

    if (action.type === 'push') {
      source.push(action.text);
    } else if (action.type === 'reset') {
      source.reset();
      if (action.seed) source.push(action.seed);
    }
    prevRef.current = text;
  }, [text]);

  return text === undefined ? null : sourceRef.current;
}
