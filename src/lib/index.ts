import './lib.css';

export { RealtimeAvatar } from '../components/RealtimeAvatar';
export type { RealtimeAvatarProps } from '../components/RealtimeAvatar';

export { ContractAvatar } from '../components/ContractAvatar';
export type { ContractAvatarProps } from '../components/ContractAvatar';

export { GeometricAvatar } from '../components/GeometricAvatar';
export type { GeometricAvatarProps } from '../components/GeometricAvatar';

export { MemojiAvatar } from '../components/MemojiAvatar';
export type { MemojiAvatarProps } from '../components/MemojiAvatar';

export { PixelArtAvatar } from '../components/PixelArtAvatar';
export type { PixelArtAvatarProps } from '../components/PixelArtAvatar';

export { DoodleAvatar } from '../components/DoodleAvatar';
export type { DoodleAvatarProps } from '../components/DoodleAvatar';

export { AudioVisualizer } from '../components/AudioVisualizer';
export type { AudioVisualizerProps } from '../components/AudioVisualizer';

export { useAvatarRuntime } from './useAvatarRuntime';
export type { AvatarRuntimeOptions } from './useAvatarRuntime';
export { useAudioMouth } from './useAudioMouth';
export { createMouthEngine } from './mouthEngine';
export type { MouthEngine, MouthFrame, MouthShape } from './mouthEngine';
export { useReducedMotion } from './useReducedMotion';

export type { AvatarState, StateColors, StateLabels } from './types';
export type { AvatarCustomization, AvatarProps } from '../components/DefaultAvatar';
