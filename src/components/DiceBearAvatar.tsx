import React, { useEffect, useRef, useState } from 'react';
import { AvatarState, StateColors } from '../lib/types';
import { createMouthEngine, MouthEngine, MouthSource } from '../lib/mouthEngine';
import { useReducedMotion } from '../lib/useReducedMotion';
import {
  DiceBearCollection,
  DiceBearRig,
  DICEBEAR_RIGS,
  DEFAULT_DICEBEAR_COLLECTION,
  collectionExportName,
  scopeSvgIds,
} from '../lib/dicebear';

/**
 * DiceBearAvatar — renders a DiceBear (https://www.dicebear.com) avatar and
 * makes it talk.
 *
 * Two animation strategies, picked per style:
 *
 * 1. **Viseme swapping** (styles with a face: pixel-art, lorelei, notionists,
 *    thumbs, open-peeps). DiceBear has no `#rra-*` hooks, but its option API
 *    lets us pick which mouth/eyes variant to render. So we pre-generate a few
 *    frames of the SAME avatar (same seed ⇒ identical hair/skin/etc.) with
 *    closed / mid / open mouths (+ optional blink) and swap which one is shown
 *    per audio frame. Real articulation, via the supported API — no fragile
 *    path heuristics. A subtle bounce rides on top for liveliness. The per-style
 *    variant choices live in `DICEBEAR_RIGS`.
 *
 * 2. **Audio-reactive bounce** — fallback for any non-rigged style id a host
 *    passes itself (e.g. a faceless abstract DiceBear style). The whole avatar
 *    squashes & lifts with amplitude. The curated catalog has none of these.
 *
 * Generation is client-side and lazy: `@dicebear/core` + `@dicebear/collection`
 * are optional peer deps, dynamically imported only when this variant renders.
 * Deterministic per `seed`, no network call. The curated catalog is CC0-only
 * (see ../lib/dicebear.ts) so the library keeps its no-attribution promise.
 */

export interface DiceBearAvatarProps {
  state: AvatarState;
  /** Mouth source: AnalyserNode (audio), SpeechActivitySource (text), or null. */
  analyser: MouthSource;
  size?: number;
  /** Curated CC0 style; any DiceBear style id also works at your own licensing discretion. */
  collection?: DiceBearCollection | string;
  /** Deterministic seed — same seed + style => same face. */
  seed?: string;
  /** DiceBear background colors (hex without `#`, e.g. ['b6e3f4']). */
  backgroundColor?: string[];
  /** DiceBear background corner radius, 0–50. */
  radius?: number;
  className?: string;
  style?: React.CSSProperties;
  /** Reused as bounce/mouth intensity (same slider as the SVG presets). */
  maxMouthOpening?: number;
  stateColors?: StateColors;
}

type CreateAvatar = (style: unknown, options: Record<string, unknown>) => { toString(): string };
type DiceBearModules = { createAvatar: CreateAvatar; collection: Record<string, unknown> };

// Cache the dynamically-imported packages across mounts/instances.
let modulesPromise: Promise<DiceBearModules> | null = null;
function loadDiceBear(): Promise<DiceBearModules> {
  if (!modulesPromise) {
    modulesPromise = Promise.all([
      import('@dicebear/core'),
      import('@dicebear/collection'),
    ]).then(([core, collection]) => ({
      createAvatar: (core as any).createAvatar as CreateAvatar,
      collection: collection as Record<string, unknown>,
    }));
  }
  return modulesPromise;
}

interface Frame {
  key: string;
  html: string;
}

/**
 * Build the frame set for a rigged style. For `mouth`/`lips` rigs we cross the
 * 3 visemes with {eyes-open, eyes-closed} so blinking can keep the current
 * mouth; for `face` rigs (mouth+eyes coupled) we emit the 3 visemes plus one
 * blink frame.
 */
function buildRiggedFrames(
  createAvatar: CreateAvatar,
  style: unknown,
  base: Record<string, unknown>,
  rig: DiceBearRig,
  idPrefix: string
): Frame[] {
  const frames: Frame[] = [];
  const make = (key: string, extra: Record<string, unknown>) =>
    frames.push({
      key,
      html: scopeSvgIds(createAvatar(style, { ...base, ...extra }).toString(), `${idPrefix}-${key}`),
    });

  if (rig.part === 'face') {
    rig.visemes.forEach((v, i) => make(`m${i}`, { face: [v] }));
    if (rig.faceBlink) make('blink', { face: [rig.faceBlink] });
  } else {
    const eyeStates: Array<['o' | 'c', Record<string, unknown>]> = rig.blink
      ? [
          ['o', { eyes: [rig.blink.open] }],
          ['c', { eyes: [rig.blink.closed] }],
        ]
      : [['o', {}]];
    rig.visemes.forEach((v, i) => {
      for (const [ek, eo] of eyeStates) make(`m${i}-${ek}`, { [rig.part]: [v], ...eo });
    });
  }
  return frames;
}

