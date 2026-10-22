/**
 * Bundle-size report: what a consumer actually ships for each entry point.
 *
 * Bundles a one-line app per scenario against the built package (dist/lib),
 * the way a consumer's bundler would — tree-shaken, minified, peers external —
 * and reports the gzip size of the JS. Lazy chunks (3D, DiceBear) are not
 * counted: they only download when that variant renders.
 *
 *   node scripts/size.mjs            print the table
 *   node scripts/size.mjs --check    also fail if a scenario exceeds its budget
 *   node scripts/size.mjs --readme   also rewrite the table in README.md
 *
 * Run `npm run build:lib` first.
 */
import { build } from 'esbuild';
import { gzipSync } from 'node:zlib';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));

/** [label, import line, gzip budget in kB] */
const SCENARIOS = [
  ['`RealtimeAvatar` (core)', `import { RealtimeAvatar as X } from 'react-ai-avatar';`, 18],
  ['`OrbAvatar`', `import { OrbAvatar as X } from 'react-ai-avatar';`, 3],
  ['`VideoAvatar`', `import { VideoAvatar as X } from 'react-ai-avatar';`, 7],
  ['`createSpeechActivity` only', `import { createSpeechActivity as X } from 'react-ai-avatar';`, 1],
  ['`react-ai-avatar/characters` (Squirrel)', `import { SquirrelAvatar as X } from 'react-ai-avatar/characters';`, 4],
  ['`react-ai-avatar/characters` (Portrait)', `import { PortraitAvatar as X } from 'react-ai-avatar/characters';`, 42],
  ['`react-ai-avatar/dicebear`', `import { DiceBearAvatar as X } from 'react-ai-avatar/dicebear';`, 5],
  ['`react-ai-avatar/3d`', `import { VrmAvatar as X } from 'react-ai-avatar/3d';`, 5],
];

// React is already in every consumer's app, and the optional peers (three.js,
// DiceBear) only load lazily. Any other dependency is counted: the consumer
// ships it too.
const external = [
  'react',
  'react-dom',
  'react/jsx-runtime',
  ...Object.entries(pkg.peerDependenciesMeta ?? {})
    .filter(([, meta]) => meta.optional)
    .map(([name]) => name),
  '@dicebear/*',
  'three/*',
];

/** Resolve `react-ai-avatar[/sub]` to the built ESM file, like package.json `exports`. */
const selfResolve = {
  name: 'self',
  setup(b) {
    b.onResolve({ filter: /^react-ai-avatar(\/.*)?$/ }, (args) => {
      const sub = args.path.slice('react-ai-avatar'.length) || '.';
      const entry = pkg.exports[sub === '.' ? '.' : `.${sub}`];
      if (!entry) return { errors: [{ text: `no export "${args.path}"` }] };
      return { path: path.join(root, entry.import) };
    });
  },
};

async function measure(code) {
  const out = await build({
    stdin: { contents: `${code}\nconsole.log(X);`, resolveDir: root, loader: 'js' },
    bundle: true,
    minify: true,
    format: 'esm',
    write: false,
    external,
    plugins: [selfResolve],
    logLevel: 'silent',
    splitting: false,
    // Lazy chunks stay lazy: keep dynamic imports out of the measured bundle.
    supported: { 'dynamic-import': true },
  }).catch((e) => ({ error: e }));
  if (out.error) return null;
  const js = out.outputFiles.map((f) => f.contents).filter(Boolean);
  const bytes = Buffer.concat(js.map((c) => Buffer.from(c)));
  return gzipSync(bytes, { level: 9 }).length / 1000;
}

if (!existsSync(path.join(root, 'dist/lib'))) {
  console.error('dist/lib not found — run `npm run build:lib` first.');
  process.exit(1);
}

const rows = [];
let failed = false;
for (const [label, code, budget] of SCENARIOS) {
  const kb = await measure(code);
  const over = kb !== null && kb > budget;
  if (over) failed = true;
  rows.push({ label, kb, budget, over });
}

const table = [
  '| Import | gzip | budget |',
  '|---|---:|---:|',
  ...rows.map(({ label, kb, budget, over }) =>
    `| ${label} | ${kb === null ? 'n/a' : `${kb.toFixed(1)} kB`}${over ? ' ⚠️' : ''} | ${budget} kB |`),
].join('\n');
console.log(table);

if (process.argv.includes('--readme')) {
  const readmePath = path.join(root, 'README.md');
  const readme = readFileSync(readmePath, 'utf8');
  const re = /(<!-- size:start -->\n)[\s\S]*?(<!-- size:end -->)/;
  if (!re.test(readme)) {
    console.error('README.md has no <!-- size:start --> / <!-- size:end --> markers.');
    process.exit(1);
  }
  writeFileSync(readmePath, readme.replace(re, `$1${table}\n$2`));
}

if (process.argv.includes('--check') && failed) {
  console.error('\nA scenario is over its gzip budget.');
  process.exit(1);
}
