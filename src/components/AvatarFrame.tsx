import React, { useEffect, useRef, useState } from 'react';
import { AvatarCaption, AvatarThought, ThoughtEmojiBubble, DEFAULT_THINKING_EMOJIS } from './AvatarCaption';
import type { AvatarState, StateColors, StateLabels } from '../lib/types';
import type { MouthSource } from '../lib/mouthEngine';
import { isSpeechActivity } from '../lib/speechActivity';
import { AvatarStateContext } from '../lib/avatarState';
import { useReducedMotion } from '../lib/useReducedMotion';
import { hexToRgba } from '../lib/color';
import { DEFAULT_STATE_COLORS, DEFAULT_STATE_LABELS } from '../lib/stateDefaults';

/**
 * Everything around the face, shared by `RealtimeAvatar` and `VideoAvatar`:
 * the reactive glow, the state pill, the thought / emoji bubble and the
 * subtitles. Both components take these props, with the same defaults.
 */
export interface AvatarChromeProps {
  /** Conversation state. Default `'idle'`. */
  state?: AvatarState;
  /** Width and height: px as a number, or any CSS length (`'100%'`, `'12rem'`). */
  size?: number | string;
  /** Accessible name of the avatar. The current state label is appended. Default `'Avatar'`. */
  label?: string;
  /** Spoken text, shown as movie-style subtitles under the avatar. */
  subtitle?: string;
  /** Reasoning gist, shown in a bubble above the avatar while you pass it. */
  thought?: string;
  /** Tool being run; shown in the pill as "Working: <tool>" while `working`. */
  tool?: string;
  /**
   * Emoji reel in a bubble while `thinking`, instead of the text `thought`.
   * `true` for the default set, or your own emoji array.
   */
  thinkingEmojis?: boolean | string[];
  /** Milliseconds each emoji stays before the next. Default 900. */
  thinkingEmojiInterval?: number;
  /** Emoji bubble diameter in px. Defaults to ~28% of the avatar's width. */
  thinkingEmojiSize?: number;
  /** Overlays: all on by default; set false to hide individually. */
  showGlow?: boolean;
  showStatePill?: boolean;
  showThought?: boolean;
  showSubtitle?: boolean;
  stateColors?: StateColors;
  stateLabels?: StateLabels;
  className?: string;
  style?: React.CSSProperties;
}

export interface AvatarFrameProps extends AvatarChromeProps {
  /** Default size when the caller passes none. */
  defaultSize: number | string;
  /** Drives the glow pulse (audio amplitude or token-rate energy). */
  mouthSource: MouthSource;
  /** The face. Rendered in a square box that fills the frame. */
  children: React.ReactNode;
}

/** Opacity of the pill's colored halo, per state: quiet when idle, vivid when active. */
const PILL_HALO: Record<AvatarState, number> = {
  idle: 0.15,
  listening: 0.35,
  thinking: 0.4,
  speaking: 0.45,
  working: 0.4,
};

/** Rendered width in px: the number itself, or measured when `size` is a CSS length. */
function useBoxWidth(ref: React.RefObject<HTMLDivElement | null>, size: number | string): number {
  const [measured, setMeasured] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (typeof size === 'number' || !el) return;
    setMeasured(el.getBoundingClientRect().width);
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => setMeasured(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, size]);

  return typeof size === 'number' ? size : measured;
}

/** Current speech energy, 0–1: peak deviation for audio, `sample()` for text. */
function readEnergy(source: MouthSource, buffer: Uint8Array<ArrayBuffer> | null): number {
  if (!source) return 0;
  if (isSpeechActivity(source)) return source.sample();
  if (!buffer) return 0;
  source.getByteTimeDomainData(buffer);
  let peak = 0;
  for (let i = 0; i < buffer.length; i++) {
    const dev = Math.abs(buffer[i] - 128);
    if (dev > peak) peak = dev;
  }
  return Math.min(1, peak / 128);
}