export function DiceBearAvatar({
  state,
  analyser,
  size = 300,
  collection = DEFAULT_DICEBEAR_COLLECTION,
  seed = 'realtime-avatar',
  backgroundColor,
  radius,
  className = '',
  style,
  maxMouthOpening = 30,
  stateColors,
}: DiceBearAvatarProps) {
  const reducedMotion = useReducedMotion();
  const wrapRef = useRef<HTMLDivElement>(null);
  const frameElsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const rafRef = useRef<number | null>(null);

  const [frames, setFrames] = useState<Frame[] | null>(null);
  const [rig, setRig] = useState<DiceBearRig | null>(null);
  const [error, setError] = useState<'missing' | string | null>(null);

  const animRef = useRef({ state, analyser, maxMouthOpening });
  animRef.current = { state, analyser, maxMouthOpening };

  const bgKey = backgroundColor?.join(',') ?? '';

  // Generate the frame set whenever the look-defining inputs change.
  useEffect(() => {
    let cancelled = false;
    setFrames(null);
    setError(null);

    loadDiceBear()
      .then(({ createAvatar, collection: coll }) => {
        if (cancelled) return;
        const styleObj = coll[collectionExportName(String(collection))];
        if (!styleObj) {
          setError(`Unknown DiceBear style "${collection}"`);
          return;
        }
        const base: Record<string, unknown> = { seed };
        if (backgroundColor && backgroundColor.length) base.backgroundColor = backgroundColor;
        if (radius != null) base.radius = radius;

        const styleRig = (DICEBEAR_RIGS as Record<string, DiceBearRig | undefined>)[String(collection)] ?? null;
        frameElsRef.current = new Map();
        if (styleRig) {
          setRig(styleRig);
          setFrames(buildRiggedFrames(createAvatar, styleObj, base, styleRig, 'rra-db'));
        } else {
          // Abstract style: single frame, animated by bounce only.
          setRig(null);
          setFrames([{ key: 'base', html: scopeSvgIds(createAvatar(styleObj, base).toString(), 'rra-db-base') }]);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        const msg = err?.message || String(err);
        setError(/Cannot find module|Failed to (resolve|fetch)|dicebear/i.test(msg) ? 'missing' : msg);
      });

    return () => {
      cancelled = true;
    };
  }, [collection, seed, radius, bgKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Animation loop: viseme swap (+ micro-bounce) or full bounce.
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || !frames || frames.length === 0 || typeof window === 'undefined') return;

    const els = frameElsRef.current;
    const hasBlink = !!(rig && (rig.blink || rig.faceBlink));

    let engine: MouthEngine | null = null;
    let engineAnalyser: MouthSource = null;
    let level = 0;
    let breathe = 0;
    let blinkTimer = 1500 + Math.random() * 2500;
    let blinkProgress = 0;
    let blinking = false;
    let mouthIdx = 0;
    let lastKey = '';
    let last = performance.now();

    const showFrame = (key: string) => {
      if (key === lastKey) return;
      const next = els.get(key) ?? els.get(frames[0].key);
      els.forEach((el) => {
        el.style.display = el === next ? 'block' : 'none';
      });
      lastKey = key;
    };

    const tick = (now: number) => {
      const dt = Math.min(100, now - last);
      last = now;
      const { state: st, analyser: an, maxMouthOpening: mmo } = animRef.current;
      const speaking = st === 'speaking';
      const gain = mmo / 30;

      // 1. Audio level (procedural fallback when analyser is null)
      if (speaking) {
        if (!engine || engineAnalyser !== an) {
          engine = createMouthEngine(an);
          engineAnalyser = an;
        }
        level += (engine.read().level - level) * 0.3;
      } else {
        engine = null;
        engineAnalyser = null;
        level += (0 - level) * 0.25;
      }

      // 2. Blink timing (skipped under reduced motion or unsupported styles)
      if (hasBlink && !reducedMotion) {
        if (!blinking) {
          blinkTimer -= dt;
          if (blinkTimer <= 0) {
            blinking = true;
            blinkProgress = 0;
          }
        } else {
          blinkProgress += dt;
          if (blinkProgress >= 160) {
            blinking = false;
            blinkTimer = 1800 + Math.random() * 3500;
          }
        }
      }

      if (rig) {
        // 3a. Viseme swap. Bucket the smoothed level into closed/mid/open as a
        // small state machine with hysteresis, so it doesn't flicker at the
        // thresholds (open at >0.36, mid at >0.13; fall back at <0.30 / <0.10).
        let idx = mouthIdx;
        if (mouthIdx === 0) {
          if (level > 0.13) idx = level > 0.36 ? 2 : 1;
        } else if (mouthIdx === 1) {
          if (level > 0.36) idx = 2;
          else if (level < 0.09) idx = 0;
        } else {
          if (level < 0.1) idx = 0;
          else if (level < 0.3) idx = 1;
        }
        mouthIdx = speaking ? idx : 0;

        if (rig.part === 'face') {
          showFrame(blinking && rig.faceBlink ? 'blink' : `m${mouthIdx}`);
        } else {
          const eye = blinking && rig.blink ? 'c' : 'o';
          showFrame(`m${mouthIdx}-${eye}`);
        }

        // 3b. Micro-bounce on top.
        let breatheScale = 0;
        let nod = 0;
        if (!reducedMotion) {
          breathe += dt * 0.002;
          breatheScale = Math.sin(breathe) * 0.008;
          if (st === 'listening') nod = Math.sin(breathe * 1.6) * 1.2;
        }
        const lift = level * 4 * gain;
        const sy = 1 + level * 0.04 * gain + breatheScale;
        const sx = 1 - level * 0.02 * gain + breatheScale;
        wrap.style.transform = `translateY(${(-lift + nod).toFixed(2)}px) scale(${sx.toFixed(4)}, ${sy.toFixed(4)})`;
      } else {
        // 4. Abstract style: full audio-reactive bounce (squash & stretch + lift).
        let breatheScale = 0;
        if (!reducedMotion) {
          breathe += dt * 0.002;
          breatheScale = Math.sin(breathe) * 0.012;
        }
        const lift = level * 10 * gain;
        const sy = 1 + level * 0.1 * gain + breatheScale;
        const sx = 1 - level * 0.05 * gain + breatheScale;
        const tilt = st === 'thinking' && !reducedMotion ? -4 : 0;
        wrap.style.transform = `translateY(${(-lift).toFixed(2)}px) scale(${sx.toFixed(4)}, ${sy.toFixed(4)}) rotate(${tilt}deg)`;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    wrap.style.transformOrigin = 'center bottom';
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [frames, rig, reducedMotion]);

  const accent = stateColors?.[state] ?? '#10b981';

  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: size, height: size, ...style }}
    >
      {frames && (
        <div ref={wrapRef} className="relative w-full h-full will-change-transform" role="img" aria-label="Avatar">
          {frames.map((f, i) => (
            <div
              key={f.key}
              ref={(el) => {
                if (el) frameElsRef.current.set(f.key, el);
                else frameElsRef.current.delete(f.key);
              }}
              dangerouslySetInnerHTML={{ __html: f.html }}
              className="absolute inset-0 [&>svg]:w-full [&>svg]:h-full"
              style={{ display: i === 0 ? 'block' : 'none' }}
            />
          ))}
        </div>
      )}

      {/* Loading spinner while the packages + frames resolve */}
      {!frames && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div
            className="w-8 h-8 border-4 rounded-full animate-spin mb-2"
            style={{ borderColor: `${accent}33`, borderTopColor: accent }}
          />
          <span className="text-[10px] font-mono font-bold tracking-widest text-zinc-400 animate-pulse">
            GENERATING AVATAR…
          </span>
        </div>
      )}

      {/* Optional peer deps not installed */}
      {error === 'missing' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/90 backdrop-blur-md rounded-2xl p-4 text-center">
          <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider mb-2">
            DiceBear not installed
          </span>
          <p className="text-[10px] text-zinc-500 max-w-[220px] leading-relaxed mb-2">
            Install the optional peer dependencies to use this variant:
          </p>
          <code className="text-[10px] text-zinc-300 bg-zinc-900 px-2 py-1 rounded border border-zinc-800 break-all">
            npm i @dicebear/core @dicebear/collection
          </code>
        </div>
      )}

      {/* Other generation errors */}
      {error && error !== 'missing' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/90 backdrop-blur-md rounded-2xl p-4 text-center">
          <span className="text-xs font-mono font-bold text-red-400 uppercase tracking-wider mb-2">
            Failed to generate
          </span>
          <p className="text-[10px] text-zinc-500 max-w-[220px] leading-relaxed break-all">{error}</p>
        </div>
      )}
    </div>
  );
}
