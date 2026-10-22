/**
 * 3D avatars: `react-ai-avatar/3d` (also reachable as `react-ai-avatar/vrm`).
 *
 * Importing this module pulls in three.js, @react-three/fiber, @react-three/drei
 * and @pixiv/three-vrm (optional peer dependencies). The main entry never does:
 * `<RealtimeAvatar variant="vrm" | "glb" />` loads these renderers lazily.
 */

export { VrmAvatar } from '../components/VrmAvatar';
export type { VrmAvatarProps } from '../components/VrmAvatar';
export { GlbArkitAvatar } from '../components/GlbArkitAvatar';
export type { GlbArkitAvatarProps } from '../components/GlbArkitAvatar';
