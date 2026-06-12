import { useEffect, useRef } from 'react';
import { createMouthEngine, MouthFrame } from './mouthEngine';

export interface UseAudioMouthOptions {
  /** Audio source. `null` switches to the procedural fallback engine. */
  analyser: AnalyserNode | null;
  /** Run the loop only while true (typically `state === 'speaking'`). */
  enabled: boolean;
  /** Called once per animation frame with the current mouth frame. */
  onFrame: (frame: MouthFrame) => void;
  /** Called when the loop stops (close the mouth here). */
  onStop?: () => void;
}

/**
 * Drives a mouth animation from audio (or the procedural fallback) via
 * requestAnimationFrame. Components map the emitted MouthFrame onto
 * whatever they animate: an SVG path, an ellipse `ry`, VRM visemes, etc.
 */
export function useAudioMouth({ analyser, enabled, onFrame, onStop }: UseAudioMouthOptions) {
  // Keep latest callbacks without retriggering the effect.
  const onFrameRef = useRef(onFrame);
  const onStopRef = useRef(onStop);
  onFrameRef.current = onFrame;
  onStopRef.current = onStop;

  useEffect(() => {
    if (!enabled) {
      onStopRef.current?.();
      return;
    }

    const engine = createMouthEngine(analyser);
    let raf: number;

    const tick = () => {
      onFrameRef.current(engine.read());
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      onStopRef.current?.();
    };
  }, [analyser, enabled]);
}
