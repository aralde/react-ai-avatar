/**
 * 02 · Text-streaming LLM — the declarative path (`streamingText`).
 *
 * If you use a streaming chat hook like the Vercel AI SDK's `useChat`, you never
 * see raw chunks — you get the *accumulated* assistant message plus a `status`.
 * Both map straight onto the avatar: pass the growing text to `streamingText`
 * and the avatar diffs its growth internally to drive the mouth. No refs, no
 * reader loop.
 *
 * Run: npm install react-ai-avatar motion @ai-sdk/react
 *      (and a streaming `/api/chat` route — any Vercel AI SDK backend)
 */
import { useChat } from '@ai-sdk/react';
import { RealtimeAvatar } from 'react-ai-avatar';
import 'react-ai-avatar/style.css';

export default function ChatAvatar() {
  const { messages, status, sendMessage } = useChat();
  const last = messages.at(-1);
  const assistantText = last?.role === 'assistant' ? last.text : '';

  return (
    <div style={{ display: 'grid', gap: 16, justifyItems: 'center' }}>
      <RealtimeAvatar
        // status: 'submitted' (awaiting first token) | 'streaming' | 'ready'
        state={
          status === 'submitted' ? 'thinking' : status === 'streaming' ? 'speaking' : 'idle'
        }
        // The whole integration: hand the avatar the accumulated text.
        streamingText={assistantText}
        subtitle={assistantText}
      />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const input = e.currentTarget.elements.namedItem('q') as HTMLInputElement;
          if (input.value.trim()) sendMessage({ text: input.value });
          input.value = '';
        }}
      >
        <input name="q" placeholder="Ask something…" autoComplete="off" />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}
