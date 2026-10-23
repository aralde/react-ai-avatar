# `#rra-*` contract — exhaustive reference

This is the precise behavior of `useAvatarRuntime` (the library's per-frame loop).
Read it when drawing anything non-standard (pixel art, a rect mouth, custom rest
positions) or when debugging why a part won't move.

## Table of contents
- [How the runtime binds](#how-the-runtime-binds)
- [`#rra-ring` — state ring](#rra-ring--state-ring)
- [`#rra-mouth` — mouth](#rra-mouth--mouth)
- [`.rra-pupil` — pupils](#rra-pupil--pupils)
- [`.rra-lid` — eyelids](#rra-lid--eyelids)
- [`#rra-think` — thought bubble](#rra-think--thought-bubble)
- [Optional `data-*` attributes](#optional-data-attributes)
- [Pixel-art variant (rect + quantize)](#pixel-art-variant-rect--quantize)
- [prefers-reduced-motion](#prefers-reduced-motion)
- [Mouth driver (audio vs text vs procedural)](#mouth-driver)

## How the runtime binds

The avatar SVG is rendered as a child of a container `<div>`. The runtime queries
that container by selector — `el.querySelector('#rra-mouth')`,
`el.querySelectorAll('.rra-pupil')`, etc. — once, reads each element's *current*
attribute values as the **rest baseline**, then mutates attributes every frame
relative to that baseline. It re-collects the elements automatically if React swaps
the SVG underneath it (e.g. switching presets), so you don't remount.

Implication: **the resting attribute values in your SVG matter.** They are not just
the first frame; they define "closed mouth", "open eye", "pupil centered".

## `#rra-ring` — state ring

- One element with `id="rra-ring"`, typically `<circle ... fill="none" stroke="...">`.
- Each frame: `stroke` ← the current state's color.
- Defaults: idle `#4b5563`, listening `#3b82f6`, thinking `#8b5cf6`, speaking
  `#10b981`. Overridable via the `stateColors` prop.
- Your authored `stroke` is only the pre-mount value; the runtime overwrites it.

## `#rra-mouth` — mouth

- Detected as a `<rect>` if its tag is `rect`, otherwise treated as an `<ellipse>`.
- **Ellipse:** baseline `ry` (default 3 if absent) and `rx` (default 9). Each frame:
  - `ry` = `baseRy + level · heightMult · maxMouthOpening · 0.4`
  - `rx` = `baseRx · (1 + (widthMult − 1) · min(1, level·2))`
  - `level` is the smoothed mouth-openness 0..1. `widthMult`/`heightMult` shift with
    detected vowel shape: an "e" widens & flattens, an "o" narrows & rounds.
  - `maxMouthOpening` prop defaults to 30 (≈ ry growing ~12 viewBox units fully open).
- **Rect (pixel style):** baseline `height`/`width`. Top edge stays put; `height`
  grows downward: `height = max(baseHeight, snap(baseHeight + level·heightMult·
  maxMouthOpening·0.4, quantize))`.
- Draw the closed mouth as a thin ellipse (`ry≈2`–`3`). Never a `<path>`: the runtime
  only knows how to grow `ry`/`rx`/`height`.

## `.rra-pupil` — pupils

- Exactly two, each `class="rra-pupil"`. Circle (`cx`/`cy`) or rect (`x`/`y`).
- Rest position from `data-base-x`/`data-base-y` if present, else the element's
  `cx`/`cy` (circle) or `x`/`y` (rect).
- Each frame the runtime eases the pupil toward a target offset from base:
  - **gaze:** cursor position × `3` (x) and × `2.2` (y), scaled by
    `mouseTrackingIntensity` (0 disables, 1 default, up to 2).
  - **thinking:** locks to a fixed up-left look (≈ x −2.5, y −3).
  - **listening:** adds a small idle wander via sin/cos.
- Movement is eased (~12%/frame), so motion is smooth, not instant.

## `.rra-lid` — eyelids

- Exactly two, each `<rect class="rra-lid">`, positioned at the **top** of the eye.
- Author with `height="0"` (open). `data-max-height` (default 16) is the fully-closed
  height — set it to span from the lid's `y` down past the bottom of the eye.
- Blink: `height` goes `0 → max → 0` over two `blinkDuration`s (default 100ms each),
  with a random gap between `blinkIntervalMin` (2000ms) and `blinkIntervalMax`
  (6000ms).
- **Fill the lid in the skin/fur color of the surrounding face**, so closing reads as
  the face descending over the eye — not a gray bar.

## `#rra-think` — thought bubble

- A `<g id="rra-think" opacity="0">` containing small `<circle>`/`<rect>` dots.
- Each frame: the group's `opacity` eases toward 1 while `state === 'thinking'`,
  else toward 0. While thinking, each dot's own `opacity` pulses out of phase.
- Place it **outside** the body `<clipPath>` so it can float past the disc edge.

## Optional `data-*` attributes

- `data-base-x` / `data-base-y` on `.rra-pupil` — explicit gaze rest position.
- `data-max-height` on `.rra-lid` — fully-closed lid height (default 16).
- `data-quantize` on `#rra-mouth` and/or `.rra-pupil` — snap movement to a grid (e.g.
  `1` so a pixel-art face moves in whole pixels, never sub-pixel).

## Pixel-art variant (rect + quantize)

For a crisp pixel look: make `#rra-mouth` a `<rect>` and the pupils `<rect>`s, and add
`data-quantize="1"` (or your pixel size) to each. The runtime then snaps all motion to
that grid, so the mouth opens and pupils slide in discrete pixel steps. See the
built-in `PixelArtAvatar` for a reference implementation.

## prefers-reduced-motion

When the OS requests reduced motion, the runtime disables blink, gaze tracking and
the thinking-dot pulse. The audio/text-reactive mouth **stays on**, because it's
informative (it tells the user the assistant is talking). Don't fight this; just make
sure a motionless-but-mouthing avatar still looks fine.

## Mouth driver

The `level` that opens the mouth comes from a `MouthEngine` fed by one of:
- an `AnalyserNode` (WebAudio) → real amplitude/vowel from voice audio;
- a `SpeechActivitySource` → token cadence from a text-streaming LLM;
- `null` → a procedural speech-like pattern, so a face still "talks" with no input.

This is invisible to your SVG — you only ever expose `#rra-mouth` and the engine
decides how wide to open it. The standalone harness uses the procedural path.
