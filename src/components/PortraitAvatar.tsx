import React from 'react';
import type { AvatarState } from '../lib/types';
import {
  PORTRAIT_BACK,
  PORTRAIT_FRONT,
  PORTRAIT_SCREENS_BACK,
  PORTRAIT_SCREENS_FRONT,
} from './portraitAssets';

/**
 * PortraitAvatar — the "puppet" technique: a fixed illustration (the library
 * author's portrait) is embedded untouched, and only the parts that move are drawn
 * on top as vector layers colour-matched to the picture. The runtime drives those
 * layers through the usual `#rra-*` contract (blink, gaze, audio/text mouth,
 * thought bubble); everything else reacts to `state` with CSS:
 *
 * - talking: the illustration's grin is patched over with skin and a vector mouth
 *   that closes in pauses and shows teeth/tongue as it opens (a/e/o shapes);
 * - thinking: eyes narrow and look toward the bubble, a sideways "hmm" mouth;
 * - the monitors behind always run scrolling terminal output (masked so it passes
 *   behind the head), faster while thinking/working.
 *
 * With `poses` (off by default, like the other characters):
 * - idle: every 20 s he brings a "CODE" mug up, sips with eyes half-closed, and
 *   puts it away;
 * - working: he turns around — a back view facing the monitors.
 *
 * No `customization`: the colours come from the picture. Honors
 * `prefers-reduced-motion` (no scrolling, no coffee, no transitions; the mouth
 * still talks, as with every preset).
 *
 * In the demo it's rendered through `variant="byos"`.
 */

export interface PortraitAvatarProps {
  /** SVG width/height. Defaults to `'100%'` so it fills its (sized) container.
   *  Pass a number for a fixed pixel size. */
  size?: number | string;
  state?: AvatarState;
  /**
   * Opt in to the per-state poses: a coffee break every 20 s while `idle`, and
   * a back view facing the monitors while `working`. Off by default.
   */
  poses?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const SKIN = '#f8b496'; // around the eyes — the eyelids
const FACE = '#f6a886'; // around the mouth and on the hands
const SKIN_SHADOW = '#d98a6c';
const LASH = '#3a2b2e';
const EYE_WHITE = '#fdfbf2';
const IRIS = '#4d393c';
const LIP = '#c8705a';
const LIP_LINE = '#6b3a33';
const SCREEN = '#3f5d61';
const HOODIE = '#3d3c42';
const HOODIE_EDGE = '#26252a';
const MUG = '#2b2b30';
const MUG_EDGE = '#4a4a52';
const THINK = '#8b5cf6';

/** The picture covers a 176-unit square drawn for an r=88 disc; the characters
 *  share an r=79 disc, so the whole drawing is scaled about the centre. */
const DISC_SCALE = 79 / 88;

const n = (v: number) => Math.round(v * 10) / 10;

// ---------- terminal output on the monitors ----------

const LINE_H = 3.2;
const LINES = 22;
const BLOCK_H = n(LINE_H * LINES);
const CODE_COLORS = ['#5fd38d', '#5fd38d', '#5fd38d', '#5fd38d', '#5fd38d', '#8fb8ad', '#e5c07b', '#7cc4e8'];

interface CodeSegment {
  x: number;
  y: number;
  w: number;
  color: string;
}

/** Deterministic PRNG, so the server and the client draw the same lines. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function codeBlock(x0: number, width: number, seed: number): CodeSegment[] {
  const rand = mulberry32(seed);
  const pick = <T,>(items: T[]) => items[Math.floor(rand() * items.length)];
  const segments: CodeSegment[] = [];
  for (let line = 0; line < LINES; line++) {
    let x = x0 + pick([0, 0, 3, 3, 6, 9]);
    const count = 1 + Math.floor(rand() * 3);
    for (let i = 0; i < count; i++) {
      const w = 3 + rand() * 10;
      if (x + w > x0 + width) break;
      segments.push({ x: n(x), y: n(line * LINE_H), w: n(w), color: pick(CODE_COLORS) });
      x += w + 1.2 + rand() * 1.2;
    }
  }
  return segments;
}

const CODE_LEFT = codeBlock(15, 46, 7);
const CODE_RIGHT = codeBlock(134, 52, 11);

function CodeColumn({ segments, side }: { segments: CodeSegment[]; side: 'l' | 'r' }) {
  const block = segments.map((s, i) => (
    <rect key={i} x={s.x} y={s.y} width={s.w} height="1.3" rx="0.4" fill={s.color} />
  ));
  // two stacked copies scroll up by one block height, so the loop is seamless
  return (
    <g className={`rra-pt-scroll rra-pt-scroll-${side}`}>
      <g transform="translate(0 105)">{block}</g>
      <g transform={`translate(0 ${n(105 + BLOCK_H)})`}>{block}</g>
    </g>
  );
}

function Monitors({ maskId, poses }: { maskId: string; poses: boolean }) {
  return (
    <>
      <mask id={maskId} maskUnits="userSpaceOnUse" x="12" y="12" width="176" height="176">
        <image className="rra-pt-front-only" x="12" y="12" width="176" height="176" href={PORTRAIT_SCREENS_FRONT} />
        {poses && (
          <image className="rra-pt-back-only" x="12" y="12" width="176" height="176" href={PORTRAIT_SCREENS_BACK} />
        )}
      </mask>
      <g mask={`url(#${maskId})`}>
        <rect x="12" y="100" width="176" height="64" fill={SCREEN} />
        <CodeColumn segments={CODE_LEFT} side="l" />
        <CodeColumn segments={CODE_RIGHT} side="r" />
        <rect className="rra-pt-cursor" x="137" y="156" width="2.6" height="1.6" fill="#5fd38d" />
      </g>
    </>
  );
}

// ---------- eyes ----------

interface EyeProps {
  /** centre of the almond */
  cx: number;
  /** resting pupil position (the gaze anchor) */
  ix: number;
  iy: number;
  clipId: string;
  socketId: string;
  irisId: string;
}

