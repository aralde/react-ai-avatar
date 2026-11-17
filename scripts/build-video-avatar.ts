/**
 * Turns the folder you downloaded from Google Flow (or any text-to-video tool) into a
 * ready <VideoAvatar />: assigns clips to states by file name, measures how close every
 * frame is to the hub frame (SSIM), trims each clip to the stretch that starts and ends
 * closest to it, picks xfade or boomerang, encodes, and writes clips.ts, a poster and a report.
 *
 *   node --experimental-strip-types scripts/build-video-avatar.ts <folder> [options]
 *
 * File names decide the state: hub.png (the portrait every clip starts and ends on),
 * idle.mp4, listening.mp4, thinking.mp4, working.mp4, speaking.mp4, and any number of
 * idle-<name>.mp4 for idle variations. Without a hub image, the first frame of idle is the hub.
 *
 * Options:
 *   --out <dir>              where clips, poster, clips.ts and report.json go (default ./clips)
 *   --base <url-path>        URL prefix written into clips.ts (default /clips)
 *   --clips-ts <file>        where to write clips.ts (default <out>/clips.ts)
 *   --threshold <0-1>        seam score at or above which a clip uses xfade; below it, boomerang (default 0.9)
 *   --regenerate-below <0-1> seam score below which a clip is flagged "regenerate" (default 0.75)
 *   --min-length <s>         shortest stretch to keep (default 3)
 *   --fps <n>                sampling rate for the similarity scan (default 8)
 *   --x <px>                 left edge of the square crop, for every clip (default: centred)
 *   --size <px>              output size (default 512)
 *   --fade <s>               crossfade length for xfade clips (default 0.75)
 *   --dry-run                only measure and print the report; encode nothing
 *
 * The seam score is the SSIM (1 = identical) between the hub and the weaker of the two ends
 * of the kept stretch. Not part of the published package. Requires ffmpeg and ffprobe.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import {
  DEFAULT_THRESHOLDS,
  STATES,
  assign,
  bestWindow,
  chooseMode,
  formatReport,
  parseSsimStats,
  renderClipsTs,
  type ClipReport,
  type Sample,
  type State,
} from './video-avatar-lib.ts';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    out: { type: 'string', default: 'clips' },
    base: { type: 'string', default: '/clips' },
    'clips-ts': { type: 'string' },
    threshold: { type: 'string', default: String(DEFAULT_THRESHOLDS.xfade) },
    'regenerate-below': { type: 'string', default: String(DEFAULT_THRESHOLDS.regenerate) },
    'min-length': { type: 'string', default: '3' },
    fps: { type: 'string', default: '8' },
    x: { type: 'string' },
    size: { type: 'string', default: '512' },
    fade: { type: 'string', default: '0.75' },
    'dry-run': { type: 'boolean', default: false },
  },
});

function fail(message: string): never {
  console.error(`build-video-avatar: ${message}`);
  process.exit(1);
}

const folder = positionals[0];
if (!folder) fail('usage: build-video-avatar.ts <folder> [--out dir] [--threshold 0.9] ...');
for (const flag of ['threshold', 'regenerate-below', 'min-length', 'fps', 'x', 'size', 'fade'] as const) {
  const v = values[flag];
  if (v !== undefined && !Number.isFinite(Number(v))) fail(`--${flag} must be a number, got "${v}"`);
}
const thresholds = { xfade: Number(values.threshold), regenerate: Number(values['regenerate-below']) };
const fps = Number(values.fps);
const minLength = Number(values['min-length']);
if (fps <= 0 || minLength <= 0) fail('--fps and --min-length must be positive');

for (const tool of ['ffmpeg', 'ffprobe']) {
  try {
    execFileSync(tool, ['-version'], { stdio: 'ignore' });
  } catch {
    fail(`${tool} not found on PATH`);
  }
}

let files: string[];
try {
  files = readdirSync(folder);
} catch {
  fail(`cannot read folder "${folder}"`);
}
const found = assign(files);
if (found.errors.length) fail(found.errors.join('\n'));
if (!found.states.idle) fail('no idle clip: name one of the files idle.mp4');
for (const f of found.ignored) console.warn(`ignored ${f}`);
for (const s of STATES) if (!found.states[s]) console.warn(`no ${s} clip: <VideoAvatar /> will fall back`);

const tmp = mkdtempSync(path.join(tmpdir(), 'build-video-avatar-'));
const inFolder = (file: string) => path.join(folder, file);
const ffmpeg = (args: string[]) => execFileSync('ffmpeg', ['-v', 'error', '-y', ...args], { stdio: 'inherit' });
const probe = (file: string, entries: string) =>
  execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', entries, '-of', 'csv=p=0', file], {
    encoding: 'utf8',
  }).trim();

let hub: string;
if (found.hub) hub = inFolder(found.hub);
else {
  hub = path.join(tmp, 'hub.png');
  ffmpeg(['-i', inFolder(found.states.idle), '-frames:v', '1', hub]);
  console.warn('no hub image (hub.png): using the first frame of idle as the hub');
}

function scan(file: string): { samples: Sample[]; duration: number } {
  const [width, height] = probe(file, 'stream=width,height').split(',').map(Number);
  const duration = Number(probe(file, 'format=duration'));
  const cropX = values.x ?? '(iw-ih)/2';
  const square = `crop=ih:ih:${cropX}:0,scale=128:128,setsar=1,fps=${fps}`;
  const stats = path.join(tmp, 'ssim.log');
  ffmpeg([
    '-i', file,
    '-loop', '1', '-framerate', String(fps), '-t', String(duration), '-i', hub,
    '-filter_complex',
    `[0:v]${square}[a];[1:v]scale=${width}:${height},${square}[b];[a][b]ssim=stats_file=${stats}`,
    '-f', 'null', '-',
  ]);
  const scores = parseSsimStats(readFileSync(stats, 'utf8'));
  return { samples: scores.map((score, i) => ({ t: i / fps, score })), duration };
}

interface Job {
  key: string;
  file: string;
  variation: boolean;
}
const jobs: Job[] = [
  ...STATES.filter((s) => found.states[s]).map((s) => ({ key: s, file: found.states[s]!, variation: false })),
  ...found.variations.map((v) => ({ key: `idle-${v.name}`, file: v.file, variation: true })),
];

const reports: ClipReport[] = [];
for (const job of jobs) {
  const { samples, duration } = scan(inFolder(job.file));
  const window = bestWindow(samples, Math.min(minLength, duration / 2));
  if (!window) fail(`${job.file}: too short to measure`);
  reports.push({
    key: job.key,
    file: job.file,
    variation: job.variation,
    from: window.from,
    to: window.to,
    seam: window.seam,
    mode: chooseMode(window.seam, job.variation, thresholds),
    regenerate: window.seam < thresholds.regenerate,
  });
}

console.log(formatReport(reports));

if (!values['dry-run']) {
  const prepare = path.join(path.dirname(fileURLToPath(import.meta.url)), 'prepare-video-clips.ts');
  mkdirSync(values.out, { recursive: true });
  for (const r of reports) {
    execFileSync(
      process.execPath,
      [
        '--experimental-strip-types', prepare, inFolder(r.file),
        '--name', r.key, '--mode', r.mode,
        '--from', r.from.toFixed(3), '--to', r.to.toFixed(3),
        '--size', values.size!, '--fade', values.fade!, '--out', values.out,
        ...(values.x ? ['--x', values.x] : []),
        ...(r.key === 'idle' ? ['--poster'] : []),
      ],
      { stdio: 'inherit' },
    );
  }
  const clipsTs = values['clips-ts'] ?? path.join(values.out, 'clips.ts');
  writeFileSync(
    clipsTs,
    renderClipsTs({
      base: values.base!,
      states: reports.filter((r) => !r.variation).map((r) => r.key as State),
      variations: reports.filter((r) => r.variation).map((r) => r.key),
      poster: 'idle.jpg',
      variationCooldownMs: 60_000,
    }),
  );
  writeFileSync(path.join(values.out, 'report.json'), `${JSON.stringify({ thresholds, clips: reports }, null, 2)}\n`);
  console.log(`✓ ${reports.length} clips, ${clipsTs}, ${path.join(values.out, 'idle.jpg')}, report.json in ${values.out}`);
}

rmSync(tmp, { recursive: true, force: true });
