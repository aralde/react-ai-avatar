import './lib.css';

/**
 * Main entry: `react-ai-avatar`.
 *
 * The core only: the two avatar components, the orb, the flat presets, the
 * `#rra-*` contract runtime and the mouth drivers. Everything else is a
 * subpath, so an app only ships what it imports:
 *
 * - `react-ai-avatar/characters` — SquirrelAvatar, CoderAvatar, PortraitAvatar
 * - `react-ai-avatar/dicebear`   — DiceBearAvatar and the style catalog
 * - `react-ai-avatar/3d`         — VrmAvatar, GlbArkitAvatar (three.js peers)
 */

export { RealtimeAvatar } from '../components/RealtimeAvatar';
export type { RealtimeAvatarProps, RealtimeAvatarVariant } from '../components/RealtimeAvatar';

// The "clip" technique: a looping video per state, crossfaded. Bring your own footage.
export { VideoAvatar } from '../components/VideoAvatar';
export type { VideoAvatarProps } from '../components/VideoAvatar';
export type { VideoClips, VideoClipSource, IdleVariation } from './videoClips';

// Props both avatar components share: the overlays and the mouth drivers.
export type { AvatarChromeProps } from '../components/AvatarFrame';
export type { MouthDriverProps } from './useMouthSource';

// The voice-assistant orb, also available as `variant="orb"`.
export { OrbAvatar } from '../components/OrbAvatar';
export type { OrbAvatarProps } from '../components/OrbAvatar';

// The `#rra-*` layer contract: any SVG with these hooks becomes an avatar.
export { ContractAvatar } from '../components/ContractAvatar';
export type { ContractAvatarProps } from '../components/ContractAvatar';
export { useAvatarRuntime } from './useAvatarRuntime';
export type { AvatarRuntimeOptions } from './useAvatarRuntime';
// For your own faces: read the enclosing avatar's state instead of taking it as a prop.
export { useAvatarState, AvatarStateContext } from './avatarState';

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

// Host-placed caption + thought widgets. Drop them into your own layout slot
// instead of relying on the avatar's floating overlays (handy inside a
// constrained card). Both flatten markdown to spoken prose and roll a window.
export { AvatarCaption, AvatarThought, ThoughtEmojiBubble, DEFAULT_THINKING_EMOJIS } from '../components/AvatarCaption';
export type { AvatarCaptionProps, AvatarThoughtProps, ThoughtEmojiBubbleProps } from '../components/AvatarCaption';
// Pure text helpers behind the widgets, exported for custom captions.
export { toPlainText, tailWindow } from './captionText';
export type { TailWindowOptions } from './captionText';

export { useAudioMouth } from './useAudioMouth';
export { createMouthEngine } from './mouthEngine';
export type { MouthEngine, MouthFrame, MouthShape, MouthSource } from './mouthEngine';

// Token-rate mouth driver for text-streaming LLMs (completions/responses).
export { createSpeechActivity, isSpeechActivity, SPEECH_ACTIVITY_BRAND } from './speechActivity';
export type { SpeechActivitySource, SpeechActivityOptions } from './speechActivity';
// Declarative bridge: drive the mouth from accumulated streaming text
// (e.g. the Vercel AI SDK's `useChat`) instead of imperative push() calls.
export { useStreamingTextActivity } from './useStreamingTextActivity';
export { useReducedMotion } from './useReducedMotion';

export { DEFAULT_STATE_COLORS, DEFAULT_STATE_LABELS } from './stateDefaults';
export type { AvatarState, StateColors, StateLabels, AvatarCustomization, AvatarProps } from './types';
export type { DiceBearCollection } from './dicebear';