/**
 * Vector eye drawn over the picture's own: almond white → pupil (clipped to the
 * almond, so a wide gaze never leaves the eye) → lash line → lids. The pupil sits in
 * a group scaled 0.5, which halves the runtime's gaze travel to suit these small
 * eyes. Both lids are clipped to the socket, so a closing lid's bottom edge (its
 * stroke) reads as the closed lash line.
 */
function Eye({ cx, ix, iy, clipId, socketId, irisId }: EyeProps) {
  const l = n(cx - 7.8);
  const r = n(cx + 7.8);
  const almond = `M${l},80.4 Q${cx},74.8 ${r},80.2 Q${cx},84.6 ${l},80.4 Z`;
  const socket = `M${n(l - 1.2)},80.4 Q${cx},72.3 ${n(r + 1.2)},80.2 Q${cx},85.6 ${n(l - 1.2)},80.4 Z`;
  return (
    <>
      <clipPath id={clipId}><path d={almond} /></clipPath>
      <clipPath id={socketId}><path d={socket} /></clipPath>
      <path d={almond} fill={EYE_WHITE} />
      <g clipPath={`url(#${clipId})`}>
        {/* shifted toward the thought bubble while thinking (the runtime looks up-left) */}
        <g className="rra-pt-gaze">
          <g transform={`translate(${ix} ${iy}) scale(0.5)`}>
            <circle className="rra-pupil" data-base-x={0} data-base-y={0} cx="0" cy="0" r="6.8" fill={`url(#${irisId})`} />
          </g>
        </g>
      </g>
      <path d={`M${l},80.4 Q${cx},74.6 ${r},80.2`} fill="none" stroke={LASH} strokeWidth="1.2" strokeLinecap="round" />
      <g clipPath={`url(#${socketId})`}>
        {/* a half-lowered lid for the thinking / savouring look (CSS-driven) */}
        <rect className="rra-pt-squint" x={n(l - 1.2)} y="74.4" width="18" height="4.6" rx="8" ry="2.2" fill={SKIN} stroke={LASH} strokeWidth="1.2" />
        <rect className="rra-lid" data-max-height="7.9" x={n(l - 1.2)} y="74.4" width="18" height="0" rx="8" ry="3.2" fill={SKIN} stroke={LASH} strokeWidth="1.2" />
      </g>
    </>
  );
}

