/**
 * 03 · Text-streaming LLM — the imperative path (`createSpeechActivity`).
 *
 * When you own the reader loop (hand-rolled `fetch`, or driving the OpenAI SDK's
 * `for await` yourself), you *do* have the raw chunks. Feed their cadence
 * directly to a `SpeechActivitySource`: the mouth is busy while tokens arrive
 * and settles shut on pauses / `end()`.
 *
 * This example needs no backend — it streams from the client-side mock in
 * `./shared/mockChatStream`. Swap `mockChatStream()` for your real `fetch`
 * reader loop and the avatar code stays identical.
 *
 * Run: npm install react-ai-avatar motion
 */
import { useRef, useState } from 'react';
import { RealtimeAvatar, createSpeechActivity } from 'react-ai-avatar';
import type { AvatarState } from 'react-ai-avatar';
import 'react-ai-avatar/style.css';
import { mockChatStream } from './shared/mockChatStream';
import { parseModelText } from './shared/parseModelText';

export default function ImperativeTextAvatar() {
  // One long-lived activity source drives the mouth across turns.
  const speech = useRef(createSpeechActivity()).current;
  const [state, setState] = useState<AvatarState>('idle');
  const [subtitle, setSubtitle] = useState('');
  const [thought, setThought] = useState('');
  const [busy, setBusy] = useState(false);

  async function ask() {
    if (busy) return;
    setBusy(true);
    setState('thinking');
    speech.reset();

    let raw = '';
    // In a real app this loop reads your SSE/delta stream instead.
    for await (const chunk of mockChatStream()) {
      raw += chunk;
      speech.push(chunk); // <- feed token cadence to the mouth
      const parsed = parseModelText(raw);
      setThought(parsed.thought);
      setSubtitle(parsed.speech);
      if (parsed.speech) setState('speaking');
    }

    speech.end();
    setState('idle');
    setBusy(false);
  }

  return (
    <div style={{ display: 'grid', gap: 16, justifyItems: 'center' }}>
      <RealtimeAvatar
        state={state}
        speechActivity={speech}
        subtitle={subtitle}
        thought={thought}
      />
      <button onClick={ask} disabled={busy}>
        {busy ? 'Streaming…' : 'Ask the mock model'}
      </button>
    </div>
  );
}
