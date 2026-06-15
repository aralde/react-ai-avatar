/**
 * Optional VRM entry point: `react-ai-avatar/vrm`.
 *
 * Importing this module pulls in three.js, @react-three/fiber, @react-three/drei
 * and @pixiv/three-vrm (optional peer dependencies). The main entry never does:
 * `<RealtimeAvatar variant="vrm" />` loads this chunk lazily on demand.
 */

export { VrmAvatar } from '../components/VrmAvatar';
export type { VrmAvatarProps } from '../components/VrmAvatar';
