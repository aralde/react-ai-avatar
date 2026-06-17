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
| 07 | [`07-gemini-live-voice.tsx`](07-gemini-live-voice.tsx) | Full realtime-voice pipeline: relay WebSocket → decode PCM → analyser. | a relay (the repo's `server.ts`) |

## Shared helpers

These back examples 03 (and the docs-site demos) so they run with **no model and
no API key**:

- [`shared/mockChatStream.ts`](shared/mockChatStream.ts) — a client-side port of
  the demo server's `streamMockChat`: replays canned replies a few characters at
  a time, just like a real `/chat/completions` SSE stream. Swap it for your real
  `fetch` reader loop and the avatar code is unchanged.
- [`shared/parseModelText.ts`](shared/parseModelText.ts) — tolerant
  `<thought>`/`<speech>` splitter for partial streaming text (same one
  `useGeminiLive` uses). Optional — only needed if your model uses those tags.

## Running one

Spin up a throwaway app and paste an example into it:

```bash
npm create vite@latest my-avatar-test -- --template react-ts
cd my-avatar-test
npm install react-ai-avatar motion
# copy examples/01-quickstart.tsx over src/App.tsx (default export is the component)
npm run dev
```

For the realtime-voice example (07), clone this repo instead and run
`npm run dev` — it ships the relay server and a no-API-key mock
(`MOCK_REALTIME=true`).
