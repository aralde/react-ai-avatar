/**
 * Turns a raw generated/recorded video into a <VideoAvatar /> clip:
 * square crop, scaled, silent, encoded as WebM (VP9) + MP4 (H.264).
 *
 *   node --experimental-strip-types scripts/prepare-video-clips.ts <input> --name idle [options]
 *
 * Options:
 *   --name <name>      output basename (required): writes <name>.webm and <name>.mp4
 *   --mode loop|xfade|once
 *                      loop (default): a "boomerang" — the range forward, then reversed,
 *                      so the last frame meets the first and the loop never jumps.
 *                      xfade: always forward; the tail crossfades into the head, so the
 *                      seam is a short dissolve. Use it when reversed motion shows (smoke,
 *                      hair, steam) and the clip starts and ends on roughly the same pose.
 *                      once: plain forward, for idle variations played a single time.
 *   --fade <s>         crossfade length for --mode xfade (default 0.75)
 *   --from <s>         start of the range to keep, in seconds (default 0)
 *   --to <s>           end of the range to keep, in seconds (default: end of video)
 *   --x <px>           left edge of the square crop (default: centred)
 *   --size <px>        output width/height (default 512)
 *   --out <dir>        output directory (default: current directory)
 *   --poster           also write <name>.jpg from the first frame (use it for `poster`)
 *
 * Requires ffmpeg on PATH. Not part of the published package.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    name: { type: 'string' },
    mode: { type: 'string', default: 'loop' },
    fade: { type: 'string', default: '0.75' },
    from: { type: 'string' },
    to: { type: 'string' },
    x: { type: 'string' },
    size: { type: 'string', default: '512' },
    out: { type: 'string', default: '.' },
    poster: { type: 'boolean', default: false },
  },
});

const input = positionals[0];
const { name, mode, fade, from, to, x, size, out, poster } = values;

function fail(message: string): never {
  console.error(`prepare-video-clips: ${message}`);
  process.exit(1);
}

if (!input || !name) fail('usage: prepare-video-clips.ts <input> --name <name> [--mode loop|xfade|once] ...');
if (mode !== 'loop' && mode !== 'xfade' && mode !== 'once') fail(`--mode must be "loop", "xfade" or "once", got "${mode}"`);
for (const [flag, value] of Object.entries({ fade, from, to, x, size })) {
  if (value !== undefined && !Number.isFinite(Number(value))) fail(`--${flag} must be a number, got "${value}"`);
}

const ffmpeg = (args: string[]) => execFileSync('ffmpeg', ['-v', 'error', '-y', ...args], { stdio: 'inherit' });

try {
  execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' });
} catch {
  fail('ffmpeg not found on PATH');
}

mkdirSync(out, { recursive: true });
const target = (ext: string) => path.join(out, `${name}.${ext}`);

// Square crop of the full height; centred unless --x says where the face is.
const cropX = x ?? '(iw-ih)/2';
const frame = `crop=ih:ih:${cropX}:0,scale=${size}:${size},fps=24,setpts=PTS-STARTPTS`;
const range = [...(from ? ['-ss', from] : []), ...(to ? ['-to', to] : [])];

// Length of the kept range, needed to place the crossfade at its tail.
function rangeSeconds(): number {
  const total = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
    '-of', 'csv=p=0', input], { encoding: 'utf8' }));
  return Math.min(Number(to ?? total), total) - Number(from ?? 0);
}

function xfadeFilter(): string {
  const f = Number(fade);
  const length = rangeSeconds();
  if (f <= 0 || 2 * f >= length) fail(`--fade must be between 0 and half the range (${length / 2}s), got ${f}`);
  // Play [f, end] and dissolve its last f seconds into [0, f]: the output ends exactly
  // where it starts (at f), so looping it is seamless and motion never runs backwards.
  return `[0:v]${frame},split[a][b];` +
    `[a]trim=start=${f},setpts=PTS-STARTPTS[body];` +
    `[b]trim=end=${f},setpts=PTS-STARTPTS[head];` +
    `[body][head]xfade=transition=fade:duration=${f}:offset=${length - 2 * f},format=yuv420p[v]`;
}

const filter =
  mode === 'loop'
    ? `[0:v]${frame},split[a][b];[b]reverse[r];[a][r]concat=n=2:v=1:a=0,format=yuv420p[v]`
    : mode === 'xfade'
      ? xfadeFilter()
      : `[0:v]${frame},format=yuv420p[v]`;

ffmpeg([...range, '-i', input, '-an', '-filter_complex', filter, '-map', '[v]',
  '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '34', '-row-mt', '1', target('webm')]);
ffmpeg(['-i', target('webm'), '-c:v', 'libx264', '-crf', '24', '-preset', 'slow',
  '-pix_fmt', 'yuv420p', '-movflags', '+faststart', target('mp4')]);
if (poster) ffmpeg(['-i', target('webm'), '-frames:v', '1', '-q:v', '3', target('jpg')]);

console.log(`✓ ${target('webm')}, ${target('mp4')}${poster ? `, ${target('jpg')}` : ''} (${mode})`);
