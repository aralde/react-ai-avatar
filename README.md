# React Realtime Avatar 🗣️✨

A lightweight, ultra-configurable React library for building real-time conversational avatars. 

**It is completely LLM-agnostic.** It doesn't care if you use Gemini Live, OpenAI Realtime, 11labs, or a standard WebRTC stream. You just pass it an `AnalyserNode` and a `state`, and it handles the real-time lip-syncing (visemes) and UI animations out of the box.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Why this approach? (Zero AI Dependencies)

By decoupling the avatar from the AI provider (Steps 1, 2, and 3), this library avoids forcing unnecessary dependencies (like `@google/genai` or `openai`) into your bundle. 

Your host app handles the microphone and WebSocket connection. This library **only handles Step 4**: turning audio data into beautiful, real-time visemes and state animations.

## Features

- 👄 **Real-time Lip-sync:** Analyzes audio frequencies on the fly to generate visemes (mouth movements) without heavy external ML libraries.
- 🎨 **Multiple Built-in Avatars:** Comes with several animated SVG avatars out of the box (`default`, `developer`, `developer2`), powered by `motion/react`.
- 🤖 **AI-Powered CLI (Avatar Builder):** Convert any static SVG into an animated, lip-syncing React component automatically using LLMs.
- 🧠 **State Management:** Reacts to clear states (`idle`, `listening`, `thinking`, `speaking`) to easily sync with your AI's logic.
- 🔌 **Provider Agnostic:** Works with Gemini Live, OpenAI Realtime API, WebRTC, or any standard HTML5 `<audio>` element.

## Installation

```bash
npm install react-realtime-avatar motion
```

*(Note: `motion` is the only peer dependency required for the SVG animations).*

## Quick Start

Here is how you use the component. You just need to provide the current `state` of your AI, and the Web Audio API `AnalyserNode` that is playing the AI's voice. Remember to import the library's CSS for styles and animations.

```tsx
import React from 'react';
import { RealtimeAvatar } from 'react-realtime-avatar';
import 'react-realtime-avatar/style.css'; // Essential for styles & animations!

export default function App() {
  // 1. Manage these in your app (via Gemini, OpenAI, etc.)
  const aiState = 'speaking'; // 'idle' | 'listening' | 'thinking' | 'speaking'
  const audioAnalyser = myCustomAudioSetup(); // Returns an AnalyserNode

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
      <RealtimeAvatar 
        state={aiState} 
        analyser={audioAnalyser} 
        size={250} 
        variant="developer2" // Choose: 'default' | 'developer' | 'developer2' | 'custom'
      />
    </div>
  );
}
```

## Public API & Exports

The library exposes the following building blocks:

- **`<RealtimeAvatar />`**: The primary talking avatar component.
- **`<AudioVisualizer />`**: A stunning, real-time Siri-style audio waveform telemetry visualizer.
- **`useGeminiLive()`**: A React hook that abstracts WebSockets, microphone streaming, and audio playback for Gemini Live API.
- **`AudioStreamer`**: Helper class to handle real-time PCM audio playback buffer via Web Audio API.
- **`MicRecorder`**: Helper class to record user microphone at $16\text{ kHz}$ sample rate.

### Using the Audio Visualizer

```tsx
import { AudioVisualizer } from 'react-realtime-avatar';
import 'react-realtime-avatar/style.css';

// Render a live visualizer synced to the state
<AudioVisualizer analyser={audioAnalyser} state={aiState} height={80} />
```

## API Reference

### `<RealtimeAvatar />`

A ready-to-use SVG avatar that reacts to the audio stream and conversation state.

