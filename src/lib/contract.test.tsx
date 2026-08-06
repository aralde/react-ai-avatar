import { describe, it, expect } from 'vitest';
import { type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { GeometricAvatar } from '../components/GeometricAvatar';
import { MemojiAvatar } from '../components/MemojiAvatar';
import { PixelArtAvatar } from '../components/PixelArtAvatar';
import { DoodleAvatar } from '../components/DoodleAvatar';
import { SquirrelAvatar } from '../components/SquirrelAvatar';
import { CoderAvatar } from '../components/CoderAvatar';
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
        expect(html).toMatch(/id="rra-mouth"[^>]*ry="2\.3"/);
        const lids = html.match(/class="rra-lid"[^>]*/g) ?? [];
        for (const lid of lids) {
          expect(lid, 'lids must rest at height 0 (open)').toContain('height="0"');
          expect(lid, 'lids need a travel distance').toMatch(/data-max-height="\d/);
        }
      });
    });
  }
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
