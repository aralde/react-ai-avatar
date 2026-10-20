/**
 * DiceBear avatars: `react-ai-avatar/dicebear`.
 *
 * Needs the optional peers `@dicebear/core` and `@dicebear/collection`, which
 * are loaded on demand. `<RealtimeAvatar variant="dicebear" />` lazy-loads the
 * same renderer, so import from here only for the standalone component or the
 * style catalog helpers.
 */

export { DiceBearAvatar } from '../components/DiceBearAvatar';
export type { DiceBearAvatarProps } from '../components/DiceBearAvatar';
export { DiceBearThumb } from '../components/DiceBearThumb';
export type { DiceBearThumbProps } from '../components/DiceBearThumb';
export {
  DICEBEAR_STYLES,
  DICEBEAR_STYLE_BY_ID,
  DICEBEAR_RIGS,
  DICEBEAR_FEATURED_FACES,
  DEFAULT_DICEBEAR_COLLECTION,
  DEFAULT_DICEBEAR_SEED,
  collectionExportName,
  scopeSvgIds,
  loadDiceBear,
  renderDiceBearSvg,
} from './dicebear';
export type {
  DiceBearCollection,
  DiceBearStyleMeta,
  DiceBearRig,
  DiceBearFeaturedFace,
  DiceBearModules,
} from './dicebear';
