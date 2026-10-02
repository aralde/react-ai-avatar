import { describe, it, expect } from 'vitest';
import { type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { GeometricAvatar } from '../components/GeometricAvatar';
import { MemojiAvatar } from '../components/MemojiAvatar';
import { PixelArtAvatar } from '../components/PixelArtAvatar';
import { DoodleAvatar } from '../components/DoodleAvatar';
import { SquirrelAvatar } from '../components/SquirrelAvatar';
import { CoderAvatar } from '../components/CoderAvatar';
import { PortraitAvatar } from '../components/PortraitAvatar';
import { ContractAvatar } from '../components/ContractAvatar';

/**
 * Layer-contract conformance: every contract preset must expose the stable
 * hooks the runtime drives. Add each new catalog preset to PRESETS.
 */

const REQUIRED_IDS = ['rra-head', 'rra-mouth', 'rra-think'];
const REQUIRED_CLASSES: Array<[string, number]> = [
  ['rra-pupil', 2],
  ['rra-lid', 2],
];

const PRESETS: Array<[string, ReactElement]> = [
  ['geometric', <GeometricAvatar key="g" />],
  ['memoji', <MemojiAvatar key="m" />],
  ['pixelart', <PixelArtAvatar key="p" />],
  ['doodle', <DoodleAvatar key="d" />],
];

/**
 * Branded characters ship their own head group id (`#rra-squirrel-head`,
 * `#rra-coder-head`) because the poses rotate it, so they're checked against the
 * hooks the runtime actually queries rather than the preset id convention.
 */
const CHARACTERS: Array<[string, ReactElement]> = [
  ['squirrel', <SquirrelAvatar key="s" />],
  ['coder', <CoderAvatar key="c" />],
  ['portrait', <PortraitAvatar key="pt" />],
];

const RUNTIME_IDS = ['rra-mouth', 'rra-think'];

describe('layer contract', () => {
  for (const [name, element] of PRESETS) {
    describe(`${name} preset`, () => {
      const html = renderToStaticMarkup(element);

      it('exposes all required ids', () => {
        for (const id of REQUIRED_IDS) {
          expect(html, `missing #${id}`).toContain(`id="${id}"`);
        }
      });

      it('exposes paired classes with the expected count', () => {
        for (const [cls, count] of REQUIRED_CLASSES) {
          const matches = html.match(new RegExp(`class="[^"]*${cls}[^"]*"`, 'g')) ?? [];
          expect(matches.length, `.${cls}`).toBe(count);
        }
      });
    });
  }

  for (const [name, element] of CHARACTERS) {
    describe(`${name} character`, () => {
      const html = renderToStaticMarkup(element);

      it('exposes the ids the runtime drives', () => {
        for (const id of RUNTIME_IDS) {
          expect(html, `missing #${id}`).toContain(`id="${id}"`);
        }
      });

      it('exposes paired classes with the expected count', () => {
        for (const [cls, count] of REQUIRED_CLASSES) {
          const matches = html.match(new RegExp(`class="[^"]*${cls}[^"]*"`, 'g')) ?? [];
          expect(matches.length, `.${cls}`).toBe(count);
        }
      });

      it('rests the mouth closed and the lids open', () => {
        // closed = a thin resting ellipse; the runtime opens it from there
        const ry = html.match(/id="rra-mouth"[^>]*ry="([\d.]+)"/)?.[1];
        expect(ry, 'resting mouth ry').toBeDefined();
        expect(Number(ry)).toBeLessThanOrEqual(3);
        const lids = html.match(/class="rra-lid"[^>]*/g) ?? [];
        for (const lid of lids) {
          expect(lid, 'lids must rest at height 0 (open)').toContain('height="0"');
          expect(lid, 'lids need a travel distance').toMatch(/data-max-height="\d/);
        }
      });
    });
  }
});

describe('PortraitAvatar', () => {
  it('scopes its internal ids per instance, so two on one page never clash', () => {
    const html = renderToStaticMarkup(
      <>
        <PortraitAvatar poses />
        <PortraitAvatar poses />
      </>
    );
    const ids = [...html.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
    // only the runtime hooks repeat (each avatar's runtime queries its own container)
    const internal = ids.filter((id) => id !== 'rra-mouth' && id !== 'rra-think');
    expect(new Set(internal).size).toBe(internal.length);
    // and no reference points at the shared #rra-mouth
    expect(html).not.toMatch(/href="#rra-mouth"/);
  });

  it('renders the coffee break and the back view only with poses', () => {
    const plain = renderToStaticMarkup(<PortraitAvatar state="working" />);
    const posed = renderToStaticMarkup(<PortraitAvatar state="working" poses />);
    // match class attributes, not the scoped <style> that names every class
    for (const cls of ['rra-pt-mug', 'rra-pt-back', 'rra-pt-back-only']) {
      expect(plain, cls).not.toContain(`class="${cls}"`);
      expect(posed, cls).toContain(`class="${cls}"`);
    }
    expect(plain).toMatch(/<svg[^>]*data-state="working"/);
    expect(plain).not.toMatch(/<svg[^>]*data-poses/);
    expect(posed).toMatch(/<svg[^>]*data-poses/);
  });
});

describe('SSR safety', () => {
  it('ContractAvatar renders on the server without touching window', () => {
    const html = renderToStaticMarkup(
      <ContractAvatar state="thinking" analyser={null}>
        <GeometricAvatar />
      </ContractAvatar>
    );
    expect(html).toContain('id="rra-mouth"');
  });
});