// ---------- mouth ----------

interface MouthProps {
  jawId: string;
  cavityId: string;
  mouthRef: React.Ref<SVGEllipseElement>;
  cavityRef: React.Ref<SVGEllipseElement>;
}

/**
 * The picture's grin stays as the idle signature; whenever this layer is shown a
 * skin patch hides it and a vector mouth takes over. `#rra-mouth` lives in a group
 * scaled 0.32 (the runtime's opening is sized for bigger faces) and clipped to the
 * lower half, so it opens downward like a dropping jaw. Teeth and tongue are clipped
 * to a per-instance copy of that ellipse (kept in sync by the component), so they
 * only appear as the mouth opens.
 */
function Mouth({ jawId, cavityId, mouthRef, cavityRef }: MouthProps) {
  return (
    <g className="rra-pt-mouth">
      <path d="M84.5,107 C88,105.4 111,105.4 114.8,107 C113.5,112.8 106,115.2 99.5,115.2 C93,115.2 86,113 84.5,107 Z" fill={FACE} />
      <ellipse cx="99.5" cy="112.6" rx="6.5" ry="2" fill="#ee9677" opacity="0.55" />
      <g className="rra-pt-talk">
        <path d="M89,106.9 Q99.5,108.7 110,106.8" fill="none" stroke={LIP_LINE} strokeWidth="0.9" strokeLinecap="round" />
        <path d="M93.5,109.9 Q99.5,111.3 105.5,109.9" fill="none" stroke={SKIN_SHADOW} strokeWidth="1.1" strokeLinecap="round" opacity="0.6" />
        <g transform="translate(99.5 107.4) scale(0.32)">
          <clipPath id={jawId}><rect x="-60" y="0" width="120" height="60" /></clipPath>
          <clipPath id={cavityId}><ellipse ref={cavityRef} cx="0" cy="0" rx="26" ry="1" /></clipPath>
          <g clipPath={`url(#${jawId})`}>
            <ellipse ref={mouthRef} id="rra-mouth" cx="0" cy="0" rx="26" ry="1" fill="#3b1a1e" stroke={LIP} strokeWidth="3.6" />
            <g clipPath={`url(#${cavityId})`}>
              <rect x="-22" y="-2" width="44" height="6.5" rx="2" fill="#fbf6ee" />
              <ellipse cx="0" cy="24" rx="15" ry="9" fill="#d9636a" />
            </g>
          </g>
        </g>
      </g>
      <g className="rra-pt-hmm" fill="none" strokeLinecap="round">
        <path d="M97.5,107.6 Q103.5,107.6 109.6,105.9" stroke={LIP_LINE} strokeWidth="1" />
        <path d="M109.3,105.4 Q110.6,106.2 110.2,107.6" stroke={SKIN_SHADOW} strokeWidth="0.8" opacity="0.7" />
        <path d="M100,110 Q104,110.6 107.5,109.2" stroke={SKIN_SHADOW} strokeWidth="1" opacity="0.55" />
      </g>
    </g>
  );
}

// ---------- coffee break (idle pose) ----------

/** Mug centre in the "beside the grin" pose; the keyframes move it from here. */
const MUG_AT = { x: 113, y: 123.5 };

/**
 * A black "CODE" mug held by its handle. The hand is ONE fist silhouette with no
 * outline — fingers are only suggested by soft creases, knuckle folds and the wavy
 * fingertip edge against the handle (separate outlined fingers read as sausages).
 */
