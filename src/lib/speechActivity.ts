/**
 * Token-rate mouth driver.
 *
 * A text-streaming LLM (OpenAI-style `/chat/completions` or `/responses`
 * with `stream: true`) returns no audio — only tokens arriving over time.
 * This source turns that *cadence* into the same 0..1 energy signal an
 * AnalyserNode would give the mouth engine: the host feeds streamed text
 * chunks via `push()`, energy rises with how fast tokens arrive and decays
 * during pauses. The result is a mouth that visibly tracks the stream
 * (busy while the model is producing, settling when it stalls or ends).
 *
 * The library stays presentational and provider-agnostic: it never fetches
 * anything. You bring the stream; this turns it into a face.
 */

/** Brand so the mouth engine can tell a SpeechActivitySource from an AnalyserNode. */
export const SPEECH_ACTIVITY_BRAND = '__rraSpeechActivity' as const;

export interface SpeechActivitySource {
  readonly [SPEECH_ACTIVITY_BRAND]: true;
  /** Feed a streamed chunk of model text (one or more tokens). */
  push(textChunk: string): void;
  /** Mark the stream finished; energy decays to closed on its own. */
  end(): void;
  /** Drop all energy immediately (e.g. an interrupted turn). */
  reset(): void;
  /** Current decayed energy, 0 (closed) to 1 (wide). Read once per frame. */
  sample(): number;
}

export interface SpeechActivityOptions {
  /**
   * Energy added per character pushed. Higher = the mouth opens wider for
   * the same amount of text. Default tuned for typical token sizes.
   */
  chargePerChar?: number;
  /**
   * Decay time constant in ms: energy falls to ~37% of its value after this
   * long without new tokens. Smaller = the mouth closes faster on pauses.
   */
  decayMs?: number;
  /** Max energy a single `push()` can contribute, so a big chunk can't peg the mouth. */
  maxChargePerPush?: number;
  /** Clock source, injectable for tests. Defaults to performance.now / Date.now. */
  now?: () => number;
}

const DEFAULTS: Required<Omit<SpeechActivityOptions, 'now'>> = {
  chargePerChar: 0.12,
  decayMs: 140,
  maxChargePerPush: 0.9,
};

/**
 * Create a token-rate activity source. Pass the returned object as the
 * `speechActivity` prop of `<RealtimeAvatar />` and call `push()` with each
 * streamed chunk of model text.
 */
export function createSpeechActivity(options: SpeechActivityOptions = {}): SpeechActivitySource {
  const chargePerChar = options.chargePerChar ?? DEFAULTS.chargePerChar;
  const decayMs = options.decayMs ?? DEFAULTS.decayMs;
  const maxChargePerPush = options.maxChargePerPush ?? DEFAULTS.maxChargePerPush;
  const now =
    options.now ??
    (typeof performance !== 'undefined' ? () => performance.now() : () => Date.now());

  let energy = 0;
  let lastT = now();

  const decayTo = (t: number) => {
    const dt = t - lastT;
    lastT = t;
    if (dt > 0) energy *= Math.exp(-dt / decayMs);
  };

  return {
    [SPEECH_ACTIVITY_BRAND]: true,
    push(textChunk: string) {
      if (!textChunk) return;
      const t = now();
      decayTo(t);
      energy = Math.min(1, energy + Math.min(maxChargePerPush, textChunk.length * chargePerChar));
    },
    end() {
      // Nothing to flush: existing energy decays naturally on the next sample().
    },
    reset() {
      energy = 0;
      lastT = now();
    },
    sample() {
      decayTo(now());
      return energy < 0.001 ? 0 : Math.min(1, energy);
    },
  };
}

/** Type guard: is this mouth source a token-rate SpeechActivitySource? */
export function isSpeechActivity(
  source: AnalyserNode | SpeechActivitySource | null | undefined
): source is SpeechActivitySource {
  return !!source && (source as SpeechActivitySource)[SPEECH_ACTIVITY_BRAND] === true;
}
