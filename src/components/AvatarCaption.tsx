import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
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

/** Movie-style live caption: a clean, rolling trailing window of the speech. */
export function AvatarCaption({ text, maxChars = 160, className = '', style }: AvatarCaptionProps) {
  const clean = tailWindow(toPlainText(text ?? ''), { maxChars });
  if (!clean) return null;

  return (
    <div
      className={`rra-caption w-full flex justify-center pointer-events-none ${className}`}
      style={style}
    >
      <motion.span
        key={clean}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
        role="status"
        aria-live="polite"
        className="inline-block max-w-[640px] text-center text-base md:text-lg font-medium text-zinc-100 leading-relaxed px-5 py-3 rounded-2xl border border-zinc-700/40 break-words"
        style={{
          textShadow: '0px 1px 3px rgba(0,0,0,0.5)',
          background: 'rgba(9, 9, 11, 0.8)',
          backdropFilter: 'blur(12px)',
        }}
      >
        {clean}
      </motion.span>
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
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={`rra-thought w-full max-w-[420px] text-left pointer-events-none ${className}`}
      style={style}
    >
      <div className="bg-zinc-900/90 backdrop-blur-xl text-zinc-100 px-5 py-4 rounded-3xl shadow-[0_10px_30px_rgba(139,92,246,0.15)] border border-purple-500/25 text-sm italic break-words">
        <div className="text-purple-400 text-[10px] uppercase tracking-widest font-mono font-bold mb-1 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
          {label}
        </div>
        <p className="leading-relaxed text-zinc-200">{clean}</p>
      </div>
    </motion.div>
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
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={`rra-thought-emoji flex justify-center pointer-events-none ${className}`}
      style={style}
      role="status"
      aria-live="off"
      aria-label="Thinking"
    >
      <div
        className="relative flex items-center justify-center rounded-full bg-zinc-900/90 backdrop-blur-xl border border-purple-500/25 shadow-[0_10px_30px_rgba(139,92,246,0.25)]"
        style={{ width: size, height: size }}
      >
        {/* `mode="wait"` keeps exactly one glyph mounted: the outgoing one fully
            exits before the next enters. (An earlier `popLayout` version leaked —
            exited spans stacked up to the reel length instead of unmounting.) */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={index}
            initial={reduced ? false : { opacity: 0, scale: 0.6, rotate: -15 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={reduced ? undefined : { opacity: 0, scale: 0.6, rotate: 15 }}
            transition={{ duration: 0.18 }}
            className="absolute leading-none select-none"
            style={{ fontSize: Math.round(size * 0.5) }}
          >
            {current}
          </motion.span>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