function CoffeeBreak() {
  return (
    <g className="rra-pt-mug">
      <g transform={`translate(${MUG_AT.x} ${MUG_AT.y})`}>
        {/* forearm rising from the bottom-right */}
        <path d="M36 27 L57 19 L77 90 L41 92 Z" fill={HOODIE} />
        <path d="M57 19 L77 90 L69 91 L52 22 Z" fill={HOODIE_EDGE} opacity="0.5" />
        {/* mug: handle, body, shading, rim and base seen slightly from below */}
        <path d="M14 -12.5 C22 -14.6 26 -12 26 -6 L26 6 C26 12 21 14 14 13.2" fill="none" stroke={MUG} strokeWidth="4.2" />
        <path d="M-14.5 -17.5 L14.5 -17.5 L13.6 14.5 C13.5 17 12 18.8 9.5 18.8 L-9.5 18.8 C-12 18.8 -13.5 17 -13.6 14.5 Z" fill={MUG} />
        <path d="M7.5 -17.5 L14.5 -17.5 L13.6 14.5 C13.5 17 12 18.8 9.5 18.8 L6.5 18.8 Z" fill="#000" opacity="0.18" />
        <rect x="-12" y="-14" width="3" height="28" rx="1.5" fill="#fff" opacity="0.08" />
        <ellipse cx="0" cy="16.4" rx="13.2" ry="2.8" fill="#1f1f23" stroke={MUG_EDGE} strokeWidth="0.8" />
        <ellipse cx="0" cy="-17.5" rx="14.5" ry="3.2" fill="#1f1f23" stroke={MUG_EDGE} strokeWidth="1" />
        <text
          x="0"
          y="3.8"
          textAnchor="middle"
          fontFamily="'Arial Narrow','Roboto Condensed',Arial,sans-serif"
          fontSize="10"
          textLength={19}
          lengthAdjust="spacingAndGlyphs"
          fill="#b4b8bf"
        >
          CODE
        </text>
        {/* the fist */}
        <path
          d="M17.6 -10.8 C19.4 -12.8 22 -13.2 24.6 -12.8 C29 -12.2 33.6 -11.4 37.4 -8.9 C40.8 -6.6 43.2 0 44 6.3 C45 11 47.4 16.6 52.4 21 L56 25 L38 31.4 C36.2 26.8 33 22.4 28.8 20.6 C25.2 19.2 21.8 18.4 20.8 16.6 Q18.4 13.4 19.6 9.6 Q17.2 6.4 18.4 2.8 Q16.4 -0.6 17.6 -4 Q15.4 -7.6 17.6 -10.8 Z"
          fill={FACE}
        />
        <path
          d="M20.8 16.6 C21.8 18.4 25.2 19.2 28.8 20.6 C33 22.4 37 26.4 39.4 30.6 L46 28.2 C41 24.6 36 19.8 31 17.4 C27 15.6 23 15.4 20.6 13.6 Z"
          fill={SKIN_SHADOW}
          opacity="0.35"
        />
        <path d="M22 -11.6 C27 -11.8 32.6 -10.6 36 -8" fill="none" stroke="#ffd2bb" strokeWidth="1.1" strokeLinecap="round" opacity="0.6" />
        <g fill="none" stroke="#cf7a5b" strokeWidth="0.75" strokeLinecap="round">
          <path d="M17.8 -4 Q25 -3.4 31.6 -3.8" />
          <path d="M18.6 2.8 Q24.6 3.4 30.4 3.4" />
          <path d="M19.8 9.6 Q24.4 10.4 28.6 10.8" />
          <path d="M37.4 -5.6 Q40 -3.4 38.8 -0.6" opacity="0.8" />
          <path d="M37 1.4 Q39.6 3.8 38.4 6.6" opacity="0.8" />
        </g>
        {/* hoodie cuff at the wrist */}
        <path d="M35.4 26.4 L56.4 18.2 L58.8 25.2 L37.6 33.4 Z" fill="#4a4950" />
        <g className="rra-pt-steam" fill="none" stroke="#ffffff" strokeWidth="1.4" strokeLinecap="round" opacity="0">
          <path d="M-4,-23 C-8,-27 0,-30 -4,-36" />
          <path d="M4.2,-24 C0.6,-28 8,-31 4.2,-37" />
        </g>
      </g>
    </g>
  );
}

// ---------- thought bubble ----------

/** The runtime fades `#rra-think` in and pulses its circles/rects out of phase:
 *  the two trail puffs, then the three dots inside the (path) cloud. */
