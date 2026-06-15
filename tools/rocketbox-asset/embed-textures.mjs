// Re-embed the real Rocketbox skin textures into rocketbox.glb.
//
// FBX2glTF can't embed Rocketbox's *.tga textures (TGA isn't a web image
// format), so it substitutes a 1x1 RGBA(255,255,0,127) placeholder for every
// baseColorTexture/normalTexture — which is why the avatar renders as a flat,
// semi-transparent yellow with no surface detail.
//
// This step reads the original uncompressed TGAs, transcodes them to PNG
// (BGR->RGB, vertical flip, optional box-downscale), and rewrites the GLB's
// `images` as binary bufferViews. It also relaxes the bogus Phong-derived
// metallicFactor (0.4) to 0 so skin reads as a dielectric, not chrome.
//
// Usage: node embed-textures.mjs [glb] [textureDir] [--size=1024]

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { deflateSync } from 'node:zlib';

const args = process.argv.slice(2);
const flags = Object.fromEntries(
  args.filter((a) => a.startsWith('--')).map((a) => a.replace(/^--/, '').split('='))
);
const positional = args.filter((a) => !a.startsWith('--'));

const GLB = resolve(positional[0] ?? '../../public/models/rocketbox.glb');
const TEX_DIR = resolve(
  positional[1] ??
    'work/Microsoft-Rocketbox/Assets/Avatars/Adults/Female_Adult_01/Textures'
);
const TARGET = flags.size ? parseInt(flags.size, 10) : 1024; // 0 = keep native res

// --- TGA (uncompressed true-color, type 2) -> {width,height,channels,data RGB(A)}
function readTga(path) {
  const b = readFileSync(path);
  const idLen = b[0];
  const imageType = b[2];
  if (imageType !== 2) throw new Error(`${path}: unsupported TGA type ${imageType}`);
  const width = b.readUInt16LE(12);
  const height = b.readUInt16LE(14);
  const bpp = b[16];
  const descriptor = b[17];
  const channels = bpp / 8; // 3 (BGR) or 4 (BGRA)
  const topOrigin = (descriptor & 0x20) !== 0; // bit5: 1 => rows top->bottom
  const start = 18 + idLen;

  const out = Buffer.alloc(width * height * channels);
  for (let y = 0; y < height; y++) {
    // TGA default origin is bottom-left; flip to PNG's top-left unless flagged.
    const srcRow = topOrigin ? y : height - 1 - y;
    for (let x = 0; x < width; x++) {
      const si = start + (srcRow * width + x) * channels;
      const di = (y * width + x) * channels;
      out[di] = b[si + 2]; // R <- TGA B
      out[di + 1] = b[si + 1]; // G
      out[di + 2] = b[si]; // B <- TGA R
      if (channels === 4) out[di + 3] = b[si + 3]; // A
    }
  }
  return { width, height, channels, data: out };
}

// 2x box-average downscale until <= target (keeps it cheap and artifact-free).
function downscale(img, target) {
  let { width, height, channels, data } = img;
  while (target && width > target && width % 2 === 0 && height % 2 === 0) {
    const nw = width / 2;
    const nh = height / 2;
    const nd = Buffer.alloc(nw * nh * channels);
    for (let y = 0; y < nh; y++) {
      for (let x = 0; x < nw; x++) {
        for (let c = 0; c < channels; c++) {
          const sx = x * 2;
          const sy = y * 2;
          const s = (yy, xx) => data[(yy * width + xx) * channels + c];
          nd[(y * nw + x) * channels + c] =
            (s(sy, sx) + s(sy, sx + 1) + s(sy + 1, sx) + s(sy + 1, sx + 1) + 2) >> 2;
        }
      }
    }
    width = nw;
    height = nh;
    data = nd;
  }
  return { width, height, channels, data };
}

