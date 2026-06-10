import { describe, it, expect } from 'vitest';
import { generateMockAudioChunk, getAudioEnergy } from './serverUtils';

describe('serverUtils', () => {
  describe('generateMockAudioChunk', () => {
    it('should generate a base64 audio chunk and update the phase', () => {
      const durationMs = 30;
      const initialPhase = 0.5;
      const sampleRate = 24000;

      const result = generateMockAudioChunk(durationMs, initialPhase, sampleRate);

      expect(result).toHaveProperty('base64');
      expect(result).toHaveProperty('nextPhase');
      expect(typeof result.base64).toBe('string');
      expect(typeof result.nextPhase).toBe('number');
      expect(result.nextPhase).toBeGreaterThan(initialPhase);

      // Verify base64 decode gives the correct size buffer
      // 24000 samples/sec * 0.030 sec = 720 samples
      // 720 samples * 2 bytes/sample = 1440 bytes
      const decodedBuffer = Buffer.from(result.base64, 'base64');
      expect(decodedBuffer.length).toBe(1440);
    });

    it('should generate different base64 output depending on duration', () => {
      const chunkShort = generateMockAudioChunk(10, 0);
      const chunkLong = generateMockAudioChunk(50, 0);

      const bufferShort = Buffer.from(chunkShort.base64, 'base64');
      const bufferLong = Buffer.from(chunkLong.base64, 'base64');

      expect(bufferLong.length).toBeGreaterThan(bufferShort.length);
    });
  });

  describe('getAudioEnergy', () => {
    it('should return 0 for empty base64 data', () => {
      const energy = getAudioEnergy('');
      expect(energy).toBe(0);
    });

    it('should return 0 for silence (all zeros)', () => {
      const silenceBuffer = Buffer.alloc(100); // 50 samples of 0
      const base64 = silenceBuffer.toString('base64');
      const energy = getAudioEnergy(base64);
      expect(energy).toBe(0);
    });

    it('should calculate the precise RMS (Root Mean Square) energy of a signal', () => {
      // Create a small buffer with known sample values: [10, -10, 10, -10]
      // RMS formula: sqrt( (10^2 + (-10)^2 + 10^2 + (-10)^2) / 4 )
      // = sqrt( (100 + 100 + 100 + 100) / 4 ) = sqrt(400 / 4) = sqrt(100) = 10
      const buffer = Buffer.alloc(8); // 4 samples, 2 bytes per sample
      buffer.writeInt16LE(10, 0);
      buffer.writeInt16LE(-10, 2);
      buffer.writeInt16LE(10, 4);
      buffer.writeInt16LE(-10, 6);

      const base64 = buffer.toString('base64');
      const energy = getAudioEnergy(base64);

      expect(energy).toBeCloseTo(10);
    });

    it('should calculate non-zero energy for generated mock audio', () => {
      const chunk = generateMockAudioChunk(30, 0);
      const energy = getAudioEnergy(chunk.base64);
      expect(energy).toBeGreaterThan(0);
    });
  });
});