/** Soft color glow behind the face, pulsing with speech energy. */
function Glow({ state, color, source }: { state: AvatarState; color: string; source: MouthSource }) {
  const ref = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const busy = state === 'thinking' || state === 'working';
    const apply = (scale: number, opacity: number) => {
      el.style.transform = `scale(${scale})`;
      el.style.opacity = String(opacity);
    };

    // Audio pulses while speaking or listening; a text stream only while speaking.
    const reactive =
      !reducedMotion &&
      source !== null &&
      (state === 'speaking' || (state === 'listening' && !isSpeechActivity(source)));
    if (!reactive) {
      apply(busy ? 1.05 : 1, busy ? 0.35 : 0.15);
      return;
    }

    const buffer = isSpeechActivity(source) ? null : new Uint8Array(source.frequencyBinCount);
    let raf = 0;
    const tick = () => {
      const energy = readEnergy(source, buffer);
      apply(1 + energy * 0.35, 0.15 + energy * 0.35);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [state, source, reducedMotion]);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="rra-glow rra:absolute rra:w-[90%] rra:h-[90%] rra:rounded-[1.75rem] rra:pointer-events-none rra:filter rra:blur-2xl"
      style={{ backgroundColor: color, opacity: 0.15 }}
    />
  );
}

/** The bubble trail fades out: each dot mixes less of the border color in. */
const trailMix = (percent: number) => ({ '--rra-bubble-border-mix': `${percent}%` }) as React.CSSProperties;

/** "Thinking" emoji bubble, anchored in the avatar's own top-right corner. */
function EmojiBubble({ emojis, interval, size }: { emojis: string[]; interval: number; size: number }) {
  return (
    <div className="rra:absolute rra:z-40" style={{ top: '2%', right: '2%' }}>
      <div className="rra:relative">
        <ThoughtEmojiBubble emojis={emojis} interval={interval} size={size} />
        {/* Trail circles leading down-left from the bubble toward the face */}
        <div
          className="rra-bubble rra:absolute rra:rounded-full rra:shadow-md rra:backdrop-blur-md"
          style={{ width: size * 0.22, height: size * 0.22, bottom: -size * 0.14, left: -size * 0.02 }}
        />
        <div
          className="rra-bubble rra:absolute rra:rounded-full rra:shadow-sm rra:backdrop-blur-md"
          style={{ width: size * 0.14, height: size * 0.14, bottom: -size * 0.3, left: -size * 0.18, ...trailMix(20) }}
        />
      </div>
    </div>
  );
}

/** Text thought bubble floating above the avatar. */
function ThoughtBubble({ text }: { text: string }) {
  return (
    <div className="rra:absolute rra:bottom-[108%] rra:left-1/2 rra:-translate-x-1/2 rra:w-[90vw] rra:max-w-[340px] rra:md:max-w-[420px] rra:z-40">
      <div className="rra:relative">
        <AvatarThought text={text} className="rra:max-w-none" />
        {/* Thought trail circles pointing down toward the face */}
        <div className="rra-bubble rra:absolute rra:-bottom-3 rra:left-1/2 rra:-translate-x-1/2 rra:w-4 rra:h-4 rra:rounded-full rra:shadow-md rra:backdrop-blur-md" style={trailMix(20)} />
        <div className="rra-bubble rra:absolute rra:-bottom-6 rra:left-[48%] rra:-translate-x-1/2 rra:w-2.5 rra:h-2.5 rra:rounded-full rra:shadow-sm rra:backdrop-blur-md" style={trailMix(15)} />
        <div className="rra-bubble rra:absolute rra:-bottom-8 rra:left-[47%] rra:-translate-x-1/2 rra:w-1.5 rra:h-1.5 rra:rounded-full rra:backdrop-blur-md" style={trailMix(10)} />
      </div>
    </div>
  );
}

