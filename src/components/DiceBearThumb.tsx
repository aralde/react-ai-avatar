import { useEffect, useState } from 'react';
import { DiceBearCollection, renderDiceBearSvg } from '../lib/dicebear';

/**
 * Static, non-animated DiceBear face — a single SVG generated client-side for a
 * given style + seed. Used by the face-picker gallery so users see the actual
 * faces instead of guessing seed strings. Shares the lazy package load + module
 * cache with `DiceBearAvatar` (see `loadDiceBear`), so a grid of thumbnails only
 * pays for one package import.
 */
export interface DiceBearThumbProps {
  collection: DiceBearCollection | string;
  seed: string;
  size?: number;
  className?: string;
}

export function DiceBearThumb({ collection, seed, size = 44, className = '' }: DiceBearThumbProps) {
  const [svg, setSvg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setSvg(null);
    renderDiceBearSvg(collection, seed)
      .then((s) => {
        if (!cancelled) setSvg(s);
      })
      .catch(() => {
        if (!cancelled) setSvg(null);
      });
    return () => {
      cancelled = true;
    };
  }, [collection, seed]);

  return (
    <div
      className={`flex items-center justify-center overflow-hidden ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {svg ? (
        <div
          className="w-full h-full [&>svg]:w-full [&>svg]:h-full"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <div className="w-full h-full rounded-md bg-zinc-800/40 animate-pulse" />
      )}
    </div>
  );
}
