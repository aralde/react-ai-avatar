/**
 * Branded characters: `react-ai-avatar/characters`.
 *
 * Full character faces on the `#rra-*` contract, kept out of the main entry so
 * an app that only draws a preset, an orb or a video never ships them. Render
 * one as the child of `RealtimeAvatar`; it inherits `state` from it:
 *
 *   <RealtimeAvatar state={state}><SquirrelAvatar poses /></RealtimeAvatar>
 */

export { SquirrelAvatar } from '../components/SquirrelAvatar';
export type { SquirrelAvatarProps } from '../components/SquirrelAvatar';
export { CoderAvatar } from '../components/CoderAvatar';
export type { CoderAvatarProps } from '../components/CoderAvatar';
// The "puppet" technique: a fixed illustration with vector layers animated on
// top. Its raster layers are inlined, so it is by far the heaviest export.
export { PortraitAvatar } from '../components/PortraitAvatar';
export type { PortraitAvatarProps } from '../components/PortraitAvatar';
