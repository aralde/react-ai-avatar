/**
 * Turns a raw generated/recorded video into a <VideoAvatar /> clip:
 * square crop, scaled, silent, encoded as WebM (VP9) + MP4 (H.264).
 *
 *   node --experimental-strip-types scripts/prepare-video-clips.ts <input> --name idle [options]
 *
 * Options:
 *   --name <name>      output basename (required): writes <name>.webm and <name>.mp4
 *   --mode loop|once   loop (default): a "boomerang" — the range forward, then reversed,
 *                      so the last frame meets the first and the loop never jumps.
 *                      once: plain forward, for idle variations played a single time.
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
    from: { type: 'string' },
    to: { type: 'string' },
    x: { type: 'string' },
    size: { type: 'string', default: '512' },
    out: { type: 'string', default: '.' },
    poster: { type: 'boolean', default: false },
  },
});

const input = positionals[0];
const { name, mode, from, to, x, size, out, poster } = values;

function fail(message: string): never {
  console.error(`prepare-video-clips: ${message}`);
  process.exit(1);
}

if (!input || !name) fail('usage: prepare-video-clips.ts <input> --name <name> [--mode loop|once] ...');
if (mode !== 'loop' && mode !== 'once') fail(`--mode must be "loop" or "once", got "${mode}"`);
for (const [flag, value] of Object.entries({ from, to, x, size })) {
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

const filter =
  mode === 'loop'
    ? `[0:v]${frame},split[a][b];[b]reverse[r];[a][r]concat=n=2:v=1:a=0,format=yuv420p[v]`
    : `[0:v]${frame},format=yuv420p[v]`;

ffmpeg([...range, '-i', input, '-an', '-filter_complex', filter, '-map', '[v]',
  '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '34', '-row-mt', '1', target('webm')]);
ffmpeg(['-i', target('webm'), '-c:v', 'libx264', '-crf', '24', '-preset', 'slow',
  '-pix_fmt', 'yuv420p', '-movflags', '+faststart', target('mp4')]);
if (poster) ffmpeg(['-i', target('webm'), '-frames:v', '1', '-q:v', '3', target('jpg')]);

console.log(`✓ ${target('webm')}, ${target('mp4')}${poster ? `, ${target('jpg')}` : ''} (${mode})`);
