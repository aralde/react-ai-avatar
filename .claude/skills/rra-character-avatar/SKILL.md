---
name: rra-character-avatar
description: >-
  Build an animated character-face SVG avatar for the react-ai-avatar library by
  implementing its `#rra-*` layer contract — a hand-drawn flat-vector face (animal,
  human, mascot, robot) whose mouth, eyes, pupils, eyelids, state ring and thought
  bubble are driven live by the library's runtime (blink, gaze tracking, audio/text
  lip-sync, thinking). Use this whenever someone wants a custom or branded avatar,
  a "talking head", a mascot, a bring-your-own-SVG (`variant="byos"`) face, a new
  preset like the built-in geometric/doodle/memoji ones, or asks to turn a character
  / reference image into an animatable avatar for this library. Trigger even if they
  don't name the `#rra-*` contract explicitly — any "make me an avatar/face that
  talks and blinks for react-ai-avatar" request belongs here. Does NOT cover the 3D
  (VRM/GLB) or DiceBear-generator paths — only own-design SVG faces.
---

# Building a character avatar for react-ai-avatar

## The one idea you must internalize

**You draw the face *still*. The library's runtime gives it life.**

You never write animation code. You produce a static SVG whose moving parts carry
specific, stable hooks (`id`s, classes, `data-*` attributes). At runtime a
`requestAnimationFrame` loop (`useAvatarRuntime`) finds those hooks by selector and
mutates their attributes every frame — opening the mouth from audio/text, blinking
the eyelids, sliding the pupils toward the cursor, recoloring the state ring,
fading in a thought bubble. If your hooks are correct, your character talks. If a
hook is missing or malformed, that part simply sits motionless — no error.

So the whole job is: **draw a good character, and wire the contract precisely.**

## The layer contract (the hooks the runtime drives)

| hook | element | what the runtime does to it each frame |
|------|---------|----------------------------------------|
| `#rra-ring` | one shape (usually a `<circle>`) | sets `stroke` to the current state color |
| `#rra-mouth` | an `<ellipse>` (or `<rect>` for pixel styles) | grows it open: ellipse → `ry`/`rx`; rect → `height` |
| `.rra-pupil` ×2 | a `<circle>` (or `<rect>`) inside each eye | moves it: circle → `cx`/`cy`; rect → `x`/`y` |
| `.rra-lid` ×2 | a `<rect>` over each eye | sets `height` for blink — **0 = open**, grows down to cover the eye |
| `#rra-think` | a `<g>` of small dots | fades `opacity` in while "thinking" and pulses the dots |

Everything else in the SVG (head, hair, ears, nose, glasses, body, tail…) is
inert decoration you draw freely. Group it however you like; the runtime ignores it.

`#rra-ring` and `#rra-think` are optional but recommended — they give the avatar a
state color and a thinking tell. The mouth, pupils and lids are what make it feel
alive.

For the exact per-attribute math, rest-value detection, `data-*` refinements, the
pixel-art `rect`/`data-quantize` variant, and `prefers-reduced-motion` behavior,
read `references/contract-reference.md`. Read it before drawing if you're doing a
pixel-art style or anything non-obvious; for a standard smooth face the table above
plus the rules below are enough.

## The hard rules that make it actually animate

These are the mistakes that produce a frozen face. Internalize the *why*.

1. **The mouth is a real `<ellipse id="rra-mouth">` with its resting `ry`/`rx`
   baked into the attributes.** The runtime reads your starting `ry`/`rx` as the
   closed-mouth baseline and animates *outward* from there. A thin closed mouth is
   `ry="2.3"`. Don't draw the mouth as a `<path>` — the runtime can't open a path.

2. **Each pupil is its own node with `class="rra-pupil"` and a declared rest
   position via `data-base-x` / `data-base-y`.** The runtime offsets from that base
   toward the cursor. If you omit the data attributes it falls back to the element's
   `cx`/`cy`, which usually still works — but declaring the base is robust and lets
   the visible `cx`/`cy` differ from the gaze anchor. There must be exactly **two**.

3. **Each eyelid is a `<rect class="rra-lid">` sitting at the *top* of the eye with
   `height="0"` and a `data-max-height` equal to how far it must travel to fully
   cover the eye.** Fill it with the *skin/fur color* so a closing lid reads as the
   face coming down over the eye. `height="0"` means open; the runtime grows it to
   `data-max-height` on a blink and back.

