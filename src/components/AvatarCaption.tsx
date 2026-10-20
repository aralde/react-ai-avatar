import React, { useEffect, useState } from 'react';
import { toPlainText, tailWindow } from '../lib/captionText';
import { useReducedMotion } from '../lib/useReducedMotion';

/**
 * Host-placed caption + thought widgets.
 *
 * Unlike the overlays baked into `<RealtimeAvatar />` (which float `absolute`
 * around the face and assume open canvas), these are plain in-flow blocks: you
 * drop them into your own layout slot and they take that slot's width. That
 * makes them safe inside a constrained card — no overflow clipping, no
 * lienzo-infinito assumption.
 *
 * Both flatten markdown to spoken prose (`toPlainText`) and bound the length so
 * a long streamed reply never becomes a wall of text. The caption rolls a
 * trailing window (movie-subtitle style); the thought fades a capped block.
 */

export interface AvatarCaptionProps {
  /** Raw (possibly markdown, possibly mid-stream) spoken text. */
  text?: string;
  /** Trailing window size in characters. Default 160. */
  maxChars?: number;
  className?: string;
  style?: React.CSSProperties;
}

/** Entrance tuning for the `rra-enter` keyframes (see lib.css). */
const ENTER_SOFT = {
  '--rra-enter-y': '8px',
  '--rra-enter-scale': '0.98',
  '--rra-enter-duration': '300ms',
} as React.CSSProperties;
const ENTER_BUBBLE = { ...ENTER_SOFT, '--rra-enter-scale': '0.9' } as React.CSSProperties;

/** Movie-style live caption: a clean, rolling trailing window of the speech. */
export function AvatarCaption({ text, maxChars = 160, className = '', style }: AvatarCaptionProps) {
  const clean = tailWindow(toPlainText(text ?? ''), { maxChars });
  if (!clean) return null;

  return (
    <div
      className={`rra-caption rra:w-full rra:flex rra:justify-center rra:pointer-events-none ${className}`}
      style={style}
    >
      <span
        key={clean}
        role="status"
        aria-live="polite"
        className="rra-enter rra-caption-box rra:inline-block rra:max-w-[640px] rra:text-center rra:text-base rra:md:text-lg rra:font-medium rra:leading-relaxed rra:px-5 rra:py-3 rra:rounded-2xl rra:break-words"
        style={{ backdropFilter: 'blur(12px)' }}
      >
        {clean}
      </span>
    </div>
  );
}

export interface AvatarThoughtProps {
  /** Raw (possibly markdown, possibly mid-stream) reasoning text. */
  text?: string;
  /** Trailing window size in characters. Default 220. */
  maxChars?: number;
  /** Label above the reasoning. Default "Thought process". */
  label?: string;
  className?: string;
  style?: React.CSSProperties;
}

/** Reasoning gist: a clean, capped trailing window with a pulsing label. */
export function AvatarThought({
  text,
  maxChars = 220,
  label = 'Thought process',
  className = '',
  style,
}: AvatarThoughtProps) {
  const clean = tailWindow(toPlainText(text ?? ''), { maxChars });
  if (!clean) return null;

  return (
    <div
      className={`rra-thought rra-enter rra:w-full rra:max-w-[420px] rra:text-left rra:pointer-events-none ${className}`}
      style={{ ...ENTER_SOFT, ...style }}
    >
      <div className="rra-bubble rra:backdrop-blur-xl rra:px-5 rra:py-4 rra:rounded-3xl rra:shadow-[0_10px_30px_rgba(139,92,246,0.15)] rra:text-sm rra:italic rra:break-words">
        <div className="rra-bubble-accent rra:text-[10px] rra:uppercase rra:tracking-widest rra:font-mono rra:font-bold rra:mb-1 rra:flex rra:items-center rra:gap-1.5">
          <span className="rra:w-1.5 rra:h-1.5 rra:rounded-full rra:bg-current rra:animate-pulse" />
          {label}
        </div>
        <p className="rra:leading-relaxed">{clean}</p>
      </div>
    </div>
  );
}

/**
 * Default emoji reel for the thinking bubble: a loose "reasoning / study / web"
 * vocabulary. Purely decorative — it emulates "the avatar is mulling something
 * over" without exposing the real chain of thought (which the host renders
 * elsewhere, e.g. a Claude-Code-style reasoning panel in the chat).
 */
export const DEFAULT_THINKING_EMOJIS = [
  '🤔', '💭', '📚', '🔍', '🌐', '💡', '🧠', '📝', '⚙️',
];

export interface ThoughtEmojiBubbleProps {
  /** Emoji reel to cycle through. Defaults to `DEFAULT_THINKING_EMOJIS`. */
  emojis?: string[];
  /** Milliseconds each emoji stays on screen before the next. Default 900. */
  interval?: number;
  /** Bubble diameter in px. The emoji glyph scales from it. Default 64. */
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Comic thought bubble that cross-fades through a reel of emojis. Meant to sit
 * near the face during `thinking`, as a lightweight "emulation" of pondering
 * when you don't want to surface the raw reasoning on the avatar itself. Honors
 * `prefers-reduced-motion` by holding a single emoji instead of animating the
 * reel. The glyph is sized off `size`, so one prop scales the whole bubble.
 */
export function ThoughtEmojiBubble({
  emojis = DEFAULT_THINKING_EMOJIS,
  interval = 900,
  size = 64,
  className = '',
  style,
}: ThoughtEmojiBubbleProps) {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (reduced || emojis.length <= 1) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % emojis.length);
    }, Math.max(200, interval));
    return () => clearInterval(id);
  }, [reduced, emojis.length, interval]);

  if (emojis.length === 0) return null;
  const current = emojis[index % emojis.length];

  return (
    <div
      className={`rra-thought-emoji rra-enter rra:flex rra:justify-center rra:pointer-events-none ${className}`}
      style={{ ...ENTER_BUBBLE, ...style }}
      role="status"
      aria-live="off"
      aria-label="Thinking"
    >
      <div
        className="rra-bubble rra:relative rra:flex rra:items-center rra:justify-center rra:rounded-full rra:backdrop-blur-xl rra:shadow-[0_10px_30px_rgba(139,92,246,0.25)]"
        style={{ width: size, height: size }}
      >
        {/* Keyed by index: exactly one glyph is ever mounted, and each new one
            pops in. (An earlier exit-animation version leaked stacked spans.) */}
        <span
          key={index}
          className={`${index === 0 ? '' : 'rra-enter-pop '}rra:absolute rra:leading-none rra:select-none`}
          style={{ fontSize: Math.round(size * 0.5) }}
        >
          {current}
        </span>
      </div>
    </div>
  );
}
