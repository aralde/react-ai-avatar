import React from 'react';
import { motion } from 'motion/react';
import { toPlainText, tailWindow } from '../lib/captionText';

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