function ThoughtBubble() {
  return (
    <g id="rra-think" opacity="0">
      <circle cx="146" cy="58" r="2.6" fill="#fff" stroke={THINK} strokeWidth="1.5" />
      <circle cx="155" cy="48" r="3.8" fill="#fff" stroke={THINK} strokeWidth="1.8" />
      <path
        d="M160 34 C157 26 165 19 172 23 C175 15 188 16 189 25 C196 26 197 37 190 40 C190 47 179 49 175 44 C170 48 160 46 161 40 C155 40 155 34 160 34 Z"
        fill="#fff"
        stroke={THINK}
        strokeWidth="2"
      />
      <rect x="166" y="31" width="3.4" height="3.4" rx="1.7" fill={THINK} />
      <rect x="173" y="31" width="3.4" height="3.4" rx="1.7" fill={THINK} />
      <rect x="180" y="31" width="3.4" height="3.4" rx="1.7" fill={THINK} />
    </g>
  );
}

// ---------- state styles ----------

/**
 * Per-state behaviour, scoped to this instance's root id. Static CSS generated
 * from constants (no user input), so it is injected as-is.
 */
function portraitCss(root: string): string {
  const s = `#${root}`;
  const idle = `${s}[data-state="idle"]`;
  const posedIdle = `${s}[data-poses][data-state="idle"]`;
  const thinking = `${s}[data-state="thinking"]`;
  const working = `${s}[data-state="working"]`;
  const posedWorking = `${s}[data-poses][data-state="working"]`;
  return `
${s} .rra-pt-gaze, ${s} .rra-pt-squint, ${s} .rra-pt-mouth, ${s} .rra-pt-talk, ${s} .rra-pt-hmm {
  transition: transform .45s cubic-bezier(.2,.8,.2,1), opacity .25s ease;
}
${s} .rra-pt-squint { transform-box: fill-box; transform-origin: top; transform: scaleY(0); }
${s} .rra-pt-hmm { opacity: 0; }
${idle} .rra-pt-mouth { opacity: 0; animation: rra-pt-grin 20s infinite; }
@keyframes rra-pt-grin { 0%,30% { opacity: 0 } 32%,45% { opacity: 1 } 47%,70% { opacity: 0 } 71.5%,86% { opacity: 1 } 88%,100% { opacity: 0 } }
${s} .rra-pt-mug { transform-origin: ${MUG_AT.x}px ${MUG_AT.y}px; transform: translate(8px, 95px); }
${posedIdle} .rra-pt-mug { animation: rra-pt-sip 20s infinite; }
@keyframes rra-pt-sip {
  0%,58% { transform: translate(8px, 95px); animation-timing-function: cubic-bezier(.2,.7,.3,1); }
  62%,66% { transform: translate(0, 34px) rotate(0deg); animation-timing-function: ease-in-out; }
  69%,70% { transform: translate(0, 0) rotate(0deg); animation-timing-function: ease-in-out; }
  73% { transform: translate(-9px, -1px) rotate(-10deg); animation-timing-function: ease-in-out; }
  77% { transform: translate(-9px, -2px) rotate(-15deg); animation-timing-function: ease-in-out; }
  80% { transform: translate(-9px, -1px) rotate(-10deg); animation-timing-function: cubic-bezier(.5,0,.8,.5); }
  86%,100% { transform: translate(8px, 95px) rotate(0deg); }
}
${posedIdle} .rra-pt-steam { animation: rra-pt-steam 20s infinite; }
@keyframes rra-pt-steam { 0%,61% { opacity: 0 } 63%,66% { opacity: .75 } 68%,100% { opacity: 0 } }
${posedIdle} .rra-pt-squint { animation: rra-pt-savor 20s infinite; }
@keyframes rra-pt-savor { 0%,72% { transform: scaleY(0) } 74%,79% { transform: scaleY(1) } 82%,100% { transform: scaleY(0) } }
${thinking} .rra-pt-gaze { transform: translate(2.6px, 1.1px); }
${thinking} .rra-pt-squint { transform: scaleY(.55); }
${thinking} .rra-pt-talk { opacity: 0; }
${thinking} .rra-pt-hmm { opacity: 1; }
${working} .rra-pt-squint { transform: scaleY(.4); }
${s} .rra-pt-back, ${s} .rra-pt-back-only { opacity: 0; }
${s} .rra-pt-back, ${s} .rra-pt-back-only, ${s} .rra-pt-front-only, ${s} .rra-pt-face { transition: opacity .5s ease; }
${posedWorking} .rra-pt-back, ${posedWorking} .rra-pt-back-only { opacity: 1; }
${posedWorking} .rra-pt-front-only, ${posedWorking} .rra-pt-face { opacity: 0; }
${s} .rra-pt-scroll { animation: rra-pt-scroll var(--rra-pt-speed, 9s) steps(${LINES}) infinite; }
${s} .rra-pt-scroll-r { animation-delay: -3.7s; }
@keyframes rra-pt-scroll { to { transform: translateY(-${BLOCK_H}px); } }
${idle} { --rra-pt-speed: 16s; }
${thinking} { --rra-pt-speed: 3.2s; }
${working} { --rra-pt-speed: 2.4s; }
${s} .rra-pt-cursor { animation: rra-pt-blink 1s steps(1) infinite; }
@keyframes rra-pt-blink { 50% { opacity: 0; } }
@media (prefers-reduced-motion: reduce) {
  ${s} .rra-pt-scroll, ${s} .rra-pt-cursor, ${s} .rra-pt-mouth, ${s} .rra-pt-mug, ${s} .rra-pt-steam, ${s} .rra-pt-squint { animation: none; }
  ${s} * { transition: none !important; }
}`;
}