function StatePill({ text, color, halo, ping }: { text: string; color: string; halo: number; ping: boolean }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="rra-state-pill rra:absolute rra:-bottom-6 rra:px-4 rra:py-1.5 rra:rounded-full rra:text-xs rra:font-bold rra:uppercase rra:tracking-widest rra:shadow-lg rra:z-30 rra:cursor-default rra:select-none rra:border rra:border-white/10"
      style={{ backgroundColor: color, boxShadow: `0 4px 14px rgba(0,0,0,0.4), 0 0 16px ${hexToRgba(color, halo)}` }}
    >
      <span className="rra:flex rra:items-center rra:gap-1.5">
        <span className={`rra:w-2 rra:h-2 rra:rounded-full rra:bg-current ${ping ? 'rra:animate-ping' : ''}`} />
        {text}
      </span>
    </div>
  );
}

export function AvatarFrame({
  state = 'idle',
  size,
  defaultSize,
  label = 'Avatar',
  subtitle,
  thought,
  tool,
  thinkingEmojis,
  thinkingEmojiInterval = 900,
  thinkingEmojiSize,
  showGlow = true,
  showStatePill = true,
  showThought = true,
  showSubtitle = true,
  stateColors,
  stateLabels,
  className = '',
  style,
  mouthSource,
  children,
}: AvatarFrameProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const resolvedSize = size ?? defaultSize;
  const width = useBoxWidth(rootRef, resolvedSize);
  const reducedMotion = useReducedMotion();

  const color = stateColors?.[state] ?? DEFAULT_STATE_COLORS[state];
  const stateLabel = stateLabels?.[state] ?? DEFAULT_STATE_LABELS[state];
  const pillText = state === 'working' && tool ? `Working: ${tool}` : stateLabel;

  // `true` -> default set; an array -> that set (empty disables). When the reel
  // is on, it takes the bubble slot and the text `thought` stands down.
  const emojiReel = Array.isArray(thinkingEmojis) ? thinkingEmojis : thinkingEmojis ? DEFAULT_THINKING_EMOJIS : null;
  const emojiSize = thinkingEmojiSize ?? Math.round(width * 0.28);
  const showEmojis = state === 'thinking' && !!emojiReel && emojiReel.length > 0 && emojiSize > 0;

  return (
    <AvatarStateContext.Provider value={state}>
      <div
        ref={rootRef}
        data-state={state}
        className={`rra-avatar rra:relative rra:flex rra:flex-col rra:items-center rra:justify-center ${className}`}
        style={{ width: resolvedSize, height: typeof resolvedSize === 'number' ? resolvedSize : undefined, aspectRatio: '1 / 1', ...style }}
      >
        {showGlow && <Glow state={state} color={color} source={mouthSource} />}

        <div
          role="img"
          aria-label={`${label} (${stateLabel})`}
          className="rra:w-full rra:h-full rra:relative rra:flex rra:items-center rra:justify-center rra:z-10"
          // Passes the frame's border-radius down, so a face can clip to it.
          style={{ borderRadius: 'inherit' }}
        >
          {children}
        </div>

        {showEmojis ? (
          <EmojiBubble emojis={emojiReel} interval={thinkingEmojiInterval} size={emojiSize} />
        ) : (
          showThought && thought && <ThoughtBubble text={thought} />
        )}

        {showStatePill && (
          <StatePill
            text={pillText}
            color={color}
            halo={PILL_HALO[state]}
            ping={!reducedMotion && (state === 'speaking' || state === 'thinking')}
          />
        )}

        {showSubtitle && subtitle && (
          <div className="rra:absolute rra:top-[115%] rra:left-1/2 rra:-translate-x-1/2 rra:w-[90vw] rra:max-w-[500px] rra:md:max-w-[640px] rra:z-50 rra:pb-8">
            <AvatarCaption text={subtitle} />
          </div>
        )}
      </div>
    </AvatarStateContext.Provider>
  );
}
