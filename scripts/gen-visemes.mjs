import * as coll from '@dicebear/collection';
import { createAvatar } from '@dicebear/core';
import { writeFileSync } from 'node:fs';
import { scopeSvgIds } from '../src/lib/dicebear.ts';

const SEED = 'realtime-avatar';
// style -> [optionKey, enumKey]
const jobs = [
  ['pixelArt', 'mouth'], ['pixelArt', 'eyes'],
  ['lorelei', 'mouth'], ['lorelei', 'eyes'],
  ['notionists', 'lips'], ['notionists', 'eyes'],
  ['thumbs', 'mouth'], ['thumbs', 'eyes'],
  ['openPeeps', 'face'],
];

const cell = (label, svg) =>
  `<figure style="margin:0;text-align:center"><div style="width:130px;height:130px;background:#f4f4f4;border-radius:8px;overflow:hidden">${svg}</div><figcaption style="font:11px monospace;color:#ccc;margin-top:2px">${label}</figcaption></figure>`;

let html = `<!doctype html><meta charset=utf8><body style="background:#111;color:#eee;font-family:monospace;padding:16px">`;
for (const [style, key] of jobs) {
  const s = coll[style];
  const props = s.schema.properties;
  const enums = props[key]?.items?.enum || props[key]?.enum || [];
  html += `<h3>${style} . ${key} (${enums.length})</h3><div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:18px">`;
  let i = 0;
  for (const v of enums) {
    const svg = scopeSvgIds(createAvatar(s, { seed: SEED, [key]: [v] }).toString(), `${style}-${key}-${i++}`);
    html += cell(v, svg);
  }
  html += `</div>`;
}
html += `</body>`;
writeFileSync('public/_visemes.html', html);
console.log('wrote public/_visemes.html');