// Minimal PNG encoder: filter 0 per scanline, single IDAT. color type 2/6.
function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}
function encodePng({ width, height, channels, data }) {
  const colorType = channels === 4 ? 6 : 2;
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = colorType;
  const raw = Buffer.alloc(height * (1 + width * channels));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * channels)] = 0; // filter: none
    data.copy(
      raw,
      y * (1 + width * channels) + 1,
      y * width * channels,
      (y + 1) * width * channels
    );
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// --- parse GLB ---------------------------------------------------------------
const glb = readFileSync(GLB);
const MAGIC = 0x46546c67;
if (glb.readUInt32LE(0) !== MAGIC) throw new Error('not a binary glTF');
const jsonLen = glb.readUInt32LE(12);
const json = JSON.parse(glb.slice(20, 20 + jsonLen).toString('utf8'));
const binStart = 20 + jsonLen;
const binLen = glb.readUInt32LE(binStart);
const bin = glb.slice(binStart + 8, binStart + 8 + binLen);

// Resolve material slot -> source TGA from the *material* names, so we don't
// depend on FBX2glTF's opaque image ordering ("Map #91", ...).
const tgaFor = (matName, slot) => {
  const base = matName.replace(/^f\d+_/, ''); // f001_body -> body
  const file = slot === 'normal' ? `f001_${base}_normal.tga` : `f001_${base}_color.tga`;
  return resolve(TEX_DIR, file);
};

// imageIndex -> tga path
const imageSrc = new Map();
for (const mat of json.materials ?? []) {
  const pbr = mat.pbrMetallicRoughness ?? {};
  if (pbr.baseColorTexture) {
    const img = json.textures[pbr.baseColorTexture.index].source;
    imageSrc.set(img, tgaFor(mat.name, 'color'));
  }
  if (mat.normalTexture) {
    const img = json.textures[mat.normalTexture.index].source;
    imageSrc.set(img, tgaFor(mat.name, 'normal'));
  }
  // Skin is dielectric: drop the Phong-derived 0.4 metallic that darkens it.
  if (/body|head/.test(mat.name)) {
    pbr.metallicFactor = 0;
    pbr.roughnessFactor = 0.8;
    mat.pbrMetallicRoughness = pbr;
  }
}

// --- rebuild images as bufferViews appended to a fresh BIN -------------------
const extraViews = [];
const extraBuffers = [];
let cursor = bin.length;
json.bufferViews = json.bufferViews ?? [];

for (let i = 0; i < (json.images?.length ?? 0); i++) {
  const tga = imageSrc.get(i);
  if (!tga) continue; // leave untouched if we have no source
  const png = encodePng(downscale(readTga(tga), TARGET));
  const pad = (4 - (cursor % 4)) % 4;
  if (pad) {
    extraBuffers.push(Buffer.alloc(pad));
    cursor += pad;
  }
  const view = { buffer: 0, byteOffset: cursor, byteLength: png.length };
  json.bufferViews.push(view);
  extraBuffers.push(png);
  cursor += png.length;
  json.images[i] = { mimeType: 'image/png', bufferView: json.bufferViews.length - 1 };
  console.log(`image[${i}] <- ${tga.split(/[\\/]/).pop()}  (${(png.length / 1024) | 0} KB)`);
}

const newBin = Buffer.concat([bin, ...extraBuffers]);
if (json.buffers?.[0]) json.buffers[0].byteLength = newBin.length;

// --- write GLB ---------------------------------------------------------------
const pad = (buf, fill) => {
  const rem = buf.length % 4;
  return rem ? Buffer.concat([buf, Buffer.alloc(4 - rem, fill)]) : buf;
};
const jsonBuf = pad(Buffer.from(JSON.stringify(json), 'utf8'), 0x20);
const binBuf = pad(newBin, 0x00);
const header = Buffer.alloc(12);
header.writeUInt32LE(MAGIC, 0);
header.writeUInt32LE(2, 4);
header.writeUInt32LE(12 + 8 + jsonBuf.length + 8 + binBuf.length, 8);
const jsonHeader = Buffer.alloc(8);
jsonHeader.writeUInt32LE(jsonBuf.length, 0);
jsonHeader.writeUInt32LE(0x4e4f534a, 4);
const binHeader = Buffer.alloc(8);
binHeader.writeUInt32LE(binBuf.length, 0);
binHeader.writeUInt32LE(0x004e4942, 4);
writeFileSync(GLB, Buffer.concat([header, jsonHeader, jsonBuf, binHeader, binBuf]));

console.log(`\nGLB rewritten -> ${GLB}  (${(Buffer.concat([header, jsonHeader, jsonBuf, binHeader, binBuf]).length / 1024 / 1024).toFixed(1)} MB)`);
