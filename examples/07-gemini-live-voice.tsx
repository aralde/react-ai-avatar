/**
 * 07 · Realtime voice (Gemini Live / OpenAI Realtime) — the full pipeline.
 *
 * This is the production shape: a relay server (the repo's `server.ts`) holds
 * the model API key and proxies a WebSocket at `/live`; the browser streams mic
 * audio up and plays the model's base64 PCM back down, routing every decoded
 * chunk through one `AnalyserNode` that it hands to the avatar.
 *
 * The library is unchanged from every other example — only the *source* of the
 * `state` + `analyser` differs. The connection logic below is condensed; the
 * repo ships the battle-tested version in `src/demo/useGeminiLive.ts` +
 * `src/demo/audio.ts`, and the relay (real Gemini or a no-key mock) in
 * `server.ts`. Prefer reusing those — this file shows the moving parts.
 *
 * Run: clone the repo and `npm run dev` (MOCK_REALTIME=true needs no API key).
 */
import { useEffect, useRef, useState } from 'react';
import { RealtimeAvatar } from 'react-ai-avatar';
import type { AvatarState } from 'react-ai-avatar';
import 'react-ai-avatar/style.css';

export default function GeminiLiveVoice() {
  const [state, setState] = useState<AvatarState>('idle');
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const nextStartRef = useRef(0);

  function connect() {
    const ctx = new AudioContext({ sampleRate: 24000 });
    const node = ctx.createAnalyser();
    node.fftSize = 256;
    node.connect(ctx.destination);
    ctxRef.current = ctx;
    setAnalyser(node);

    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${proto}//${location.host}/live`);
    wsRef.current = ws;

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.connected) setState('listening');
      if (msg.audio) {
        setState('speaking');
        playPcmChunk(msg.audio, ctx, node, nextStartRef);
      }
      if (msg.turnComplete) setState('listening');
    };
    ws.onclose = () => disconnect();
  }

  function disconnect() {
    wsRef.current?.close();
    wsRef.current = null;
    ctxRef.current?.close();
    ctxRef.current = null;
    setAnalyser(null);
    setState('idle');
  }

  useEffect(() => () => disconnect(), []);

  return (
    <div style={{ display: 'grid', gap: 16, justifyItems: 'center' }}>
      <RealtimeAvatar state={state} analyser={analyser} />
      <button onClick={wsRef.current ? disconnect : connect}>
        {wsRef.current ? 'Disconnect' : 'Connect to /live'}
      </button>
    </div>
  );
}

/** Decode base64 PCM16 @24kHz, schedule it gaplessly, route through the analyser. */
function playPcmChunk(
  base64: string,
  ctx: AudioContext,
  analyser: AnalyserNode,
  nextStartRef: { current: number }
) {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const pcm16 = new Int16Array(bytes.buffer);
  const float = new Float32Array(pcm16.length);
  for (let i = 0; i < pcm16.length; i++) float[i] = pcm16[i] / 32768;

  const buffer = ctx.createBuffer(1, float.length, 24000);
  buffer.getChannelData(0).set(float);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(analyser); // <- the analyser the avatar reads

  const start = Math.max(ctx.currentTime, nextStartRef.current);
  source.start(start);
  nextStartRef.current = start + buffer.duration;
}
