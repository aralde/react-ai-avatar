# react-realtime-avatar

> A presentational React avatar for realtime LLM voice UIs — **you bring the connection, it brings the face.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A lightweight, MIT-licensed React library that renders an animated avatar reacting to your AI's conversation state and audio. It is **completely LLM-agnostic**: it doesn't know about Gemini, OpenAI or ElevenLabs. You pass two live things — a `state` and (optionally) a WebAudio `AnalyserNode` — and it does the rest.

```tsx
import { RealtimeAvatar } from 'react-realtime-avatar';
import 'react-realtime-avatar/style.css';

<RealtimeAvatar state="speaking" analyser={myAnalyser} size={300} variant="geometric" />
```

## Philosophy

One thing, done well, embeddable in a few lines, no backend, MIT. The library handles exactly one step of your voice pipeline: turning audio amplitude + state changes into a face that visibly **listens, thinks and speaks**. Your host app keeps the microphone, the WebSocket and the AI provider — none of those dependencies enter your bundle.

## Features

- 👄 **Audio-reactive mouth** — analyzes amplitude and frequency bands in real time. This is deliberately *not* phoneme-perfect "lip-sync": an `AnalyserNode` gives energy, not phonemes, and for flat avatars amplitude is what looks right.
- 🦺 **Graceful degradation** — `analyser={null}` while `state="speaking"`? The mouth animates with a synthetic speech-like pattern instead of freezing. Perfect for demos and non-WebRTC apps.
- 🧠 **A visible `thinking` state** — pulsing thought bubble + upward gaze. Your users *see* the LLM thinking, not just a color change.
- 🎨 **Own-design avatar catalog** — `geometric`, `memoji`, `pixelart`, `doodle`: four MIT, CC0-safe SVG presets. No third-party assets, no attribution headaches.
- 🔌 **Bring your own SVG (`byos`)** — any SVG implementing the small layer contract gets the full animation runtime for free. Your avatar, your license.
- ♿ **Production quality** — SSR-safe (Next.js friendly), honors `prefers-reduced-motion`, announces state changes via `aria-live`.
- 🧊 **Optional 3D (VRM)** — `variant="vrm"` renders VRoid/VRM models with visemes and gaze tracking. The three.js stack is an *optional* peer dependency, lazy-loaded only if you use it.

## Installation

```bash
npm install react-realtime-avatar motion
```

`react`, `react-dom` and `motion` are peer dependencies. For the optional VRM variant, also install:

```bash
npm install three @react-three/fiber @react-three/drei @pixiv/three-vrm
```

## Quick start

```tsx
import React from 'react';
import { RealtimeAvatar } from 'react-realtime-avatar';
import 'react-realtime-avatar/style.css';

export default function App() {
  // You resolve these in your app (Gemini, OpenAI Realtime, WebRTC, anything)
  const aiState = 'speaking'; // 'idle' | 'listening' | 'thinking' | 'speaking'
  const analyser = myAudioSetup(); // AnalyserNode | null

  return (
    <RealtimeAvatar
      state={aiState}
      analyser={analyser}
      size={300}
      variant="geometric" // 'geometric' | 'memoji' | 'pixelart' | 'doodle' | 'vrm' | 'byos'
      customization={{ skinColor: '#f5c7a9', hairColor: '#2c2c2c', glasses: true, headphones: true }}
      stateColors={{ idle: '#4b5563', listening: '#3b82f6', thinking: '#8b5cf6', speaking: '#10b981' }}
    />
  );
}
```

## The avatar catalog

| variant | style | notes |
|---|---|---|
| `geometric` | minimal flat geometry | the default; canonical layer-contract example |
| `memoji` | soft volumetric head | radial gradients, glossy eyes, blush |
| `pixelart` | retro 32×32 grid | mouth and pupils move in whole pixels |
| `doodle` | hand-drawn ink sketch | wobbly strokes, sketched thought bubble |
| `vrm` | 3D VRoid/VRM model | optional, lazy-loaded; pass `vrmUrl` |
| `byos` | **your** SVG | pass it as children; see the layer contract |

All built-in presets are original designs licensed MIT — nothing inside this package requires attribution.

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
- `analyser` (`AnalyserNode | null`) — required. Drives the mouth. With `null`, speaking falls back to the synthetic pattern.
- `size` (`number`) — px, default `280`.
- `variant` — see catalog above. Default `'geometric'`.
- `children` — your SVG, for `variant="byos"`.
- `vrmUrl` (`string`) — CORS-enabled `.vrm` URL, for `variant="vrm"`.
- `subtitle` / `thought` (`string`) — optional movie-style captions and a thought bubble.
- `showSubtitle` (`boolean`) — default `true`.
- `maxMouthOpening`, `mouseTrackingIntensity`, `blinkIntervalMin/Max`, `blinkDuration` — animation tuning.
- `stateColors`, `stateLabels` — theming; labels are announced via `aria-live`.
- `customization` — preset colors and accessories (skin, hair, clothing, glasses, headphones…).

### Building blocks

Everything the runtime uses is exported, so you can compose your own:

- `ContractAvatar` — wraps any contract-compliant SVG with the runtime.
- `useAvatarRuntime(containerRef, options)` — the animation runtime itself.
- `createMouthEngine(analyser)` / `useAudioMouth(...)` — the audio→mouth analysis (amplitude + A/E/O shapes), procedural fallback included.
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

## Positioning

The closest reference is [TalkingHead](https://github.com/met4citizen/TalkingHead) (3D, realistic lip-sync, Ready Player Me/Mixamo rigs). This library makes the opposite bet:

| | TalkingHead & co. | react-realtime-avatar |
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
