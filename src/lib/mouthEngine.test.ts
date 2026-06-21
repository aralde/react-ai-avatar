import { describe, it, expect } from 'vitest';
import { createMouthEngine, MouthFrame } from './mouthEngine';
import { SPEECH_ACTIVITY_BRAND, SpeechActivitySource } from './speechActivity';

/** SpeechActivitySource stand-in with a fixed energy reading. */
function fakeSpeechActivity(energy: number): SpeechActivitySource {
  return {
    [SPEECH_ACTIVITY_BRAND]: true,
    push() {},
    end() {},
    reset() {},
    sample: () => energy,
  };
}

/** Minimal AnalyserNode stand-in: injects fixed time/frequency data. */
function fakeAnalyser(opts: {
  peakDeviation: number; // 0..128 deviation from silence in time domain
  energyBands?: { lowHz: [number, number]; value: number }[];
  sampleRate?: number;
  bins?: number;
}): AnalyserNode {
  const bins = opts.bins ?? 128;
  const sampleRate = opts.sampleRate ?? 24000;
  const binWidth = sampleRate / 2 / bins;
  return {
    frequencyBinCount: bins,
    context: { sampleRate },
    getByteTimeDomainData(arr: Uint8Array) {
      arr.fill(128);
      arr[0] = 128 + opts.peakDeviation;
    },
    getByteFrequencyData(arr: Uint8Array) {
      arr.fill(0);
      for (const band of opts.energyBands ?? []) {
        const from = Math.round(band.lowHz[0] / binWidth);
        const to = Math.round(band.lowHz[1] / binWidth);
        for (let i = from; i <= to && i < bins; i++) arr[i] = band.value;
      }
    },
  } as unknown as AnalyserNode;
}

describe('procedural engine (analyser = null)', () => {
  it('produces a moving mouth, not a frozen one', () => {
    const engine = createMouthEngine(null);
    const frames: MouthFrame[] = [];
    for (let i = 0; i < 240; i++) frames.push(engine.read());

    const levels = frames.map((f) => f.level);
    expect(Math.max(...levels)).toBeGreaterThan(0.5); // opens wide at times
    expect(Math.min(...levels)).toBeLessThan(0.1); // and nearly closes
    // It moves: many distinct levels, not a constant
    expect(new Set(levels.map((l) => l.toFixed(2))).size).toBeGreaterThan(10);
  });

  it('drifts between mouth shapes over time', () => {
    const engine = createMouthEngine(null);
    const shapes = new Set<string>();
    for (let i = 0; i < 600; i++) shapes.add(engine.read().shape);
    expect(shapes.has('a')).toBe(true);
    expect(shapes.size).toBeGreaterThanOrEqual(3);
  });
});

describe('analyser engine', () => {
  it('reports closed on silence', () => {
    const engine = createMouthEngine(fakeAnalyser({ peakDeviation: 2 }));
    expect(engine.read()).toEqual({ level: 0, shape: 'closed' });
  });

  it('maps high-band energy to the E shape', () => {
    const engine = createMouthEngine(
      fakeAnalyser({ peakDeviation: 80, energyBands: [{ lowHz: [1800, 3200], value: 200 }] })
    );
    const frame = engine.read();
    expect(frame.shape).toBe('e');
    expect(frame.level).toBeCloseTo(80 / 128, 2);
  });

  it('maps mid-band energy to the O shape', () => {
    const engine = createMouthEngine(
      fakeAnalyser({ peakDeviation: 60, energyBands: [{ lowHz: [800, 1800], value: 200 }] })
    );
    expect(engine.read().shape).toBe('o');
  });

  it('maps low-band energy to the A shape', () => {
    const engine = createMouthEngine(
      fakeAnalyser({ peakDeviation: 60, energyBands: [{ lowHz: [200, 800], value: 200 }] })
    );
    expect(engine.read().shape).toBe('a');
  });
});

describe('token engine (SpeechActivitySource)', () => {
  it('reports closed when there is no token energy', () => {
    const engine = createMouthEngine(fakeSpeechActivity(0));
    expect(engine.read()).toEqual({ level: 0, shape: 'closed' });
  });

  it('produces a moving, open mouth while tokens stream', () => {
    const engine = createMouthEngine(fakeSpeechActivity(0.9));
    const levels: number[] = [];
    for (let i = 0; i < 240; i++) levels.push(engine.read().level);
    expect(Math.max(...levels)).toBeGreaterThan(0.5); // opens wide
    // It articulates rather than holding one value (syllable wobble).
    expect(new Set(levels.map((l) => l.toFixed(2))).size).toBeGreaterThan(10);
  });

  it('drifts between mouth shapes over time', () => {
    const engine = createMouthEngine(fakeSpeechActivity(0.8));
    const shapes = new Set<string>();
    for (let i = 0; i < 600; i++) shapes.add(engine.read().shape);
    expect(shapes.size).toBeGreaterThanOrEqual(3);
  });
});
