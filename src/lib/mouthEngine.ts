/**
 * Shared mouth-animation engine.
 *
 * One implementation for every avatar variant (SVG presets, VRM, byos):
 * given an AnalyserNode it produces a per-frame amplitude level plus a
 * coarse mouth shape (A/E/O) derived from frequency-band ratios. Given
 * `null` it degrades gracefully to a synthetic, speech-like procedural
 * pattern — the mouth never freezes shut while "speaking".
 *
 * This is intentionally amplitude-based ("audio-reactive mouth"), not
 * phoneme-accurate lip-sync: an AnalyserNode gives energy, not phonemes.
 */

export type MouthShape = 'a' | 'e' | 'o' | 'closed';

export interface MouthFrame {
  /** Normalized mouth-opening level, 0 (closed) to 1 (max). */
  level: number;
  /** Coarse mouth shape suggestion for the current frame. */
  shape: MouthShape;
}

export interface MouthEngine {
  /** Read the next frame. Call once per animation frame. */
  read(): MouthFrame;
}

/** Minimum level under which the mouth is considered closed. */
const SILENCE_THRESHOLD = 0.05;

function createAnalyserEngine(analyser: AnalyserNode): MouthEngine {
  let timeData = new Uint8Array(analyser.frequencyBinCount);
  let freqData = new Uint8Array(analyser.frequencyBinCount);

  return {
    read(): MouthFrame {
      // fftSize may be mutated elsewhere (e.g. a visualizer sharing the
      // node) — keep buffers in sync instead of crashing.
      if (timeData.length !== analyser.frequencyBinCount) {
        timeData = new Uint8Array(analyser.frequencyBinCount);
        freqData = new Uint8Array(analyser.frequencyBinCount);
      }

      analyser.getByteTimeDomainData(timeData);

      let maxDev = 0;
      for (let i = 0; i < timeData.length; i++) {
        const dev = Math.abs(timeData[i] - 128);
        if (dev > maxDev) maxDev = dev;
      }
      const level = Math.min(1, maxDev / 128);

      if (level <= SILENCE_THRESHOLD) {
        return { level: 0, shape: 'closed' };
      }

      analyser.getByteFrequencyData(freqData);

      const sampleRate = analyser.context.sampleRate || 24000;
      const binWidth = sampleRate / 2 / analyser.frequencyBinCount;
      const band = (fromHz: number, toHz: number) => {
        let sum = 0;
        const from = Math.round(fromHz / binWidth);
        const to = Math.min(Math.round(toHz / binWidth), freqData.length - 1);
        for (let i = from; i <= to; i++) sum += freqData[i];
        return sum;
      };

      const low = band(200, 800);
      const mid = band(800, 1800);
      const high = band(1800, 3200);
      const total = low + mid + high + 0.001;
      const ratioHigh = high / total;
      const ratioMid = mid / total;

      let shape: MouthShape = 'a';
      if (ratioHigh > 0.35) {
        shape = 'e'; // bright energy -> stretched/smiling mouth
      } else if (ratioMid > 0.4 && ratioHigh < 0.2) {
        shape = 'o'; // mid-heavy energy -> rounded/narrow mouth
      }

      return { level, shape };
    },
  };
}

function createProceduralEngine(): MouthEngine {
  // Random start phase so multiple avatars don't talk in unison.
  let phase = Math.random() * 100;

  return {
    read(): MouthFrame {
      // Tuned for ~60fps callers; a sum of detuned sines approximates the
      // syllable cadence of speech without being periodic to the eye.
      phase += 0.18;
      const amp =
        0.35 +
        0.30 * Math.sin(phase) +
        0.25 * Math.sin(phase * 1.7 + 1.3) +
        0.10 * Math.sin(phase * 3.1);
      const level = Math.min(1, Math.max(0, amp));

      if (level <= SILENCE_THRESHOLD + 0.03) {
        return { level: 0, shape: 'closed' };
      }

      // Slow pseudo-random drift between mouth shapes.
      const s = Math.sin(phase * 0.43);
      const shape: MouthShape = s > 0.55 ? 'o' : s < -0.6 ? 'e' : 'a';

      return { level, shape };
    },
  };
}

/**
 * Create a mouth engine for the given analyser. Pass `null` to get the
 * procedural (synthetic) fallback engine.
 */
export function createMouthEngine(analyser: AnalyserNode | null): MouthEngine {
  return analyser ? createAnalyserEngine(analyser) : createProceduralEngine();
}
