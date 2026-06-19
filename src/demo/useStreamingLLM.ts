import { useCallback, useEffect, useRef, useState } from 'react';
import { createSpeechActivity, SpeechActivitySource } from '../lib/speechActivity';
import { parseModelText } from './useGeminiLive';
import type { AvatarState } from '../lib/types';

/**
 * Demo hook: drives the avatar from a text-streaming LLM (OpenAI-compatible
 * `/chat/completions` with `stream: true`), proxied by the dev server at
 * `/api/chat`. This is the text counterpart to `useGeminiLive`.
 *
 * It owns the connection (the library never fetches): it streams tokens,
 * feeds their cadence to a `SpeechActivitySource`, and resolves the avatar
 * `state` (thinking → speaking → idle). Pass the returned `speechActivity`
 * to `<RealtimeAvatar speechActivity={...} />` and the mouth tracks the stream.
 */
export function useStreamingLLM() {
  const [state, setState] = useState<AvatarState>('idle');
  const [subtitle, setSubtitle] = useState('');
  const [thought, setThought] = useState('');
  const [tool, setTool] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  // One long-lived activity source drives the mouth across turns.
  const speechActivityRef = useRef<SpeechActivitySource | null>(null);
  if (speechActivityRef.current === null) {
    speechActivityRef.current = createSpeechActivity();
  }
  const speechActivity = speechActivityRef.current;

  // Running chat history so the model has context across turns.
  const historyRef = useRef<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    speechActivity.reset();
    setIsStreaming(false);
    setState('idle');
    setTool('');
  }, [speechActivity]);

  const send = useCallback(
    async (prompt: string) => {
      const text = prompt.trim();
      if (!text || isStreaming) return;

      setError(null);
      setSubtitle('');
      setThought('');
      setTool('');
      setState('thinking');
      setIsStreaming(true);
      speechActivity.reset();

      const controller = new AbortController();
      abortRef.current = controller;
      historyRef.current.push({ role: 'user', content: text });

      let raw = '';
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: historyRef.current }),
          signal: controller.signal,
        });
        if (!res.ok || !res.body) throw new Error(`Request failed (${res.status})`);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        // Read the SSE stream: lines of `data: {json}`.
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;
            const evt = JSON.parse(trimmed.slice(5).trim());

            if (evt.error) throw new Error(evt.error);
            if (evt.done) continue;
            if (!evt.text) continue;

            raw += evt.text;
            // Feed the token cadence to the mouth driver.
            speechActivity.push(evt.text);

            const parsed = parseModelText(raw);
            setThought(parsed.thought);
            setSubtitle(parsed.speech);
            setTool(parsed.tool);
            if (parsed.speech) {
              setState('speaking');
            } else if (parsed.tool) {
              setState('working');
            }
          }
        }

        historyRef.current.push({ role: 'assistant', content: raw });
        speechActivity.end();
      } catch (e: any) {
        if (e.name !== 'AbortError') setError(e.message || 'Stream failed');
      } finally {
        setIsStreaming(false);
        setState('idle');
        abortRef.current = null;
      }
    },
    [isStreaming, speechActivity]
  );

  const reset = useCallback(() => {
    stop();
    historyRef.current = [];
    setSubtitle('');
    setThought('');
    setTool('');
    setError(null);
  }, [stop]);

  useEffect(() => () => abortRef.current?.abort(), []);

  return { send, stop, reset, state, subtitle, thought, tool, error, isStreaming, speechActivity };
}
