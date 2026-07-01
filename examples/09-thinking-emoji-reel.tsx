/**
 * 09 · Emulated "thinking" — an emoji reel on the avatar, reasoning in the chat.
 *
 * Sometimes you don't want the raw chain-of-thought floating on the face. This
 * splits it: the avatar shows a comic bubble cross-fading through a reel of
 * reasoning/study/web emojis (`thinkingEmojis`), while the *actual* reasoning
 * text streams into a separate panel in your chat — the way Claude Code shows a
 * collapsible "thinking" block next to the answer.
 *
 * `thinkingEmojis` only renders while `state === 'thinking'`, and when it's on
 * it takes the bubble slot above the face, so the text `thought` overlay stands
 * down. Here we render that reasoning ourselves with `<AvatarThought />`.
 *
 * This example needs no backend — it streams from the client-side mock in
 * `./shared/mockChatStream`.
 *
 * Run: npm install react-ai-avatar motion
 */
import { useState } from 'react';
import { RealtimeAvatar, AvatarThought } from 'react-ai-avatar';
import type { AvatarState } from 'react-ai-avatar';
import 'react-ai-avatar/style.css';
import { mockChatStream } from './shared/mockChatStream';
import { parseModelText } from './shared/parseModelText';

export default function ThinkingEmojiReel() {
  const [state, setState] = useState<AvatarState>('idle');
  const [subtitle, setSubtitle] = useState('');
  const [thought, setThought] = useState('');
  const [busy, setBusy] = useState(false);

  async function ask() {
    if (busy) return;
    setBusy(true);
    setState('thinking');
    setThought('');
    setSubtitle('');

    let raw = '';
    for await (const chunk of mockChatStream()) {
      raw += chunk;
      const parsed = parseModelText(raw);
      setThought(parsed.thought);
      setSubtitle(parsed.speech);
      if (parsed.speech) setState('speaking');
    }

    setState('idle');
    setBusy(false);
  }

  return (
    <div style={{ display: 'grid', gap: 24, justifyItems: 'center' }}>
      {/* The face: while thinking it shows the emoji reel, not the reasoning.
          Pass `thinkingEmojis` for the default set, or your own array. */}
      <RealtimeAvatar
        state={state}
        streamingText={subtitle}
        subtitle={subtitle}
        thinkingEmojis={['🤔', '📚', '🌐', '🔍', '🧠', '💡']}
        thinkingEmojiInterval={700}
      />

      {/* The reasoning, rendered separately in the chat column. */}
      {thought && (
        <div style={{ width: 'min(90vw, 420px)' }}>
          <AvatarThought text={thought} label="Reasoning" />
        </div>
      )}

      <button onClick={ask} disabled={busy}>
        {busy ? 'Streaming…' : 'Ask the mock model'}
      </button>
    </div>
  );
}
