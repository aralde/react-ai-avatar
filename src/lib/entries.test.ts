import { describe, it, expect } from 'vitest';
import * as main from './index';
import * as characters from './characters';
import * as dicebear from './dicebear-entry';
import * as vrm from './vrm';

/**
 * The main entry is the core; the heavy or optional parts live in subpaths.
 * Re-exporting them from the main entry would put them back in every bundle.
 */
describe('entry points', () => {
  it('keeps characters and DiceBear out of the main entry', () => {
    for (const name of ['SquirrelAvatar', 'CoderAvatar', 'PortraitAvatar', 'DiceBearAvatar', 'DiceBearThumb', 'DICEBEAR_STYLES']) {
      expect(main).not.toHaveProperty(name);
    }
  });

  it('exposes the core from the main entry', () => {
    for (const name of ['RealtimeAvatar', 'VideoAvatar', 'OrbAvatar', 'ContractAvatar', 'useAvatarState', 'createSpeechActivity']) {
      expect(main).toHaveProperty(name);
    }
  });

  it('exposes each subpath', () => {
    expect(Object.keys(characters).sort()).toEqual(['CoderAvatar', 'PortraitAvatar', 'SquirrelAvatar']);
    expect(dicebear).toHaveProperty('DiceBearAvatar');
    expect(dicebear).toHaveProperty('DICEBEAR_STYLES');
    expect(Object.keys(vrm).sort()).toEqual(['GlbArkitAvatar', 'VrmAvatar']);
  });
});
