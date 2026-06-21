/**
 * 04 · Real audio-reactive mouth — wiring up an `AnalyserNode`.
 *
 * The library never touches audio; you give it a WebAudio `AnalyserNode` and it
 * reads amplitude + frequency bands every frame. This is the standard recipe
 * for base64 PCM streams (what Gemini Live / OpenAI Realtime return): create an
 * AudioContext + AnalyserNode once, then route every decoded chunk through the
 * analyser before it reaches the speakers.
 *
 * Here we synthesize a short tone instead of a real model so the example runs
 * standalone — the analyser plumbing is exactly what you'd use in production.
 *
 * Run: npm install react-ai-avatar motion
 */
import { useRef, useState } from 'react';
import { RealtimeAvatar } from 'react-ai-avatar';
import type { AvatarState } from 'react-ai-avatar';
import 'react-ai-avatar/style.css';

export default function AudioAnalyserAvatar() {
  const [state, setState] = useState<AvatarState>('idle');
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  function ensureAudio() {
    if (ctxRef.current) return;
    const ctx = new AudioContext({ sampleRate: 24000 });
    const node = ctx.createAnalyser();
    node.fftSize = 256;
    node.connect(ctx.destination); // analyser -> speakers
    ctxRef.current = ctx;
    analyserRef.current = node;
    setAnalyser(node);
  }

  /**
   * Stand-in for "an audio chunk arrived from the model". In production you'd
   * decode base64 PCM into a Float32Array and `set()` it into a buffer instead
   * of generating a sine wave — the routing through `analyser` is the point.
   */
  function speakOnce() {
    ensureAudio();
    const ctx = ctxRef.current!;
    const analyserNode = analyserRef.current!;
    void ctx.resume();

    setState('speaking');
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 180;
    // Wobble the gain so the mouth opens and closes like speech.
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    for (let t = 0; t < 2; t += 0.12) {
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + t + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.02, ctx.currentTime + t + 0.12);
    }
    osc.connect(gain);
    gain.connect(analyserNode); // <- the analyser you pass to <RealtimeAvatar />
    osc.start();
    osc.stop(ctx.currentTime + 2);
    osc.onended = () => setState('idle');
  }

  return (
    <div style={{ display: 'grid', gap: 16, justifyItems: 'center' }}>
      <RealtimeAvatar state={state} analyser={analyser} />
      <button onClick={speakOnce}>Play a tone (drives the mouth)</button>
    </div>
  );
}
