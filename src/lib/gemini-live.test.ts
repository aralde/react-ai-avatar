// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import {
  decodePcm16,
  parseSampleRate,
  stateForMessage,
  useGeminiLive,
  type GeminiLive,
} from './gemini-live';

const audio = { serverContent: { modelTurn: { parts: [{ inlineData: { data: 'AAA=' } }] } } };

describe('gemini-live helpers', () => {
  it('reads the sample rate from the mime type, defaulting to 24 kHz', () => {
    expect(parseSampleRate('audio/pcm;rate=16000')).toBe(16000);
    expect(parseSampleRate('audio/pcm')).toBe(24000);
    expect(parseSampleRate(undefined)).toBe(24000);
  });

  it('decodes base64 PCM16 little-endian into floats', () => {
    const bytes = new Uint8Array(new Int16Array([0, 16384, -32768]).buffer);
    const out = decodePcm16(btoa(String.fromCharCode(...bytes)));
    expect(Array.from(out)).toEqual([0, 0.5, -1]);
  });

  it('maps messages to avatar states', () => {
    expect(stateForMessage({ setupComplete: {} })).toBe('listening');
    expect(stateForMessage(audio)).toBe('speaking');
    expect(stateForMessage({ toolCall: {} })).toBe('working');
    expect(stateForMessage({ serverContent: { turnComplete: true } })).toBe('listening');
    expect(stateForMessage({ serverContent: { interrupted: true } })).toBe('listening');
    expect(stateForMessage({ serverContent: {} })).toBeNull();
  });
});

class FakeSource {
  buffer: { duration: number } | null = null;
  onended: (() => void) | null = null;
  stopped = false;
  connect() {}
  start() {}
  stop() {
    this.stopped = true;
  }
  end() {
    this.onended?.();
  }
}

class FakeAudioContext {
  static instances: FakeAudioContext[] = [];
  state = 'running';
  currentTime = 0;
  destination = {};
  sources: FakeSource[] = [];
  closed = false;
  constructor() {
    FakeAudioContext.instances.push(this);
  }
  createAnalyser() {
    return { fftSize: 0, connect() {} };
  }
  createBuffer(_channels: number, length: number, sampleRate: number) {
    return { duration: length / sampleRate, getChannelData: () => new Float32Array(length) };
  }
  createBufferSource() {
    const source = new FakeSource();
    this.sources.push(source);
    return source;
  }
  resume() {
    return Promise.resolve();
  }
  close() {
    this.closed = true;
    return Promise.resolve();
  }
}

function renderGeminiLive() {
  const result: { current: GeminiLive } = { current: null as unknown as GeminiLive };
  function Probe() {
    result.current = useGeminiLive();
    return null;
  }
  const root = createRoot(document.createElement('div'));
  act(() => root.render(createElement(Probe)));
  return { result, unmount: () => act(() => root.unmount()) };
}

describe('useGeminiLive', () => {
  const OriginalAudioContext = globalThis.AudioContext;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    FakeAudioContext.instances = [];
    globalThis.AudioContext = FakeAudioContext as unknown as typeof AudioContext;
  });

  afterEach(() => {
    globalThis.AudioContext = OriginalAudioContext;
  });

  it('stays speaking after turnComplete until the queued audio ends', () => {
    const { result, unmount } = renderGeminiLive();
    expect(result.current.avatar).toEqual({ state: 'idle', analyser: null });

    act(() => result.current.onMessage(audio));
    act(() => result.current.onMessage(audio));
    expect(result.current.avatar.state).toBe('speaking');
    expect(result.current.avatar.analyser).not.toBeNull();

    const [first, second] = FakeAudioContext.instances[0].sources;
    act(() => result.current.onMessage({ serverContent: { turnComplete: true } }));
    expect(result.current.avatar.state).toBe('speaking');

    act(() => first.end());
    expect(result.current.avatar.state).toBe('speaking');
    act(() => second.end());
    expect(result.current.avatar.state).toBe('listening');
    unmount();
  });

  it('switches to listening at once on a turnComplete with nothing queued', () => {
    const { result, unmount } = renderGeminiLive();
    act(() => result.current.onMessage({ serverContent: { turnComplete: true } }));
    expect(result.current.avatar.state).toBe('listening');
    unmount();
  });

  it('stops the queued audio and listens when interrupted', () => {
    const { result, unmount } = renderGeminiLive();
    act(() => result.current.onMessage(audio));
    act(() => result.current.onMessage(audio));
    act(() => result.current.onMessage({ serverContent: { interrupted: true } }));

    const sources = FakeAudioContext.instances[0].sources;
    expect(sources.every((s) => s.stopped)).toBe(true);
    expect(result.current.avatar.state).toBe('listening');
    unmount();
  });

  it('returns to idle with no analyser on close and drops a pending transition', () => {
    const { result, unmount } = renderGeminiLive();
    act(() => result.current.onMessage(audio));
    act(() => result.current.onMessage({ serverContent: { turnComplete: true } }));
    act(() => result.current.onClose());

    expect(result.current.avatar).toEqual({ state: 'idle', analyser: null });
    expect(FakeAudioContext.instances[0].closed).toBe(true);

    act(() => FakeAudioContext.instances[0].sources[0].end());
    expect(result.current.avatar.state).toBe('idle');
    unmount();
  });
});
