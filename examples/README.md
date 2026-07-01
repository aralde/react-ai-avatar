# Examples

Copy-pasteable, single-file examples for [`react-ai-avatar`](../README.md) — one
per integration pattern. Each file is a self-contained React component you can
drop into any Vite + React app. They import from `react-ai-avatar` exactly as a
consumer would, so what you read is what you ship.

> The interactive, hosted versions of these (running the client-side mock, no
> backend or API key) live on the project's **docs site** — built separately and
> not part of this repo.

## The examples

| # | File | Pattern | Extra deps |
|---|------|---------|-----------|
| 01 | [`01-quickstart.tsx`](01-quickstart.tsx) | The minimum: just `state`. Synthetic mouth, no audio. | — |
| 02 | [`02-streaming-text-usechat.tsx`](02-streaming-text-usechat.tsx) | **Declarative** text streaming via the `streamingText` prop + Vercel AI SDK `useChat`. | `@ai-sdk/react` |
| 03 | [`03-streaming-text-imperative.tsx`](03-streaming-text-imperative.tsx) | **Imperative** text streaming: own the reader loop, feed `createSpeechActivity()`. Runs against the local mock — no backend. | — |
| 04 | [`04-audio-analyser.tsx`](04-audio-analyser.tsx) | Real audio-reactive mouth: building and routing a WebAudio `AnalyserNode`. | — |
| 05 | [`05-avatar-catalog.tsx`](05-avatar-catalog.tsx) | Switching `variant` across the flat presets + DiceBear. | `@dicebear/core` `@dicebear/collection` (only for the dicebear option) |
| 06 | [`06-bring-your-own-svg.tsx`](06-bring-your-own-svg.tsx) | `variant="byos"`: a minimal custom SVG implementing the `#rra-*` layer contract. | — |
| 07 | [`07-gemini-live-voice.tsx`](07-gemini-live-voice.tsx) | Full realtime-voice pipeline: relay WebSocket → decode PCM → analyser. | a relay ([`server/proxy.ts`](server/proxy.ts)) |
| 08 | [`08-character-avatar-squirrel.tsx`](08-character-avatar-squirrel.tsx) | `variant="byos"` taken further: a full branded character (squirrel dev) on the same `#rra-*` contract. | — |
| 09 | [`09-thinking-emoji-reel.tsx`](09-thinking-emoji-reel.tsx) | Emulated "thinking" via `thinkingEmojis`: an emoji reel on the face, reasoning text rendered separately in the chat. Runs against the local mock — no backend. | — |

## Shared helpers

These back examples 03 (and the docs-site demos) so they run with **no model and
no API key**:

- [`shared/mockChatStream.ts`](shared/mockChatStream.ts) — a client-side mock
  that replays canned replies a few characters at a time, just like a real
  `/chat/completions` SSE stream. Swap it for your real `fetch` reader loop (or
  the [`server/proxy.ts`](server/proxy.ts) relay) and the avatar code is unchanged.
- [`shared/parseModelText.ts`](shared/parseModelText.ts) — tolerant
  `<thought>`/`<speech>` splitter for partial streaming text. Optional — only
  needed if your model wraps output in those tags (as the example prompts do).

## Running one

Spin up a throwaway app and paste an example into it:

```bash
npm create vite@latest my-avatar-test -- --template react-ts
cd my-avatar-test
npm install react-ai-avatar motion
# copy examples/01-quickstart.tsx over src/App.tsx (default export is the component)
npm run dev
```

The realtime-voice example (07) needs a relay that holds the provider API key.
A copy-pasteable reference relay (Gemini Live `/live` + OpenAI-compatible
`/api/chat`) lives in [`server/proxy.ts`](server/proxy.ts) — drop it into your
own backend, set its [`.env`](server/.env.example), and point the example at it.
