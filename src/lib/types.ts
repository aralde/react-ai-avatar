/**
 * Core public types for react-ai-avatar.
 *
 * The library is purely presentational: the host app resolves the
 * conversation state and (optionally) provides a WebAudio AnalyserNode;
 * the library renders the face.
 */

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
