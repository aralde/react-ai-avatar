import { describe, it, expect } from 'vitest';
import { type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { GeometricAvatar } from '../components/GeometricAvatar';
import { MemojiAvatar } from '../components/MemojiAvatar';
import { PixelArtAvatar } from '../components/PixelArtAvatar';
import { DoodleAvatar } from '../components/DoodleAvatar';
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
  ['coder', <CoderAvatar key="c" />],
];

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
