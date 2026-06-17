# react-ai-avatar

> A presentational React avatar for realtime LLM voice UIs — **you bring the connection, it brings the face.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A lightweight, MIT-licensed React library that renders an animated avatar reacting to your AI's conversation state and audio. It is **completely LLM-agnostic**: it doesn't know about Gemini, OpenAI or ElevenLabs. You pass two live things — a `state` and (optionally) a WebAudio `AnalyserNode` — and it does the rest.

```tsx
import { RealtimeAvatar } from 'react-ai-avatar';
import 'react-ai-avatar/style.css';

// The whole thing, minimally. Everything but `state` has a sensible default.
<RealtimeAvatar state="speaking" />
```

## Philosophy

One thing, done well, embeddable in a few lines, no backend, MIT. The library handles exactly one step of your voice pipeline: turning audio amplitude + state changes into a face that visibly **listens, thinks and speaks**. Your host app keeps the microphone, the WebSocket and the AI provider — none of those dependencies enter your bundle.

## Features

- 👄 **Audio-reactive mouth** — analyzes amplitude and frequency bands in real time. This is deliberately *not* phoneme-perfect "lip-sync": an `AnalyserNode` gives energy, not phonemes, and for flat avatars amplitude is what looks right.
- 🦺 **Graceful degradation** — `analyser={null}` while `state="speaking"`? The mouth animates with a synthetic speech-like pattern instead of freezing. Perfect for demos and non-WebRTC apps.
- ⌨️ **Text-streaming LLMs too** — no audio? Drive the mouth from *token cadence* with `createSpeechActivity()`. A text-only assistant (OpenAI-style `/chat/completions` or `/responses` with `stream: true`) gets a face that visibly tracks the stream — busy while tokens arrive, settling on pauses.
- 🧠 **A visible `thinking` state** — pulsing thought bubble + upward gaze. Your users *see* the LLM thinking, not just a color change.
- 🎨 **Own-design avatar catalog** — `geometric`, `memoji`, `pixelart`, `doodle`: four MIT, CC0-safe SVG presets. No third-party assets, no attribution headaches.
- 🎲 **DiceBear avatars (`dicebear`)** — generate deterministic [DiceBear](https://www.dicebear.com) avatars client-side, from a curated **CC0-only** style set (still no attribution). Animated with an audio-reactive bounce.
- 🔌 **Bring your own SVG (`byos`)** — any SVG implementing the small layer contract gets the full animation runtime for free. Your avatar, your license.
- ♿ **Production quality** — SSR-safe (Next.js friendly), honors `prefers-reduced-motion`, announces state changes via `aria-live`.
- 🧊 **Optional 3D (VRM)** — `variant="vrm"` renders VRoid/VRM models with visemes and gaze tracking. The three.js stack is an *optional* peer dependency, lazy-loaded only if you use it.

## Installation

```bash
npm install react-ai-avatar motion
```

`react`, `react-dom` and `motion` are peer dependencies. For the optional VRM variant, also install:

```bash
npm install three @react-three/fiber @react-three/drei @pixiv/three-vrm
```

## Quick start

The only prop you *have* to pass is `state` — you resolve it in your app, the avatar never infers it. Everything else has a default, so this already works:

```tsx
import { RealtimeAvatar } from 'react-ai-avatar';
import 'react-ai-avatar/style.css';

export default function App() {
  // You resolve this in your app (Gemini, OpenAI Realtime, WebRTC, anything)
  const aiState = 'speaking'; // 'idle' | 'listening' | 'thinking' | 'speaking'

  return <RealtimeAvatar state={aiState} />;
}
```

With no `analyser`, `speaking` falls back to a synthetic speech-like mouth — great for getting something on screen before the audio pipeline exists. Pass an `AnalyserNode` to make the mouth react to real audio (see [Getting an `AnalyserNode`](#getting-an-analysernode)).

### Customizing further

Every default is overridable. Opt into as much as you need:

```tsx
<RealtimeAvatar
  state={aiState}
  analyser={analyser}                 // AnalyserNode | null — real audio-reactive mouth
  size={300}                          // default 280
  variant="geometric"                 // 'geometric' | 'memoji' | 'pixelart' | 'doodle' | 'dicebear' | 'vrm' | 'glb' | 'byos'
  customization={{ skinColor: '#f5c7a9', hairColor: '#2c2c2c', glasses: true, headphones: true }}
  stateColors={{ idle: '#4b5563', listening: '#3b82f6', thinking: '#8b5cf6', speaking: '#10b981' }}
/>
```

## The avatar catalog

| variant | style | notes |
|---|---|---|
| `geometric` | minimal flat geometry | the default; canonical layer-contract example |
| `memoji` | soft volumetric head | radial gradients, glossy eyes, blush |
| `pixelart` | retro 32×32 grid | mouth and pupils move in whole pixels |
| `doodle` | hand-drawn ink sketch | wobbly strokes, sketched thought bubble |
| `dicebear` | [DiceBear](https://www.dicebear.com) styles | optional, lazy-loaded; curated CC0 set; pass `dicebearCollection` / `dicebearSeed` |
| `vrm` | 3D VRoid/VRM model | optional, lazy-loaded; pass `vrmUrl` |
| `glb` | 3D glTF + ARKit blendshapes | optional, lazy-loaded; pass `glbUrl`. Works with [Microsoft Rocketbox](https://github.com/microsoft/Microsoft-Rocketbox) (MIT), Ready Player Me, or any `.glb` exposing the 52 ARKit morph targets |
| `byos` | **your** SVG | pass it as children; see the layer contract |

All built-in presets are original designs licensed MIT — nothing inside this package requires attribution.

## DiceBear avatars (`dicebear`)

Generate [DiceBear](https://www.dicebear.com) avatars client-side — deterministic per `seed`, no network call. The packages are **optional** peer dependencies, lazy-loaded only when this variant renders:

```bash
npm install @dicebear/core @dicebear/collection
```

```tsx
<RealtimeAvatar
  state={aiState}
  analyser={analyser}
  variant="dicebear"
  dicebearCollection="open-peeps" // curated CC0 style id
  dicebearSeed="ada-lovelace"     // same seed + style => same face
/>
```

**Licensing:** DiceBear ships ~30 styles under mixed licenses. This library's catalog (`DICEBEAR_STYLES`) is curated to **CC0 1.0** styles that have a face — `pixel-art`(+`-neutral`), `lorelei`(+`-neutral`), `notionists`(+`-neutral`), `open-peeps`, `thumbs` — so it keeps the same no-attribution promise as the built-in presets. You *can* pass any other DiceBear style id to `dicebearCollection`, but then its license (e.g. CC BY 4.0 for `adventurer`, or "free for personal and commercial use" for `bottts`) is your responsibility — same deal as `byos`.

**Animation:** DiceBear SVGs have no `#rra-*` hooks, but their *option API* lets us pick which mouth/eyes variant to render. So every curated style actually **talks**: it pre-generates a few frames of the same avatar (same seed ⇒ identical hair/skin/etc.) with closed / mid / open mouths — plus a blink frame where the style allows — and swaps which frame is shown per audio frame, with a subtle bounce on top. Real articulation via the supported API, no fragile path hacks. The per-style variant choices live in the exported `DICEBEAR_RIGS` map. (A non-rigged style id you pass yourself — e.g. a faceless abstract DiceBear style — falls back to a pure audio-reactive bounce.) State color and the thinking bubble still come from the surrounding `<RealtimeAvatar />` chrome.

## 3D GLB + ARKit (`glb`)

Render any `.glb` that exposes the **52 [ARKit blendshapes](https://arkit-face-blendshapes.com/)** (the standard `jawOpen`, `mouthFunnel`, `eyeBlinkLeft`, … morph targets). Same shared mouth engine as the flat presets drives them, so the model talks, blinks and follows the cursor. The three.js stack is optional and lazy-loaded — same deal as `vrm`, minus `@pixiv/three-vrm`:

```bash
npm install three @react-three/fiber @react-three/drei
```

```tsx
<RealtimeAvatar
  state={aiState}
  analyser={analyser}
  variant="glb"
  glbUrl="/models/rocketbox.glb" // CORS-enabled .glb with ARKit morph targets
/>
```

**Recommended example asset — Microsoft Rocketbox (MIT).** [Rocketbox](https://github.com/microsoft/Microsoft-Rocketbox) ships 115 rigged avatars with an ARKit-compatible blendshape variant, under the **MIT license** — the cleanest fit for this library's no-attribution-headaches philosophy. Rocketbox distributes `.fbx`, so convert one avatar to `.glb` once (offline, via [FBX2GLTF](https://github.com/facebookincubator/FBX2glTF) or Blender's glTF 2.0 export, keeping the blendshapes) and drop it in `public/models/`. Keep the MIT notice alongside it. [Ready Player Me](https://docs.readyplayer.me/ready-player-me/api-reference/avatars/morph-targets/apple-arkit) avatars (`?morphTargets=ARKit`) also work out of the box.

## Bring your own SVG (`byos`)

Any SVG exposing these stable hooks is animated by the runtime — same blink, gaze, mouth and thinking behavior as the built-in presets:

| hook | part | the runtime drives |
|---|---|---|
| `#rra-ring` | state ring | `stroke` = `stateColors[state]` |
| `#rra-mouth` | mouth | ellipse: `ry`/`rx` · rect: `height` |
| `.rra-pupil` (×2) | pupils | circle: `cx`/`cy` · rect: `x`/`y` (mouse tracking, thinking gaze) |
| `.rra-lid` (×2) | eyelids | `height` (blink; 0 = open) |
| `#rra-think` | thought bubble | `opacity` + dots pulsing while `thinking` |

Optional data attributes: `data-base-x`/`data-base-y` (pupil rest position), `data-max-height` (closed lid height), `data-quantize` (snap motion to a grid — that's how the pixel-art preset stays chunky).

```tsx
<RealtimeAvatar state={aiState} analyser={analyser} variant="byos">
  <MyOwnSvgAvatar /> {/* exposes the #rra-* hooks; its license is your business */}
</RealtimeAvatar>
```

## API reference

### `<RealtimeAvatar />`

- `state` (`'idle' | 'listening' | 'thinking' | 'speaking'`) — required. You resolve it; it is never inferred.
- `analyser` (`AnalyserNode | null`) — optional. Drives the mouth from audio. Omitted or `null`, speaking falls back to the synthetic pattern.
- `streamingText` (`string`) — optional. Declarative mouth driver: pass the accumulated assistant text (e.g. from `useChat`) and the avatar diffs its growth to drive the mouth. Takes precedence over `analyser`. See [Text-streaming LLMs](#text-streaming-llms-no-audio).
- `speechActivity` (`SpeechActivitySource`) — optional. Imperative token-rate mouth driver, from `createSpeechActivity()`. Takes precedence over both `streamingText` and `analyser` when set.
- `size` (`number`) — px, default `280`.
- `variant` — see catalog above. Default `'geometric'`.
- `children` — your SVG, for `variant="byos"`.
- `vrmUrl` (`string`) — CORS-enabled `.vrm` URL, for `variant="vrm"`.
- `glbUrl` (`string`) — CORS-enabled `.glb` URL with ARKit blendshapes, for `variant="glb"`.
- `dicebearCollection` (`string`) — DiceBear style id (curated CC0 set), for `variant="dicebear"`.
- `dicebearSeed` (`string`) — deterministic DiceBear seed, for `variant="dicebear"`.
- `subtitle` / `thought` (`string`) — optional movie-style captions and a thought bubble.
- `showSubtitle` (`boolean`) — default `true`.
- `maxMouthOpening`, `mouseTrackingIntensity`, `blinkIntervalMin/Max`, `blinkDuration` — animation tuning.
- `stateColors`, `stateLabels` — theming; labels are announced via `aria-live`.
- `customization` — preset colors and accessories (skin, hair, clothing, glasses, headphones…).

### Building blocks

Everything the runtime uses is exported, so you can compose your own:

- `ContractAvatar` — wraps any contract-compliant SVG with the runtime.
- `useAvatarRuntime(containerRef, options)` — the animation runtime itself.
- `createMouthEngine(source)` / `useAudioMouth(...)` — the source→mouth analysis (amplitude + A/E/O shapes), procedural fallback included. `source` is an `AnalyserNode`, a `SpeechActivitySource`, or `null`.
- `createSpeechActivity(options?)` — the token-rate mouth driver for text streams (`push` / `end` / `reset` / `sample`).
- `useStreamingTextActivity(text)` — declarative wrapper: diffs accumulated streaming text into a `SpeechActivitySource` for you (what the `streamingText` prop uses).
- `useReducedMotion()` — SSR-safe `prefers-reduced-motion` hook.
- `GeometricAvatar`, `MemojiAvatar`, `PixelArtAvatar`, `DoodleAvatar` — the raw presets.
- `AudioVisualizer` — Siri-style waveform telemetry strip.

## Getting an `AnalyserNode`

The standard recipe for base64 PCM streams (what Gemini Live / OpenAI Realtime return):

```ts
const audioCtx = new AudioContext({ sampleRate: 24000 });
const analyser = audioCtx.createAnalyser();
analyser.fftSize = 256;
analyser.connect(audioCtx.destination);

function playAudioChunk(pcmData: Float32Array) {
  const buffer = audioCtx.createBuffer(1, pcmData.length, 24000);
  buffer.getChannelData(0).set(pcmData);
  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  source.connect(analyser); // <- the analyser you pass to <RealtimeAvatar />
  source.start();
}
```

## Text-streaming LLMs (no audio)

Not every assistant speaks. For a text-only LLM that streams tokens — OpenAI-style `/chat/completions` or `/responses` with `stream: true`, or local servers like Ollama / LM Studio / vLLM — there's no `AnalyserNode` to read. Instead, drive the mouth from **token cadence**: the rhythm of arriving text becomes the same 0..1 energy signal the audio path produces. The mouth is busy while the model emits text and settles shut on pauses or when the stream ends. The library still never fetches anything — you own the stream, it owns the face.

There are two ways to feed it, matching the two ways React apps consume streams.

### Declarative — `streamingText` (the easy path)

If you use a streaming chat hook — the [Vercel AI SDK](https://sdk.vercel.ai)'s `useChat` is the de-facto standard — you never see raw chunks: you get the **accumulated** assistant message (it grows each render) plus a `status`. Both map straight onto the avatar. Pass the text, the avatar diffs its growth internally and drives the mouth. No refs, no reader loop:

```tsx
import { useChat } from '@ai-sdk/react';
import { RealtimeAvatar } from 'react-ai-avatar';
import 'react-ai-avatar/style.css';

function ChatAvatar() {
  const { messages, status } = useChat();
  const last = messages.at(-1);

  return (
    <RealtimeAvatar
      // status: 'submitted' (awaiting first token) | 'streaming' | 'ready'
      state={status === 'submitted' ? 'thinking' : status === 'streaming' ? 'speaking' : 'idle'}
      streamingText={last?.role === 'assistant' ? last.text : ''}
    />
  );
}
```

That's the whole integration. `streamingText` takes precedence over `analyser`; the ambient glow reacts to it too. Works with every variant — flat presets, DiceBear, VRM and GLB.

### Imperative — `createSpeechActivity()` (you own the reader loop)

Hand-rolling `fetch` or driving the OpenAI SDK's `for await` yourself? Then you *do* have the raw chunks — feed their cadence directly with a `SpeechActivitySource`:

```tsx
import { RealtimeAvatar, createSpeechActivity } from 'react-ai-avatar';
import 'react-ai-avatar/style.css';
import { useRef, useState } from 'react';

function TextAvatar() {
  const speech = useRef(createSpeechActivity()).current;
  const [state, setState] = useState<'idle' | 'thinking' | 'speaking'>('idle');
  const [subtitle, setSubtitle] = useState('');

  async function ask(prompt: string) {
    setState('thinking');
    speech.reset();
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] }),
    });
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let text = '';
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value); // your SSE/delta parsing here
      text += chunk;
      speech.push(chunk);   // <- feed token cadence to the mouth
      setSubtitle(text);
      setState('speaking');
    }
    speech.end();
    setState('idle');
  }

  return <RealtimeAvatar state={state} speechActivity={speech} subtitle={subtitle} />;
}
```

`createSpeechActivity(options?)` accepts `chargePerChar`, `decayMs` and `maxChargePerPush` to tune how wide / how fast the mouth reacts. The returned source has `push(chunk)`, `end()`, `reset()` (drop energy on an interrupted turn) and `sample()`. When `speechActivity` is provided it takes precedence over both `streamingText` and `analyser`. (`streamingText` is just this, with the diffing done for you — under the hood it's the exported `useStreamingTextActivity` hook.)

> The demo dashboard ships this end-to-end: toggle **TEXT (STREAM)** to talk to an OpenAI-compatible endpoint (set `OPENAI_BASE_URL` / `OPENAI_API_KEY` / `OPENAI_MODEL`, or leave them unset / `MOCK_REALTIME=true` for a no-key mock). See `src/demo/useStreamingLLM.ts` and the `/api/chat` route in `server.ts`.

## Positioning

The closest reference is [TalkingHead](https://github.com/met4citizen/TalkingHead) (3D, realistic lip-sync, Ready Player Me/Mixamo rigs). This library makes the opposite bet:

| | TalkingHead & co. | react-ai-avatar |
|---|---|---|
| Star of the show | the realistic human avatar | the LLM's speech + **state** flow |
| Avatar | 3D full-body rigged | flat SVG, minimal (3D optional, not the focus) |
| Technical focus | lip-sync fidelity | state + audio reactivity, simplicity |
| Makes visible | the voice | the *thinking* |
| Setup | avatar platform + Blender + rig | `npm i` + one component |

## Demo / development

The repo ships a demo dashboard (Gemini Live + a no-API-key mock):

```bash
npm install
npm run dev        # starts the demo at :3000 (MOCK_REALTIME=true needs no API key)
npm test           # vitest: engine, layer contract, SSR, parsers
npm run build:lib  # builds the publishable package into dist/lib
```

## License

MIT — for the library, the runtime and all built-in presets. Use it commercially, fork it, reskin it. SVGs you bring via `byos` keep whatever license they had.
