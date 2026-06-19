import { RefObject, useEffect, useRef } from 'react';
import { AvatarState, StateColors } from './types';
import { createMouthEngine, MouthEngine, MouthSource } from './mouthEngine';
import { useReducedMotion } from './useReducedMotion';

/**
 * The layer contract: any SVG that exposes these stable hooks can be
 * animated by this runtime — both the built-in presets and byos
 * (bring-your-own-SVG) avatars.
 *
 * | hook              | part            | the runtime drives                       |
 * |-------------------|-----------------|------------------------------------------|
 * | `#rra-ring`       | state ring      | `stroke` = stateColors[state]            |
 * | `#rra-mouth`      | mouth           | ellipse: `ry`/`rx`; rect: `height`       |
 * | `.rra-pupil` (x2) | pupils          | circle: `cx`/`cy`; rect: `x`/`y`         |
 * | `.rra-lid` (x2)   | eyelids         | `height` = blink (0 = open)              |
 * | `#rra-think`      | thought bubble  | `opacity` + pulsing dots (thinking)      |
 *
 * Optional data attributes on the SVG refine behavior:
 * - `data-base-x` / `data-base-y` on `.rra-pupil`: rest position.
 * - `data-max-height` on `.rra-lid`: fully-closed lid height (default 16).
 * - `data-quantize` on `#rra-mouth` / `.rra-pupil`: snap movement to a grid
 *   (e.g. `1` for pixel-art presets so motion happens in whole pixels).
 *
 * Honors `prefers-reduced-motion`: blink, gaze tracking and bubble pulsing
 * are disabled; the informative audio-reactive mouth stays on.
 */

export interface AvatarRuntimeOptions {
  state: AvatarState;
  /** Mouth source: AnalyserNode (audio), SpeechActivitySource (text), or null. */
  analyser: MouthSource;
  stateColors?: StateColors;
  /** Scales mouth opening; ~30 ≈ ellipse ry growing ~12 viewBox units. */
  maxMouthOpening?: number;
  /** 0 disables gaze tracking, 1 is default, up to 2. */
  mouseTrackingIntensity?: number;
  blinkIntervalMin?: number;
  blinkIntervalMax?: number;
  blinkDuration?: number;
}

const DEFAULT_COLORS: Required<StateColors> = {
  idle: '#4b5563',
  listening: '#3b82f6',
  thinking: '#8b5cf6',
  speaking: '#10b981',
};

