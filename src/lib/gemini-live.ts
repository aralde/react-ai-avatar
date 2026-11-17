import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AvatarState } from './types';

/**
 * Structural subset of `@google/genai`'s `LiveServerMessage`, so the adapter
 * type-checks against the SDK without importing it at runtime.
 */
export interface GeminiLiveMessage {
  setupComplete?: unknown;
  toolCall?: unknown;
  serverContent?: {
    interrupted?: boolean;
    turnComplete?: boolean;
    modelTurn?: {
      parts?: Array<{ inlineData?: { data?: string; mimeType?: string } }>;
    };
  };
}

export interface GeminiLiveAvatarProps {
  state: AvatarState;
  analyser: AnalyserNode | null;
}

export interface GeminiLive {
  /** Spread into `RealtimeAvatar` or `VideoAvatar`: `<RealtimeAvatar {...live.avatar} />`. */
  avatar: GeminiLiveAvatarProps;
  /** Pass as `callbacks.onmessage` to `ai.live.connect()`. */
  onMessage: (message: GeminiLiveMessage) => void;
  /** Pass as `callbacks.onclose`. Stops playback and returns the avatar to idle. */
  onClose: () => void;
  /** Stop playback and return to idle without waiting for the session to close. */
  reset: () => void;
}

const DEFAULT_SAMPLE_RATE = 24000;

export function parseSampleRate(mimeType: string | undefined): number {
  const rate = mimeType?.match(/rate=(\d+)/)?.[1];
  return rate ? Number(rate) : DEFAULT_SAMPLE_RATE;
}

export function decodePcm16(base64: string): Float32Array {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const pcm = new Int16Array(bytes.buffer, 0, bytes.length >> 1);
  const out = new Float32Array(pcm.length);
  for (let i = 0; i < pcm.length; i++) out[i] = pcm[i] / 32768;
  return out;
}

/** The avatar state a message implies, or `null` when it doesn't change it. */
export function stateForMessage(message: GeminiLiveMessage): AvatarState | null {
  const content = message.serverContent;
  if (content?.interrupted || content?.turnComplete) return 'listening';
  if (message.toolCall) return 'working';
  if (content?.modelTurn?.parts?.some((p) => p.inlineData?.data)) return 'speaking';
  if (message.setupComplete) return 'listening';
  return null;
}

/**
 * Gemini Live adapter: drives the avatar's state and mouth from a live
 * session's messages, and plays the model's PCM audio through one analyser.
 *
 * ```tsx
 * const live = useGeminiLive();
 * const session = await ai.live.connect({
 *   model,
 *   callbacks: { onmessage: live.onMessage, onclose: live.onClose },
 * });
 * return <RealtimeAvatar {...live.avatar} />;
 * ```
 */
export function useGeminiLive(): GeminiLive {
  const [state, setState] = useState<AvatarState>('idle');
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartRef = useRef(0);

  const stopPlayback = useCallback(() => {
    for (const source of sourcesRef.current) {
      try {
        source.stop();
      } catch {
        /* already ended */
      }
    }
    sourcesRef.current.clear();
    nextStartRef.current = 0;
  }, []);

  const teardown = useCallback(() => {
    stopPlayback();
    ctxRef.current?.close().catch(() => {});
    ctxRef.current = null;
    analyserRef.current = null;
    setAnalyser(null);
  }, [stopPlayback]);

  const play = useCallback((base64: string, sampleRate: number) => {
    let ctx = ctxRef.current;
    let node = analyserRef.current;
    if (!ctx || !node) {
      ctx = new AudioContext({ sampleRate });
      node = ctx.createAnalyser();
      node.fftSize = 256;
      node.connect(ctx.destination);
      ctxRef.current = ctx;
      analyserRef.current = node;
      setAnalyser(node);
    }
    if (ctx.state === 'suspended') void ctx.resume();

    const samples = decodePcm16(base64);
    if (!samples.length) return;
    const buffer = ctx.createBuffer(1, samples.length, sampleRate);
    buffer.getChannelData(0).set(samples);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(node);
    source.onended = () => sourcesRef.current.delete(source);
    sourcesRef.current.add(source);

    const start = Math.max(ctx.currentTime, nextStartRef.current);
    source.start(start);
    nextStartRef.current = start + buffer.duration;
  }, []);

  const onMessage = useCallback(
    (message: GeminiLiveMessage) => {
      const content = message.serverContent;
      if (content?.interrupted) stopPlayback();
      for (const part of content?.modelTurn?.parts ?? []) {
        const inline = part.inlineData;
        if (inline?.data) play(inline.data, parseSampleRate(inline.mimeType));
      }
      const next = stateForMessage(message);
      if (next) setState(next);
    },
    [play, stopPlayback]
  );

  const reset = useCallback(() => {
    teardown();
    setState('idle');
  }, [teardown]);

  useEffect(() => teardown, [teardown]);

  return useMemo(
    () => ({ avatar: { state, analyser }, onMessage, onClose: reset, reset }),
    [state, analyser, onMessage, reset]
  );
}