**Props:**
- `state` (`'idle' | 'listening' | 'thinking' | 'speaking'`): Required. Controls the aura color, idle animations, and whether the mouth should be reading the analyser.
- `analyser` (`AnalyserNode | null`): Required. The Web Audio API node used to calculate mouth opening and width in real-time. If `null`, the avatar stays in its idle mouth pose.
- `size` (`number`): Optional. The width and height of the avatar in pixels. Default is `280`.
- `variant` (`'default' | 'developer' | 'developer2' | 'custom'`): Optional. Selects the avatar style. Default is `'default'`.
- `subtitle` (`string`): Optional. Text subtitles to display below the avatar.
- `thought` (`string`): Optional. Thinking processes/internal thoughts to display in a floating bubble above the avatar.
- `showSubtitle` (`boolean`): Optional. Whether to render subtitles and thoughts. Default is `true`.

## 🪄 The Avatar Builder CLI (AI-Powered & Agentic)

Don't want to use the built-in avatars? You can turn **any static SVG** into a fully animated, lip-syncing React component automatically.

Our new **Agentic Build Process** solves common issues with LLM code generation (like truncated SVGs) by using a hybrid approach:

1. **Zero Truncation Guarantee:** Instead of asking the LLM to rewrite your entire SVG (which often exceeds token limits and causes broken/truncated files), the builder imports your SVG dynamically using Vite's `?raw` import. The original file remains untouched and perfectly intact.
2. **Automatic Layer Identification:** You don't need designers to manually name layers (`id="mouth"`, `id="eye"`). The agent analyzes the SVG structure, colors, and positions to automatically identify facial features (eyes, mouth, head) using smart heuristics and LLM reasoning.
3. **Quality Assurance:** The build process acts as an agent, verifying that the generated component correctly targets the identified layers before finalizing the build.

### How to use it:

1. Export a static SVG from Figma or Illustrator (e.g., `mi-av-5.svg`).
2. Run the builder script:

```bash
# Requires GEMINI_API_KEY in your environment
npx tsx scripts/build-avatar.ts mi-av-5.svg
```

3. The CLI will generate a `CustomAvatar.tsx` file in your components folder that dynamically loads your SVG.
4. Import and use it! The generated component will automatically handle blinking and real-time lip-syncing driven by the `analyser`, targeting the correct paths automatically.

## Example: Connecting to Gemini Live or OpenAI

While the library doesn't include the connection logic to keep the bundle small, here is the standard recipe to get an `AnalyserNode` from an incoming base64 audio stream (which is what Gemini and OpenAI return):

```ts
// 1. Create an AudioContext
const audioCtx = new AudioContext({ sampleRate: 24000 });

// 2. Create the AnalyserNode (Pass this to <RealtimeAvatar />)
const analyser = audioCtx.createAnalyser();
analyser.fftSize = 256;
analyser.connect(audioCtx.destination);

// 3. When you receive audio from your AI (e.g., via WebSocket):
function playAudioChunk(base64Audio) {
  // Decode base64 to Float32Array
  // ... (standard base64 to PCM conversion) ...
  
  const buffer = audioCtx.createBuffer(1, pcmData.length, 24000);
  buffer.getChannelData(0).set(pcmData);

  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  
  // Connect the source to the analyser!
  source.connect(analyser);
  source.start();
}
```

## Advanced: Custom 3D/2D Avatars

If you want to use **React Three Fiber** or your own custom SVG, you can build your own component and just use the `analyser` directly to drive your 3D blend shapes:

```tsx
import { useEffect } from 'react';

function MyCustom3DAvatar({ analyser, state }) {
  useEffect(() => {
    if (!analyser || state !== 'speaking') return;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    let animationFrameId;

    const renderLoop = () => {
      analyser.getByteFrequencyData(dataArray);
      
      // Calculate volume (0-255)
      const volume = dataArray.reduce((a, b) => a + b) / dataArray.length;
      
      // Map 'volume' to your 3D model's jaw bone or blend shapes here!
      // myModel.nodes.Jaw.rotation.x = volume * 0.01;

      animationFrameId = requestAnimationFrame(renderLoop);
    };
    
    renderLoop();

    return () => cancelAnimationFrame(animationFrameId);
  }, [analyser, state]);

  return <canvas>...</canvas>;
}
```

## License

MIT License - feel free to use this in your own projects, commercial or personal!
