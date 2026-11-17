import { describe, it, expect } from 'vitest';
import { decodePcm16, parseSampleRate, stateForMessage } from './gemini-live';

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
