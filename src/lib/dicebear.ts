/**
 * DiceBear catalog — curated, CC0-only styles.
 *
 * DiceBear (https://www.dicebear.com) ships ~30 avatar styles under mixed
 * licenses. To keep this library's "no attribution headaches" promise, we
 * expose ONLY the styles licensed CC0 1.0 (public domain). Styles such as
 * `bottts` ("free for personal and commercial use") or the many CC BY 4.0
 * ones are intentionally left out — a host app can still use them via the
 * raw `<DiceBearAvatar collection={...} />` escape hatch at its own
 * licensing discretion, the same way `byos` SVGs keep their own license.
 *
 * Generation is done client-side with the `@dicebear/core` +
 * `@dicebear/collection` packages (optional peer deps, lazy-loaded). No
 * network call, deterministic per `seed`, works offline.
 */

/** The curated set of CC0 1.0 DiceBear style ids (kebab-case = DiceBear id). */
export type DiceBearCollection =
  | 'pixel-art'
  | 'pixel-art-neutral'
  | 'lorelei'
  | 'lorelei-neutral'
  | 'notionists'
  | 'notionists-neutral'
  | 'open-peeps'
  | 'thumbs';

export interface DiceBearStyleMeta {
  /** Kebab-case id — both the DiceBear style id and the UI/value key. */
  id: DiceBearCollection;
  /** camelCase named export inside `@dicebear/collection`. */
  exportName: string;
  /** Human label for catalog UIs. */
  label: string;
  /** Always 'CC0 1.0' here — that's the whole point of the curation. */
  license: 'CC0 1.0';
}

/**
 * kebab-case style id -> camelCase `@dicebear/collection` export name.
 * `pixel-art-neutral` -> `pixelArtNeutral`, `open-peeps` -> `openPeeps`.
 */
export function collectionExportName(id: string): string {
  return id.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}

/**
 * Curated CC0 catalog, in display order. All entries have a face, so all
 * articulate via viseme swapping (see DICEBEAR_RIGS). The abstract CC0 styles
 * (shapes, rings, glass, identicon) are intentionally excluded — they have no
 * mouth to drive.
 */
export const DICEBEAR_STYLES: readonly DiceBearStyleMeta[] = (
  [
    ['pixel-art', 'Pixel Art'],
    ['pixel-art-neutral', 'Pixel Art Neutral'],
    ['lorelei', 'Lorelei'],
    ['lorelei-neutral', 'Lorelei Neutral'],
    ['notionists', 'Notionists'],
    ['notionists-neutral', 'Notionists Neutral'],
    ['open-peeps', 'Open Peeps'],
    ['thumbs', 'Thumbs'],
  ] as const
).map(([id, label]) => ({
  id,
  exportName: collectionExportName(id),
  label,
  license: 'CC0 1.0' as const,
}));

/**
 * Prefix every internal id in a DiceBear SVG (and every reference to it) so
 * multiple SVGs from the same style can coexist in one document without their
 * `clipPath` / `mask` / gradient ids colliding — which would otherwise blank
 * out all but the first. Needed because we stack several frames of the same
 * avatar (closed/open mouth, blink) on top of each other.
 */
export function scopeSvgIds(svg: string, prefix: string): string {
  const ids = new Set<string>();
  const re = /\bid="([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(svg))) ids.add(m[1]);
  let out = svg;
  for (const id of ids) {
    const esc = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    out = out
      .replace(new RegExp(`id="${esc}"`, 'g'), `id="${prefix}-${id}"`)
      .replace(new RegExp(`url\\(#${esc}\\)`, 'g'), `url(#${prefix}-${id})`)
      .replace(new RegExp(`(xlink:href|href)="#${esc}"`, 'g'), `$1="#${prefix}-${id}"`);
  }
  return out;
}

/**
 * Per-style "rig": how to articulate a given DiceBear style for talking.
 *
 * DiceBear SVGs are pre-baked with no `#rra-*` hooks, but the official option
 * API lets us *pick* which mouth/lips/face/eyes variant to render. So instead
 * of the bounce-only fallback we pre-generate a few frames of the SAME avatar
 * (same seed → identical everything else) with different mouth/eye variants and
 * swap between them per audio frame — real articulation via the supported API.
 *
 * Only styles that actually expose suitable variants are rigged; the rest
 * (abstract styles with no face) fall back to the audio-reactive bounce. The
 * variant ids below were chosen by eye from each style's variant set.
 */
export interface DiceBearRig {
  /** Option key that drives the mouth shape. */
  part: 'mouth' | 'lips' | 'face';
  /** Three variant names ordered [closed, mid, open]. */
  visemes: [string, string, string];
  /** Independent eye blink (for `mouth`/`lips` styles where eyes are separate). */
  blink?: { open: string; closed: string };
  /**
   * For `face` styles, mouth + eyes are a single coupled value, so a blink is a
   * whole-face variant that briefly replaces the current viseme.
   */
  faceBlink?: string;
}