4. **Put the lid *after* the eyeball + pupil in document order** so it paints on
   top. SVG has no z-index; paint order is document order. Same logic for glasses
   over eyes, hair over forehead, head over neck.

5. **Draw inside a circular frame and clip the body to it.** All built-in presets
   use `viewBox="0 0 200 200"`, an `#rra-ring` circle at `r≈92`, a background circle
   at `r≈79`, and a `<clipPath>` so shoulders/tail/ears that extend past the disc are
   cleanly cut. This keeps every avatar swappable at the same size.

## The recipe

1. **Identify the character's iconic, reducible features.** A raster reference image
   (a painted illustration) cannot be auto-traced into clean animatable layers — it
   becomes thousands of useless paths. Instead, *reinterpret*: pick the 4–6 shapes
   that say "this is the character" (e.g. for a squirrel: orange fur, tufted ears,
   bushy tail, round glasses, brown quiff) and redraw them as flat vector.

2. **Lay out the frame:** `#rra-ring` circle, background circle, `<clipPath>`.

3. **Draw back-to-front inside the clip:** tail/background props → body/shoulders →
   neck → ears → head → muzzle → hair → brows → glasses → **eyes (ball, pupil, lid)**
   → nose → **mouth** → whiskers/details.

4. **Wire the contract** on the mouth, the two eyes, optionally the ring and a
   `#rra-think` bubble (place the bubble *outside* the clip so it can float beyond
   the disc).

5. **Bridge head and body with a neck.** A head ellipse floating above shoulders
   reads as broken. Add a fur/skin neck shape from under the chin into the collar,
   with a subtle darker shadow under the chin for volume.

6. **Test it animating** before wrapping it in React — see below.

## Test the SVG in isolation first

Don't wire it into the whole library to find out the mouth doesn't open. Use the
standalone harness: `assets/preview-harness.html`. Paste your `<svg>` into the
marked slot and open the file in a browser. It runs a faithful re-implementation of
the real runtime (same selectors, same math) with buttons for idle/listening/
thinking/speaking and live gaze tracking. If it blinks, talks, looks around and the
ring changes color there, it will behave identically inside the library. Debug the
contract here where the loop is short.

## Wiring it into the library

Two supported ways. Both feed your SVG to `ContractAvatar`, which runs
`useAvatarRuntime` over whatever SVG it wraps.

**A. Bring-your-own-SVG (fastest):**

```tsx
<RealtimeAvatar state={state} analyser={analyser} variant="byos">
  <YourSquirrelSvg />   {/* a component returning the contract-compliant <svg> */}
</RealtimeAvatar>
```

**B. As a reusable preset component** (mirrors the built-in `DoodleAvatar`): a
component that takes `size` + `customization` and returns the `<svg>`, dropped into
`<ContractAvatar>`. This is the path to add it to the library's own catalog.

For a complete, copy-pasteable worked example — the full "deluxe squirrel" SVG, a
`SquirrelAvatar.tsx` preset scaffold, and both wiring snippets — read
`references/worked-example-squirrel.md`.

## Pre-flight checklist

Before declaring it done, verify:

- [ ] Exactly one `#rra-mouth`, and it's an `<ellipse>` (or `<rect>` for pixel) with
      a sensible resting `ry`/`rx` (or `height`/`width`).
- [ ] Exactly two `.rra-pupil`, each with `data-base-x` / `data-base-y`.
- [ ] Exactly two `.rra-lid` `<rect>`s, `height="0"`, with `data-max-height`, filled
      in the skin/fur color, painted *after* their eyeball.
- [ ] Lids/glasses/hair/head are in the right paint (document) order.
- [ ] Optional `#rra-ring` (gets state color) and `#rra-think` (outside the clip).
- [ ] A neck connects head to body; nothing floats.
- [ ] It animates correctly in `assets/preview-harness.html` across all four states.

## Style notes

- Flat vector, solid fills. Avoid gradients/filters: they hurt clarity at avatar
  size and flash during re-renders.
- Keep the silhouette readable at ~48px — these are often shown small.
- Color the lids to match the skin/fur *at the eye region*, not a global average, or
  blinks will look wrong.
- Whiskers, cheek tufts, ear tufts, a hoodie drawstring — small asymmetric details
  are what make a face feel hand-made rather than generated.
