// Convert a Microsoft Rocketbox *_facial.fbx (MIT) into a web-ready .glb whose
// facial blendshapes are usable by three.js *by name*.
//
// Two steps:
//   1. FBX2glTF: FBX -> binary glTF (.glb). This keeps the 175 morph targets,
//      but writes their names onto the morph-target ACCESSORS, not onto
//      `mesh.extras.targetNames` — and three.js only builds its
//      `morphTargetDictionary` from the latter. So out of the box the shapes
//      are anonymous (morphTargetDictionary === undefined).
//   2. Repack: read the per-target accessor names, and inject
//      `mesh.extras.targetNames`. The 52 ARKit channels (named `AK_NN_<Name>`,
//      e.g. `AK_25_JawOpen`) are normalized to their canonical ARKit name
//      (`jawOpen`), so they match GlbArkitAvatar's name lookup directly. The
//      other rigs (visemes AA_VI_*, FACS AU_*, Vive SR_*, HeadBox HB_*) keep
//      their original names.
//
// Usage: node convert.mjs [input.fbx] [output.glb]
import convert from 'fbx2gltf';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const [, , inArg, outArg] = process.argv;
const input = resolve(
  inArg ??
    'work/Microsoft-Rocketbox/Assets/Avatars/Adults/Female_Adult_01/Export/Female_Adult_01_facial.fbx'
);
const output = resolve(outArg ?? '../../public/models/rocketbox.glb');

console.log('Converting:\n  in :', input, '\n  out:', output);
await convert(input, output, ['--binary', '--compute-normals', 'never']);

// --- repack: parse the GLB into its JSON + BIN chunks -----------------------
const glb = readFileSync(output);
const MAGIC = 0x46546c67; // 'glTF'
if (glb.readUInt32LE(0) !== MAGIC) throw new Error('not a binary glTF');

const jsonLen = glb.readUInt32LE(12); // chunk 0 length
const jsonStart = 20; // 12 header + 8 chunk0 header
const json = JSON.parse(glb.slice(jsonStart, jsonStart + jsonLen).toString('utf8'));

const binChunkStart = jsonStart + jsonLen; // chunk 1 header start
const binLen = glb.readUInt32LE(binChunkStart);
const binData = glb.slice(binChunkStart + 8, binChunkStart + 8 + binLen);

// Map an accessor name -> the targetName three.js should expose.
const toTargetName = (raw) => {
  const name = (raw || '').replace(/^blendShape\d*\./, '');
  const ak = name.match(/^AK_\d+_(.+)$/); // ARKit channel
  if (ak) return ak[1].charAt(0).toLowerCase() + ak[1].slice(1); // JawOpen -> jawOpen
  return name;
};

// Rocketbox ships 175 morph targets (visemes AA_VI_*, ARKit AK_*, FACS AU_*,
// Vive SR_*, HeadBox HB_*). Building all 175 morph attributes blocks the main
// thread for ~minutes and we only ever drive the 52 ARKit channels — so prune
// every primitive's targets down to the ARKit set and keep the names in sync.
const isArkit = (raw) => /^AK_\d+_/.test((raw || '').replace(/^blendShape\d*\./, ''));

let injected = 0;
for (const mesh of json.meshes ?? []) {
  const ref = (mesh.primitives ?? [])[0];
  if (!ref?.targets?.length) continue;

  // Indices (into the original target list) that are ARKit channels.
  const keep = ref.targets
    .map((t, i) => (isArkit(json.accessors[t.POSITION ?? t.NORMAL]?.name) ? i : -1))
    .filter((i) => i >= 0);

  const names = keep.map((i) => toTargetName(json.accessors[ref.targets[i].POSITION ?? ref.targets[i].NORMAL]?.name));

  for (const prim of mesh.primitives ?? []) {
    if (prim.targets?.length) prim.targets = keep.map((i) => prim.targets[i]);
  }
  if (Array.isArray(mesh.weights)) mesh.weights = keep.map((i) => mesh.weights[i] ?? 0);
  mesh.extras = { ...(mesh.extras || {}), targetNames: names };
  injected += names.length;
}

// Drop the embedded "Take 001" morph animation — we drive the blendshapes
// ourselves, and its 175-wide keyframe tracks are dead weight here.
delete json.animations;

// --- rewrite the GLB with the patched JSON chunk ----------------------------
const pad = (buf, to, fill) => {
  const rem = buf.length % to;
  if (rem === 0) return buf;
  return Buffer.concat([buf, Buffer.alloc(to - rem, fill)]);
};

const jsonBuf = pad(Buffer.from(JSON.stringify(json), 'utf8'), 4, 0x20); // pad with spaces
const binBuf = pad(binData, 4, 0x00);

const header = Buffer.alloc(12);
header.writeUInt32LE(MAGIC, 0);
header.writeUInt32LE(2, 4);
header.writeUInt32LE(12 + 8 + jsonBuf.length + 8 + binBuf.length, 8);

const jsonHeader = Buffer.alloc(8);
jsonHeader.writeUInt32LE(jsonBuf.length, 0);
jsonHeader.writeUInt32LE(0x4e4f534a, 4); // 'JSON'

const binHeader = Buffer.alloc(8);
binHeader.writeUInt32LE(binBuf.length, 0);
binHeader.writeUInt32LE(0x004e4942, 4); // 'BIN\0'

writeFileSync(output, Buffer.concat([header, jsonHeader, jsonBuf, binHeader, binBuf]));

// --- report -----------------------------------------------------------------
const arkit = [];
for (const mesh of json.meshes ?? []) {
  for (const n of mesh.extras?.targetNames ?? []) {
    if (/^(jaw|mouth|eye|brow|cheek|nose|tongue)/.test(n)) arkit.push(n);
  }
}
console.log(`\nInjected ${injected} target names. ARKit-style names now exposed:`);
console.log(JSON.stringify([...new Set(arkit)].sort(), null, 0));
writeFileSync('morph-target-names.json', JSON.stringify(json.meshes[0].extras.targetNames, null, 2));
console.log('\nFull list saved -> tools/rocketbox-asset/morph-target-names.json');
console.log('GLB rewritten ->', output);