export function useAvatarRuntime(
  containerRef: RefObject<HTMLElement | null>,
  options: AvatarRuntimeOptions
) {
  const reducedMotion = useReducedMotion();

  // Latest options readable from the loop without re-running the effect.
  const optsRef = useRef(options);
  optsRef.current = options;

  // Normalized pointer position relative to the viewport center, [-1, 1].
  const pointerRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (reducedMotion) return;
    const onMove = (e: MouseEvent) => {
      pointerRef.current.x = Math.max(-1, Math.min(1, (e.clientX / window.innerWidth) * 2 - 1));
      pointerRef.current.y = Math.max(-1, Math.min(1, (e.clientY / window.innerHeight) * 2 - 1));
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [reducedMotion]);

  useEffect(() => {
    const el = containerRef.current;
    if (el === null || typeof window === 'undefined') return;

    const snap = (value: number, q: number) => (q > 0 ? Math.round(value / q) * q : value);

    // --- Contract elements and their rest values --------------------------
    // Collected lazily and re-collected whenever the SVG inside the
    // container is swapped (e.g. the host re-renders a different preset):
    // React replaces the nodes without remounting this component.
    let ring: Element | null = null;
    let mouth: SVGGraphicsElement | null = null;
    let think: SVGGElement | null = null;
    let thinkDots: SVGGraphicsElement[] = [];
    let pupils: SVGGraphicsElement[] = [];
    let lids: SVGRectElement[] = [];
    let mouthIsRect = false;
    let baseRy = 3;
    let baseRx = 9;
    let mouthQuantize = 0;
    // The motion constants below (mouth opening, gaze/thinking pupil offsets) are
    // expressed in the canonical 200-unit viewBox the built-in presets use. A
    // preset on a different grid — e.g. the 32x32 pixel-art face — would have
    // them applied ~6x too large (mouth swallowing the face, pupils flung clear
    // of the eye). Normalize by the SVG's own viewBox width so every preset moves
    // proportionally to its own coordinate system.
    let vbScale = 1;
    let pupilBases: { isRect: boolean; x: number; y: number; quantize: number }[] = [];
    let lidMaxes: number[] = [];
    let pupilCur: { x: number; y: number }[] = [];

    const collectElements = () => {
      ring = el.querySelector('#rra-ring');
      mouth = el.querySelector('#rra-mouth') as SVGGraphicsElement | null;
      think = el.querySelector('#rra-think') as SVGGElement | null;
      thinkDots = think ? (Array.from(think.querySelectorAll('circle, rect')) as SVGGraphicsElement[]) : [];
      pupils = Array.from(el.querySelectorAll('.rra-pupil')) as SVGGraphicsElement[];
      lids = Array.from(el.querySelectorAll('.rra-lid')) as SVGRectElement[];

      // Mouth: an ellipse opens via ry/rx; a rect (pixel-art) grows in height.
      mouthIsRect = mouth?.tagName.toLowerCase() === 'rect';
      baseRy = mouth ? parseFloat(mouth.getAttribute(mouthIsRect ? 'height' : 'ry') ?? '3') : 3;
      baseRx = mouth ? parseFloat(mouth.getAttribute(mouthIsRect ? 'width' : 'rx') ?? '9') : 9;
      mouthQuantize = mouth ? parseFloat(mouth.getAttribute('data-quantize') ?? '0') : 0;

      pupilBases = pupils.map((p) => {
        const isRect = p.tagName.toLowerCase() === 'rect';
        return {
          isRect,
          x: parseFloat(p.getAttribute('data-base-x') ?? p.getAttribute(isRect ? 'x' : 'cx') ?? '0'),
          y: parseFloat(p.getAttribute('data-base-y') ?? p.getAttribute(isRect ? 'y' : 'cy') ?? '0'),
          quantize: parseFloat(p.getAttribute('data-quantize') ?? '0'),
        };
      });
      lidMaxes = lids.map((l) => parseFloat(l.getAttribute('data-max-height') ?? '16'));
      pupilCur = pupils.map(() => ({ x: 0, y: 0 }));

      // viewBox width vs the canonical 200 → scale factor for the motion
      // constants. Falls back to 1 (no scaling) when no viewBox is present.
      const svg = el.querySelector('svg');
      const vbW = parseFloat(svg?.getAttribute('viewBox')?.split(/[\s,]+/)[2] ?? '200');
      vbScale = vbW > 0 ? vbW / 200 : 1;
    };

    const elementsStale = () =>
      (mouth ? !mouth.isConnected : el.querySelector('#rra-mouth') !== null) ||
      (ring ? !ring.isConnected : el.querySelector('#rra-ring') !== null);

    collectElements();

    // --- Loop state -------------------------------------------------------
    let engine: MouthEngine | null = null;
    let engineAnalyser: MouthSource = null;
    let engineActive = false;

    let mouthLevel = 0;
    let widthMult = 1;
    let heightMult = 1;

    let blinkTimer = 1500 + Math.random() * 2000; // ms until next blink
    let blinkProgress = 0; // 0 open .. 1 closed
    let blinking = false;

    let thinkOpacity = 0;
    let thinkPhase = 0;

    let raf = 0;
    let lastT = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(100, now - lastT); // ms, clamped vs tab suspends
      lastT = now;

      // The avatar SVG was replaced under us? Re-bind to the new nodes.
      if (elementsStale()) {
        collectElements();
      }

      const opts = optsRef.current;
      const { state } = opts;
      const colors = { ...DEFAULT_COLORS, ...opts.stateColors };
      const maxMouthOpening = (opts.maxMouthOpening ?? 30) * vbScale;
      const trackIntensity = reducedMotion ? 0 : (opts.mouseTrackingIntensity ?? 1);
      const blinkMin = opts.blinkIntervalMin ?? 2000;
      const blinkMax = opts.blinkIntervalMax ?? 6000;
      const blinkDuration = opts.blinkDuration ?? 100;

      // 1. State ring color
      ring?.setAttribute('stroke', colors[state]);

      // 2. Mouth (audio-reactive with procedural fallback)
      if (mouth) {
        const speaking = state === 'speaking';
        if (speaking && (!engineActive || engineAnalyser !== opts.analyser)) {
          engine = createMouthEngine(opts.analyser);
          engineAnalyser = opts.analyser;
          engineActive = true;
        }
        if (!speaking) engineActive = false;

        let targetLevel = 0;
        let targetW = 1;
        let targetH = 1;
        if (speaking && engine) {
          const frame = engine.read();
          targetLevel = frame.level;
          if (frame.shape === 'e') {
            targetW = 1.35;
            targetH = 0.55;
          } else if (frame.shape === 'o') {
            targetW = 0.65;
            targetH = 1.35;
          }
        }
        mouthLevel += (targetLevel - mouthLevel) * 0.3;
        widthMult += (targetW - widthMult) * 0.25;
        heightMult += (targetH - heightMult) * 0.25;

        if (mouthIsRect) {
          // Pixel-style mouth: top lip stays put, height grows downward,
          // snapped to the grid so motion happens in whole pixels.
          const h = snap(baseRy + mouthLevel * heightMult * maxMouthOpening * 0.4, mouthQuantize);
          mouth.setAttribute('height', String(Math.max(baseRy, h)));
        } else {
          mouth.setAttribute('ry', String(baseRy + mouthLevel * heightMult * maxMouthOpening * 0.4));
          mouth.setAttribute('rx', String(baseRx * (1 + (widthMult - 1) * Math.min(1, mouthLevel * 2))));
        }
      }

      // 3. Blink
      if (!reducedMotion && lids.length > 0) {
        if (!blinking) {
          blinkTimer -= dt;
          if (blinkTimer <= 0) {
            blinking = true;
            blinkProgress = 0;
          }
        } else {
          // 0 -> 1 -> 0 over two blinkDurations
          blinkProgress += dt / blinkDuration;
          if (blinkProgress >= 2) {
            blinking = false;
            blinkProgress = 0;
            blinkTimer = blinkMin + Math.random() * Math.max(0, blinkMax - blinkMin);
          }
        }
        const closed = blinking ? 1 - Math.abs(1 - Math.min(2, blinkProgress)) : 0;
        lids.forEach((lid, i) => lid.setAttribute('height', String(closed * lidMaxes[i])));
      }

      // 4. Pupils: gaze tracking, thinking looks up-left, listening micro-moves
      if (pupils.length > 0) {
        let targetX = pointerRef.current.x * 3 * trackIntensity;
        let targetY = pointerRef.current.y * 2.2 * trackIntensity;
        if (state === 'thinking') {
          targetX = -2.5;
          targetY = -3;
        } else if (state === 'listening' && !reducedMotion) {
          targetX += Math.sin(now * 0.0021) * 0.5;
          targetY += Math.cos(now * 0.0017) * 0.4;
        }
        // Keep gaze travel proportional to the preset's own grid (see vbScale).
        targetX *= vbScale;
        targetY *= vbScale;
        pupils.forEach((p, i) => {
          const base = pupilBases[i];
          pupilCur[i].x += (targetX - pupilCur[i].x) * 0.12;
          pupilCur[i].y += (targetY - pupilCur[i].y) * 0.12;
          const px = base.x + snap(pupilCur[i].x, base.quantize);
          const py = base.y + snap(pupilCur[i].y, base.quantize);
          if (base.isRect) {
            p.setAttribute('x', String(px));
            p.setAttribute('y', String(py));
          } else {
            p.setAttribute('cx', String(px));
            p.setAttribute('cy', String(py));
          }
        });
      }

      // 5. Thought bubble: fade in/out + dots pulsing out of phase
      if (think) {
        const targetOpacity = state === 'thinking' ? 1 : 0;
        thinkOpacity += (targetOpacity - thinkOpacity) * 0.12;
        think.setAttribute('opacity', String(thinkOpacity < 0.01 ? 0 : thinkOpacity));
        if (state === 'thinking' && !reducedMotion) {
          thinkPhase += dt * 0.004;
          thinkDots.forEach((dot, i) => {
            const pulse = 0.35 + 0.65 * Math.max(0, Math.sin(thinkPhase - i * 0.9));
            dot.setAttribute('opacity', String(pulse));
          });
        } else {
          thinkDots.forEach((dot) => dot.setAttribute('opacity', '1'));
        }
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [containerRef, reducedMotion]);
}