export const DICEBEAR_RIGS: Partial<Record<DiceBearCollection, DiceBearRig>> = {
  'pixel-art': { part: 'mouth', visemes: ['happy01', 'happy11', 'happy12'] },
  'pixel-art-neutral': { part: 'mouth', visemes: ['happy01', 'happy11', 'happy12'] },
  lorelei: { part: 'mouth', visemes: ['happy01', 'happy08', 'happy06'] },
  'lorelei-neutral': { part: 'mouth', visemes: ['happy01', 'happy08', 'happy06'] },
  notionists: {
    part: 'lips',
    visemes: ['variant23', 'variant26', 'variant30'],
    blink: { open: 'variant03', closed: 'variant01' },
  },
  'notionists-neutral': {
    part: 'lips',
    visemes: ['variant23', 'variant26', 'variant30'],
    blink: { open: 'variant03', closed: 'variant01' },
  },
  thumbs: { part: 'mouth', visemes: ['variant3', 'variant1', 'variant2'] },
  'open-peeps': { part: 'face', visemes: ['calm', 'smile', 'smileBig'], faceBlink: 'eyesClosed' },
  // Every curated style is rigged. A non-rigged style id (e.g. an abstract one
  // a host passes itself) gets the audio-reactive bounce fallback instead.
};

/**
 * Curated "featured faces": hand-picked {style, seed} pairs that look good out
 * of the box, so a host (or the demo picker) can offer a gallery instead of
 * asking users to guess a seed string. Seeds are deterministic — these exact
 * faces render identically everywhere, offline, no network call.
 */
export interface DiceBearFeaturedFace {
  /** Curated CC0 style id. */
  collection: DiceBearCollection;
  /** Deterministic seed picked for a nice-looking result. */
  seed: string;
}

export const DICEBEAR_FEATURED_FACES: readonly DiceBearFeaturedFace[] = [
  { collection: 'notionists', seed: 'lg9gf48i' },
  { collection: 'notionists', seed: '8c1jvg09' },
  { collection: 'notionists', seed: 'glk0g9uv' },
  { collection: 'notionists', seed: 'pp70crp6' },
  { collection: 'open-peeps', seed: '2ehwdy6e' },
  { collection: 'open-peeps', seed: '1q3sb396' },
  { collection: 'open-peeps', seed: 'k8adqmt7' },
  { collection: 'open-peeps', seed: 'x6kn3bke' },
  { collection: 'lorelei', seed: 'b2wi3z2j' },
  { collection: 'lorelei', seed: 'lp1iegj9' },
  { collection: 'lorelei', seed: '6umh2s52' },
  { collection: 'pixel-art', seed: 'smmje3r6' },
  { collection: 'pixel-art', seed: 'wxhz14w1' },
  { collection: 'pixel-art', seed: 'uovelmrj' },
];

/** Default face when none is provided — the first featured face. */
export const DEFAULT_DICEBEAR_COLLECTION: DiceBearCollection = DICEBEAR_FEATURED_FACES[0].collection;
export const DEFAULT_DICEBEAR_SEED: string = DICEBEAR_FEATURED_FACES[0].seed;

/** O(1) lookup by id. */
export const DICEBEAR_STYLE_BY_ID: Record<DiceBearCollection, DiceBearStyleMeta> =
  Object.fromEntries(DICEBEAR_STYLES.map((s) => [s.id, s])) as Record<
    DiceBearCollection,
    DiceBearStyleMeta
  >;

// --- Lazy package loading -------------------------------------------------
// `@dicebear/core` + `@dicebear/collection` are optional peer deps; import them
// only when actually rendering a DiceBear avatar (or thumbnail). The module
// promise is cached so every caller on the page shares one load.

type CreateAvatar = (style: unknown, options: Record<string, unknown>) => { toString(): string };
export type DiceBearModules = { createAvatar: CreateAvatar; collection: Record<string, unknown> };

let modulesPromise: Promise<DiceBearModules> | null = null;

export function loadDiceBear(): Promise<DiceBearModules> {
  if (!modulesPromise) {
    modulesPromise = Promise.all([
      import('@dicebear/core'),
      import('@dicebear/collection'),
    ]).then(([core, collection]) => ({
      createAvatar: (core as { createAvatar: CreateAvatar }).createAvatar,
      collection: collection as Record<string, unknown>,
    }));
  }
  return modulesPromise;
}

/**
 * Render a single static DiceBear SVG string for a given style + seed. Used for
 * non-animated thumbnails (e.g. a face-picker gallery). Throws if the style id
 * is unknown.
 */
export async function renderDiceBearSvg(
  collection: DiceBearCollection | string,
  seed: string,
  options: Record<string, unknown> = {}
): Promise<string> {
  const { createAvatar, collection: coll } = await loadDiceBear();
  const styleObj = coll[collectionExportName(String(collection))];
  if (!styleObj) throw new Error(`Unknown DiceBear style "${collection}"`);
  return createAvatar(styleObj, { seed, ...options }).toString();
}
