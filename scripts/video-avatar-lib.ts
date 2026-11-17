export const STATES = ['idle', 'listening', 'thinking', 'working', 'speaking'] as const;
export type State = (typeof STATES)[number];

export type Mode = 'xfade' | 'loop' | 'once';

export type Classified =
  | { kind: 'hub' }
  | { kind: 'state'; state: State }
  | { kind: 'variation'; name: string }
  | { kind: 'unknown' };

const VIDEO = /\.(mp4|webm|mov|m4v)$/i;
const IMAGE = /\.(png|jpe?g|webp)$/i;

const ALIASES: Record<string, State> = {
  idle: 'idle',
  listening: 'listening',
  listen: 'listening',
  thinking: 'thinking',
  think: 'thinking',
  working: 'working',
  work: 'working',
  speaking: 'speaking',
  speak: 'speaking',
  talking: 'speaking',
  talk: 'speaking',
};

const NOISE = new Set(['video', 'clip', 'flow', 'veo', 'final', 'copy']);

export const isVideo = (file: string) => VIDEO.test(file);
export const isImage = (file: string) => IMAGE.test(file);

export function classify(file: string): Classified {
  const stem = file.replace(/\.[^.]+$/, '');
  const tokens = stem.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const words = tokens.filter((t) => !/^\d+$/.test(t) && !NOISE.has(t));
  if (isImage(file)) return words.some((t) => ['hub', 'portrait', 'poster', 'frame'].includes(t)) ? { kind: 'hub' } : { kind: 'unknown' };
  if (!isVideo(file)) return { kind: 'unknown' };
  const stateWords = words.filter((t) => ALIASES[t]);
  if (stateWords.length === 0) return { kind: 'unknown' };
  const rest = words.filter((t) => !ALIASES[t]);
  if (stateWords[0] === 'idle' && rest.length > 0) return { kind: 'variation', name: rest.join('-') };
  return { kind: 'state', state: ALIASES[stateWords[0]] };
}

export interface Assignment {
  hub?: string;
  states: Partial<Record<State, string>>;
  variations: { name: string; file: string }[];
  ignored: string[];
  errors: string[];
}

export function assign(files: string[]): Assignment {
  const out: Assignment = { states: {}, variations: [], ignored: [], errors: [] };
  for (const file of [...files].sort()) {
    const c = classify(file);
    if (c.kind === 'hub') {
      if (out.hub) out.errors.push(`two hub frames: ${out.hub} and ${file}`);
      else out.hub = file;
    } else if (c.kind === 'state') {
      const taken = out.states[c.state];
      if (taken) out.errors.push(`two files for "${c.state}": ${taken} and ${file}`);
      else out.states[c.state] = file;
    } else if (c.kind === 'variation') {
      let name = c.name;
      for (let n = 2; out.variations.some((v) => v.name === name); n++) name = `${c.name}-${n}`;
      out.variations.push({ name, file });
    } else out.ignored.push(file);
  }
  return out;
}

export interface Sample {
  t: number;
  score: number;
}

export interface Window {
  from: number;
  to: number;
  startScore: number;
  endScore: number;
  seam: number;
}

/** The stretch, at least `minLength` seconds long, whose two ends are closest to the hub. */
export function bestWindow(samples: Sample[], minLength: number): Window | undefined {
  let best: (Window & { sum: number }) | undefined;
  for (let i = 0; i < samples.length; i++) {
    for (let j = i + 1; j < samples.length; j++) {
      if (samples[j].t - samples[i].t < minLength) continue;
      const startScore = samples[i].score;
      const endScore = samples[j].score;
      const sum = startScore + endScore;
      const longer = best && Math.abs(sum - best.sum) < 1e-9 && samples[j].t - samples[i].t > best.to - best.from;
      if (!best || sum > best.sum + 1e-9 || longer) {
        best = { from: samples[i].t, to: samples[j].t, startScore, endScore, seam: Math.min(startScore, endScore), sum };
      }
    }
  }
  if (!best) return undefined;
  const { sum: _sum, ...window } = best;
  return window;
}

export interface Thresholds {
  /** Seam score at or above which the end is considered to match the start (xfade). */
  xfade: number;
  /** Seam score below which the clip is considered never to return to the hub. */
  regenerate: number;
}

export const DEFAULT_THRESHOLDS: Thresholds = { xfade: 0.9, regenerate: 0.75 };

export function chooseMode(seam: number, isVariation: boolean, t: Thresholds): Mode {
  if (isVariation) return 'once';
  return seam >= t.xfade ? 'xfade' : 'loop';
}

export interface ClipReport {
  key: string;
  file: string;
  variation: boolean;
  from: number;
  to: number;
  seam: number;
  mode: Mode;
  regenerate: boolean;
}

export const modeLabel = (mode: Mode) => (mode === 'loop' ? 'boomerang' : mode);

export function reportLine(c: ClipReport): string {
  if (c.regenerate) return `${c.key}: does not return to the hub (seam ${c.seam.toFixed(2)}), regenerate`;
  return `${c.key}: seam ${c.seam.toFixed(2)}, ${modeLabel(c.mode)}`;
}

export function formatReport(clips: ClipReport[]): string {
  const lines = clips.map((c) => `${c.regenerate ? '⚠' : '✓'} ${reportLine(c)} (${c.from.toFixed(2)}s–${c.to.toFixed(2)}s)`);
  const bad = clips.filter((c) => c.regenerate).length;
  lines.push(bad ? `${bad} clip${bad > 1 ? 's' : ''} to regenerate.` : 'All clips return to the hub.');
  return lines.join('\n');
}

export function parseSsimStats(text: string): number[] {
  return [...text.matchAll(/All:(-?[\d.]+)/g)].map((m) => Number(m[1]));
}


export function renderClipsTs(opts: {
  base: string;
  states: State[];
  variations: string[];
  poster?: string;
  variationCooldownMs: number;
}): string {
  const base = opts.base.replace(/\/$/, '');
  const stateLines = opts.states.map((s) => `  ${s}: clip('${s}'),`);
  const variationLines = opts.variations.map(
    (v) => `  { clip: clip('${v}'), cooldownMs: ${opts.variationCooldownMs} },`,
  );
  return [
    `import type { IdleVariation, VideoClips } from 'react-ai-avatar';`,
    ``,
    `const clip = (name: string) => ({ webm: \`${base}/\${name}.webm\`, mp4: \`${base}/\${name}.mp4\` });`,
    ``,
    `export const CLIPS: VideoClips = {`,
    ...stateLines,
    `};`,
    ``,
    `export const IDLE_VARIATIONS: IdleVariation[] = [`,
    ...variationLines,
    `];`,
    ...(opts.poster ? [``, `export const POSTER = '${base}/${opts.poster}';`] : []),
    ``,
  ].join('\n');
}
