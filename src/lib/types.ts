/**
 * Core public types for react-ai-avatar.
 *
 * The library is purely presentational: the host app resolves the
 * conversation state and (optionally) provides a WebAudio AnalyserNode;
 * the library renders the face.
 */

import type React from 'react';
import type { MouthSource } from './mouthEngine';

export type AvatarState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'working';

export interface StateColors {
  idle?: string;
  listening?: string;
  thinking?: string;
  speaking?: string;
  working?: string;
}

export interface StateLabels {
  idle?: string;
  listening?: string;
  thinking?: string;
  speaking?: string;
  working?: string;
}

/** Colors and accessories for the flat presets and the branded characters. */
export interface AvatarCustomization {
  skinColor: string;
  hairColor: string;
  clothingColor: string;
  hoodieColor: string;
  bgColor: string;
  glasses: boolean;
  glassesColor: string;
  headphones: boolean;
  headphonesColor: string;
}

/** Props every self-animating renderer (the 3D ones) takes from `RealtimeAvatar`. */
export interface AvatarProps {
  state: AvatarState;
  /** Mouth source: AnalyserNode (audio), SpeechActivitySource (text), or null. */
  analyser: MouthSource;
  size?: number | string;
  className?: string;
  style?: React.CSSProperties;
  maxMouthOpening?: number;
  blinkIntervalMin?: number;
  blinkIntervalMax?: number;
  blinkDuration?: number;
  mouseTrackingIntensity?: number;
  stateColors?: StateColors;
  customization?: AvatarCustomization;
}