// ---------- the avatar ----------

export function PortraitAvatar({ size = '100%', state = 'idle', poses = false, className, style }: PortraitAvatarProps) {
  // useId is stable across SSR/hydration; strip the characters CSS ids can't take.
  const root = `rra-pt-${React.useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const id = (name: string) => `${root}-${name}`;
  const css = React.useMemo(() => portraitCss(root), [root]);

  // Teeth/tongue are clipped to a copy of #rra-mouth with this instance's own id —
  // `<use href="#rra-mouth">` would resolve to the FIRST avatar on the page. Mirror
  // the runtime's per-frame rx/ry writes onto the copy.
  const mouthRef = React.useRef<SVGEllipseElement>(null);
  const cavityRef = React.useRef<SVGEllipseElement>(null);
  React.useEffect(() => {
    const mouth = mouthRef.current;
    const cavity = cavityRef.current;
    if (!mouth || !cavity || typeof MutationObserver === 'undefined') return;
    const sync = () => {
      for (const attr of ['rx', 'ry']) {
        const value = mouth.getAttribute(attr);
        if (value !== null) cavity.setAttribute(attr, value);
      }
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(mouth, { attributes: true, attributeFilter: ['rx', 'ry'] });
    return () => observer.disconnect();
  }, []);

  return (
    <svg
      id={root}
      data-state={state}
      data-poses={poses ? '' : undefined}
      viewBox="0 0 200 200"
      width={size}
      height={size}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Avatar"
      className={className}
      style={style}
    >
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <defs>
        <clipPath id={id('disc')}><circle cx="100" cy="100" r="88" /></clipPath>
        {/* hard-stop gradient: a catch-light that travels with the pupil */}
        <radialGradient id={id('iris')} cx="0.36" cy="0.3" fx="0.36" fy="0.3" r="0.75">
          <stop offset="0.17" stopColor="#e9e6e4" />
          <stop offset="0.19" stopColor={IRIS} />
        </radialGradient>
      </defs>
      <g transform={`translate(100 100) scale(${DISC_SCALE}) translate(-100 -100)`}>
        <g clipPath={`url(#${id('disc')})`}>
          <image x="12" y="12" width="176" height="176" href={PORTRAIT_FRONT} />
          {poses && <image className="rra-pt-back" x="12" y="12" width="176" height="176" href={PORTRAIT_BACK} />}
          <Monitors maskId={id('screens')} poses={poses} />
          <g className="rra-pt-face">
            <Eye cx={84.1} ix={84.1} iy={80} clipId={id('eye-l')} socketId={id('socket-l')} irisId={id('iris')} />
            <Eye cx={114.7} ix={113.1} iy={79.9} clipId={id('eye-r')} socketId={id('socket-r')} irisId={id('iris')} />
            <Mouth jawId={id('jaw')} cavityId={id('cavity')} mouthRef={mouthRef} cavityRef={cavityRef} />
            {poses && <CoffeeBreak />}
          </g>
        </g>
        <ThoughtBubble />
      </g>
    </svg>
  );
}
