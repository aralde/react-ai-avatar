import { describe, expect, it } from 'vitest';
import {
  DEFAULT_THRESHOLDS,
  assign,
  bestWindow,
  chooseMode,
  classify,
  formatReport,
  parseSsimStats,
  renderClipsTs,
} from './video-avatar-lib.ts';

describe('classify', () => {
  it('maps file names to states, hub and variations', () => {
    expect(classify('Speaking.MP4')).toEqual({ kind: 'state', state: 'speaking' });
    expect(classify('flow_thinking (2).mp4')).toEqual({ kind: 'state', state: 'thinking' });
    expect(classify('idle_1.webm')).toEqual({ kind: 'state', state: 'idle' });
    expect(classify('idle-coffee.mp4')).toEqual({ kind: 'variation', name: 'coffee' });
    expect(classify('hub.png')).toEqual({ kind: 'hub' });
    expect(classify('notes.txt')).toEqual({ kind: 'unknown' });
    expect(classify('random.mp4')).toEqual({ kind: 'unknown' });
  });
});

describe('assign', () => {
  it('assigns a whole folder and reports duplicates', () => {
    const a = assign(['hub.png', 'idle.mp4', 'idle-chin.mp4', 'idle-coffee.mp4', 'working.mp4', 'readme.md']);
    expect(a.hub).toBe('hub.png');
    expect(a.states).toEqual({ idle: 'idle.mp4', working: 'working.mp4' });
    expect(a.variations.map((v) => v.name)).toEqual(['chin', 'coffee']);
    expect(a.ignored).toEqual(['readme.md']);
    expect(assign(['idle.mp4', 'idle (1).mp4']).errors).toHaveLength(1);
  });
});

describe('bestWindow', () => {
  const at = (scores: number[]) => scores.map((score, i) => ({ t: i, score }));
  it('keeps the stretch whose ends are closest to the hub', () => {
    const w = bestWindow(at([0.5, 0.95, 0.6, 0.6, 0.6, 0.97, 0.4]), 3)!;
    expect(w).toMatchObject({ from: 1, to: 5, seam: 0.95 });
  });
  it('returns undefined when nothing is long enough', () => {
    expect(bestWindow(at([1, 1]), 5)).toBeUndefined();
  });
});

describe('modes and report', () => {
  it('picks xfade, boomerang or once', () => {
    expect(chooseMode(0.97, false, DEFAULT_THRESHOLDS)).toBe('xfade');
    expect(chooseMode(0.81, false, DEFAULT_THRESHOLDS)).toBe('loop');
    expect(chooseMode(0.97, true, DEFAULT_THRESHOLDS)).toBe('once');
  });
  it('prints seam scores and a regenerate warning', () => {
    const base = { file: 'x.mp4', variation: false, from: 0, to: 4 };
    const out = formatReport([
      { ...base, key: 'speaking', seam: 0.97, mode: 'xfade', regenerate: false },
      { ...base, key: 'thinking', seam: 0.81, mode: 'loop', regenerate: false },
      { ...base, key: 'working', seam: 0.6, mode: 'loop', regenerate: true },
    ]);
    expect(out).toContain('speaking: seam 0.97, xfade');
    expect(out).toContain('thinking: seam 0.81, boomerang');
    expect(out).toContain('working: does not return to the hub (seam 0.60), regenerate');
    expect(out).toContain('1 clip to regenerate.');
  });
  it('parses ffmpeg ssim stats', () => {
    expect(parseSsimStats('n:1 Y:0.9 U:0.9 V:0.9 All:0.912345 (10.5)\nn:2 Y:1 U:1 V:1 All:1.000000 (inf)')).toEqual([0.912345, 1]);
  });
});

describe('renderClipsTs', () => {
  it('writes the VideoClips module', () => {
    const ts = renderClipsTs({ base: '/clips/', states: ['idle', 'speaking'], variations: ['idle-chin'], poster: 'idle.jpg', variationCooldownMs: 60000 });
    expect(ts).toContain("idle: clip('idle'),");
    expect(ts).toContain("{ clip: clip('idle-chin'), cooldownMs: 60000 },");
    expect(ts).toContain("export const POSTER = '/clips/idle.jpg';");
    expect(ts).toContain('`/clips/${name}.webm`');
  });
});
