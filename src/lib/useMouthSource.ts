import type { MouthSource } from './mouthEngine';
import type { SpeechActivitySource } from './speechActivity';
import { useStreamingTextActivity } from './useStreamingTextActivity';

/** The three ways a host can drive the mouth. Shared by every avatar component. */
export interface MouthDriverProps {
  /**
   * WebAudio AnalyserNode of the assistant's voice (voice pipelines). Omit it
   * (or pass `null`) and `speaking` falls back to a synthetic pattern.
   */
  analyser?: AnalyserNode | null;
  /**
   * Token-rate driver for text-streaming LLMs: create one with
   * `createSpeechActivity()` and `push()` each streamed chunk. Takes
   * precedence over `analyser`.
   */
  speechActivity?: SpeechActivitySource;
  /**
   * Declarative alternative to `speechActivity`: pass the *accumulated*
   * assistant text (what `useChat` hands you) and the avatar diffs its growth.
   * Ignored when `speechActivity` is set; takes precedence over `analyser`.
   */
  streamingText?: string;
}

/**
 * Collapse the three drivers into one mouth source. A text source (explicit
 * `speechActivity`, else one derived from `streamingText`) wins over audio.
 */
export function useMouthSource({ analyser = null, speechActivity, streamingText }: MouthDriverProps): MouthSource {
  const textActivity = useStreamingTextActivity(streamingText);
  return speechActivity ?? textActivity ?? analyser;
}
