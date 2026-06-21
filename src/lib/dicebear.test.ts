import { describe, it, expect } from 'vitest';
import {
  collectionExportName,
  scopeSvgIds,
  DICEBEAR_STYLES,
  DICEBEAR_STYLE_BY_ID,
  DICEBEAR_RIGS,
  DICEBEAR_FEATURED_FACES,
  DEFAULT_DICEBEAR_COLLECTION,
  DEFAULT_DICEBEAR_SEED,
} from './dicebear';

describe('collectionExportName', () => {
  it('maps kebab-case style ids to @dicebear/collection camelCase exports', () => {
    expect(collectionExportName('pixel-art')).toBe('pixelArt');
    expect(collectionExportName('pixel-art-neutral')).toBe('pixelArtNeutral');
    expect(collectionExportName('open-peeps')).toBe('openPeeps');
    expect(collectionExportName('lorelei-neutral')).toBe('loreleiNeutral');
  });

  it('leaves single-word ids untouched', () => {
    expect(collectionExportName('thumbs')).toBe('thumbs');
    expect(collectionExportName('identicon')).toBe('identicon');
  });
});

describe('DICEBEAR_STYLES catalog', () => {
  it('is curated to CC0 1.0 only (no-attribution promise)', () => {
    expect(DICEBEAR_STYLES.length).toBeGreaterThan(0);
    for (const s of DICEBEAR_STYLES) {
      expect(s.license).toBe('CC0 1.0');
    }
  });

  it('explicitly excludes the non-CC0 bottts/avataaars styles', () => {
    const ids = DICEBEAR_STYLES.map((s) => s.id);
    expect(ids).not.toContain('bottts');
    expect(ids).not.toContain('bottts-neutral');
    expect(ids).not.toContain('avataaars');
  });

  it('exposes a consistent export name for every entry', () => {
    for (const s of DICEBEAR_STYLES) {
      expect(s.exportName).toBe(collectionExportName(s.id));
    }
  });

  it('indexes every style by id and includes the default', () => {
    for (const s of DICEBEAR_STYLES) {
      expect(DICEBEAR_STYLE_BY_ID[s.id]).toBe(s);
    }
    expect(DICEBEAR_STYLE_BY_ID[DEFAULT_DICEBEAR_COLLECTION]).toBeDefined();
  });
});

describe('DICEBEAR_FEATURED_FACES', () => {
  it('only references styles in the curated catalog', () => {
    const ids = new Set(DICEBEAR_STYLES.map((s) => s.id));
    for (const face of DICEBEAR_FEATURED_FACES) {
      expect(ids.has(face.collection)).toBe(true);
      expect(face.seed.length).toBeGreaterThan(0);
    }
  });

  it('only features styles that articulate (have a rig)', () => {
    for (const face of DICEBEAR_FEATURED_FACES) {
      expect(DICEBEAR_RIGS[face.collection]).toBeDefined();
    }
  });

  it('has unique {collection, seed} pairs', () => {
    const keys = DICEBEAR_FEATURED_FACES.map((f) => `${f.collection}:${f.seed}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('uses the first featured face as the default', () => {
    expect(DEFAULT_DICEBEAR_COLLECTION).toBe(DICEBEAR_FEATURED_FACES[0].collection);
    expect(DEFAULT_DICEBEAR_SEED).toBe(DICEBEAR_FEATURED_FACES[0].seed);
  });
});

describe('scopeSvgIds', () => {
  it('prefixes ids and every reference to them', () => {
    const svg =
      '<svg><clipPath id="a"><rect/></clipPath><mask id="b"/><g clip-path="url(#a)" mask="url(#b)"><use href="#a" xlink:href="#b"/></g></svg>';
    const out = scopeSvgIds(svg, 'p1');
    expect(out).toContain('id="p1-a"');
    expect(out).toContain('id="p1-b"');
    expect(out).toContain('url(#p1-a)');
    expect(out).toContain('url(#p1-b)');
    expect(out).toContain('href="#p1-a"');
    expect(out).toContain('xlink:href="#p1-b"');
    // No bare references to the original ids should remain.
    expect(out).not.toContain('url(#a)');
    expect(out).not.toContain('"#b"');
  });

  it('keeps distinct prefixes from colliding across frames', () => {
    const svg = '<svg><linearGradient id="g"/><rect fill="url(#g)"/></svg>';
    const a = scopeSvgIds(svg, 'm0');
    const b = scopeSvgIds(svg, 'm1');
    expect(a).toContain('url(#m0-g)');
    expect(b).toContain('url(#m1-g)');
    expect(a).not.toContain('m1-g');
  });
});

describe('DICEBEAR_RIGS', () => {
  it('only rigs ids that exist in the curated catalog', () => {
    const ids = new Set(DICEBEAR_STYLES.map((s) => s.id));
    for (const id of Object.keys(DICEBEAR_RIGS)) {
      expect(ids.has(id as any)).toBe(true);
    }
  });

  it('every rig has exactly three visemes [closed, mid, open]', () => {
    for (const rig of Object.values(DICEBEAR_RIGS)) {
      expect(rig!.visemes).toHaveLength(3);
      expect(new Set(rig!.visemes).size).toBe(3);
    }
  });

  it('face rigs use faceBlink and mouth/lips rigs use eye blink (if any)', () => {
    for (const rig of Object.values(DICEBEAR_RIGS)) {
      if (rig!.part === 'face') {
        expect(rig!.blink).toBeUndefined();
      } else {
        expect(rig!.faceBlink).toBeUndefined();
      }
    }
  });
});
