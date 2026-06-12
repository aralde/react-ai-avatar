import '../index.css';

export { RealtimeAvatar } from '../components/RealtimeAvatar';
export type { RealtimeAvatarProps } from '../components/RealtimeAvatar';

export { ContractAvatar } from '../components/ContractAvatar';
export type { ContractAvatarProps } from '../components/ContractAvatar';

export { GeometricAvatar } from '../components/GeometricAvatar';
export type { GeometricAvatarProps } from '../components/GeometricAvatar';

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
