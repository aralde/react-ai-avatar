# Changelog

All notable changes to **react-ai-avatar** are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.7.0] — 2026-10-20

Hardening release: the type checker catches props that do nothing, the stylesheet can't clash with yours, and a rounded `VideoAvatar` is round again. See "Migrating from 0.6" in the README.

### Breaking
- **`RealtimeAvatarProps` is one shape per `variant`.** A prop that doesn't apply is now a type error instead of being ignored: `vrmUrl` on the orb, `children` on a preset, `maxMouthOpening` on the orb, `customization` outside the flat presets, `dicebearSeed` outside `dicebear`. `variant="vrm"` and `"glb"` require `vrmUrl` / `glbUrl`. A variant chosen at runtime still type-checks when the props you pass fit every variant it can be. Runtime behavior is unchanged.
- **The stylesheet is prefixed.** Every utility the library ships is `rra:`-prefixed and its theme variables are `--rra-*`, so it can't override or reorder an app's own Tailwind classes (`.flex`, `.absolute`, …) or `--color-*` variables. The `rra-*` hook classes (`rra-avatar`, `rra-state-pill`, `rra-glow`, …) keep their names; only CSS that targeted the library's internal utility classes needs updating.

### Added
- **Themable overlays.** The state pill, thought and emoji bubbles and subtitles read CSS variables (`--rra-bubble-bg`, `--rra-bubble-fg`, `--rra-bubble-border`, `--rra-bubble-accent`, `--rra-caption-bg`, `--rra-caption-fg`, `--rra-caption-border`, `--rra-caption-shadow`, `--rra-pill-fg`) set on any ancestor. The defaults are the previous colors, so nothing changes unless you set one. New hook classes `rra-bubble` and `rra-caption-box`. See "Theming" in the README.
- README: a "Pick a face" overview of every kind of face up front, a "Theming" section, and a "Responsible use" section (labeling AI, likeness rights).
- Per-variant prop types: `PresetAvatarProps`, `ByosAvatarProps`, `OrbVariantProps`, `DiceBearVariantProps`, `VrmVariantProps`, `GlbVariantProps` and `FaceTuningProps`.
- Type tests (`src/lib/variantProps.test.tsx`): `npm run lint` fails if a prop that doesn't apply stops being rejected.

### Changed
- `RealtimeAvatar`'s `customization` takes a partial object (only the keys you change), like the presets themselves.
- The library build type-checks with `strict`, `noUnusedLocals` and `noUnusedParameters`.

### Fixed
- One thought bubble at a time: while the emoji reel or the text thought bubble shows, the face's own `#rra-think` bubble steps aside instead of stacking under it.
- `VideoAvatar` clips the footage to the frame's `border-radius` again: `style={{ borderRadius: '50%' }}` rounds the video, as in 0.5. (0.6 let the overlays overflow the frame and stopped clipping the clips.)
- An unused `React` import in `VideoAvatar` broke consumers that type-check the source with `noUnusedLocals`.

## [0.6.0] — 2026-10-20

Focus release: a smaller core, one API for both avatar components, and the runtime tested in a real browser. See "Migrating from 0.5" in the README.

### Breaking
- **`motion` is no longer a dependency.** The overlays (pill, glow, captions, thought and emoji bubbles) animate with CSS and `requestAnimationFrame`; `prefers-reduced-motion` turns the CSS animations off in one place. `react` and `react-dom` are the only required peers.
- **Characters moved to `react-ai-avatar/characters`** (`SquirrelAvatar`, `CoderAvatar`, `PortraitAvatar`) and **DiceBear to `react-ai-avatar/dicebear`** (`DiceBearAvatar`, `DiceBearThumb`, `DICEBEAR_*`, `loadDiceBear`, `renderDiceBearSvg`, …). `variant="dicebear"` keeps working and now lazy-loads its renderer.
- **`VideoAvatar` renders the same overlays as `RealtimeAvatar`** (pill, glow, bubbles, subtitles), on by default. Pass `showStatePill={false} showGlow={false}` for the 0.5 look.
- The accessible name reads `"{label} ({state label})"`, so `stateLabels` localizes it (was the raw state id).

### Added
- **`variant="orb"` and `OrbAvatar`** — the voice-assistant sphere: breathes while idle, swirls while thinking, spins a ring while working, swells with the voice while speaking; tinted by `stateColors`, still under reduced motion.
- **`react-ai-avatar/3d`** — `VrmAvatar` and `GlbArkitAvatar` (`react-ai-avatar/vrm` stays as an alias; it now also exports `GlbArkitAvatar`).
- **`state` is passed once.** Faces rendered as children inherit it through `AvatarStateContext`; the characters read it with the new `useAvatarState()` hook, and your own faces can too. Passing children now implies `variant="byos"`.
- Shared props for both components: `AvatarChromeProps` (overlays) and `MouthDriverProps` (`analyser` / `speechActivity` / `streamingText`). `VideoAvatar` gains `streamingText`, `tool`, `subtitle`, `thought`, `thinkingEmojis`, `stateColors`, `stateLabels` and the `show*` toggles; `RealtimeAvatar` gains `label`.
- `size` takes a number or any CSS length on every component (the box stays square). `RealtimeAvatar`'s `state` defaults to `'idle'`.
- `DEFAULT_STATE_COLORS`, `DEFAULT_STATE_LABELS` and the `RealtimeAvatarVariant` type are exported.
- `scripts/size.mjs` (`npm run size`) — what each import costs a consumer, tree-shaken and gzipped; `--check` enforces per-entry budgets in CI and `--readme` updates the table in the README.
- Browser tests with Playwright (`npm run test:e2e`, new CI job): blink, mouth opening and closing, gaze tracking, thought bubble, ring color, reduced motion, the pill, emoji reel, `byos` state inheritance, the orb and `VideoAvatar` crossfades.

### Changed
- The build keeps one file per module (`preserveModules`), so bundlers tree-shake the package properly. What a consumer ships for `RealtimeAvatar` dropped from ~59 kB to ~17 kB gzip (motion included in the before), and `createSpeechActivity` alone from ~7 kB to 0.4 kB.
- `package-lock.json` resynced with `package.json` (it still listed packages from the old demo app).

### Removed
- The unused internal `DefaultAvatar` component. `AvatarCustomization` and `AvatarProps` are still exported, now from `types`.

## [0.5.0] — 2026-10-20

### Added
- **`VideoAvatar`** — the "clip" technique: a photoreal avatar from your own footage. One short looping video per state, crossfaded on state changes; every clip starts and ends on a shared "hub" frame so loops and cuts don't jump. Missing states fall back (`working` → `thinking` → `idle`). With `speechActivity` or `analyser`, the speaking clip is gated on speech energy and yields to idle in real pauses. `idleVariations` interleave one-shot clips while idle, each with `afterIdleMs` / `cooldownMs` (e.g. a coffee only after a long wait). `minHoldMs` / `busySettleMs` keep an agent's `thinking ↔ working` tool-call bursts from flickering the face. Honors `prefers-reduced-motion`. The package ships no footage. New types: `VideoClips`, `VideoClipSource`, `IdleVariation`. New example: `examples/12-video-avatar.tsx`.
- `scripts/prepare-video-clips.ts` (repo only, not published) — turns a raw video into a clip with ffmpeg: square crop, scale, no audio, WebM + MP4, boomerang loop or one-shot, optional poster.
- README: "Video avatars" section, with a step-by-step Google Flow (Veo) guide: hub frame as first and last frame, five copy-paste prompts (one per state), and why they avoid making the character talk.

## [0.4.0] — 2026-10-02

### Added
- **`PortraitAvatar`** — a third character, built with the "puppet" technique: a fixed illustration (the author's portrait) embedded untouched, with only the moving parts drawn on top as colour-matched vector layers on the `#rra-*` contract. The talking mouth patches over the picture's grin, closes in pauses and shows teeth/tongue as it opens (a/e/o shapes); thinking narrows the eyes toward the bubble with a sideways "hmm"; the monitors behind always run scrolling terminal output, masked so it passes behind the head. Opt-in `poses`: a coffee break every 20 s while idle, and a back view facing the monitors while working. Honors `prefers-reduced-motion`. Internal ids are scoped per instance, so several can share a page. New example: `examples/11-portrait-avatar.tsx`.

### Changed
- Layer-contract tests: the resting-mouth check now accepts any thin closed mouth (`ry` ≤ 3) instead of exactly `2.3`, and cover `PortraitAvatar`'s per-instance ids and `poses` gating.

## [0.3.0] — 2026-08-06

### Added
- **`CoderAvatar`** — a second branded character on the `#rra-*` contract: a young developer (slouchy knit beanie, over-ear headphones, round glasses, hoodie + circuit tee). Same API as `SquirrelAvatar`, including the opt-in `poses` prop (hand-on-chin while thinking; a typing-on-a-laptop / reading-a-book scene while working). New worked example: `examples/10-character-avatar-developer.tsx`.
- Layer-contract tests now cover the branded characters (`SquirrelAvatar`, `CoderAvatar`), asserting the hooks the runtime queries plus a closed resting mouth and open resting lids.

## [0.2.0] — 2026-07-01

### Added
- **Emulated thinking emoji reel** — `thinkingEmojis` prop: while `state="thinking"`, a bubble cross-fades through a set of emojis instead of showing raw reasoning. Pass `true` for the default set or your own array; tune with `thinkingEmojiInterval` / `thinkingEmojiSize`. Honors `prefers-reduced-motion`.
- `ThoughtEmojiBubble` exported as a standalone building block, plus `DEFAULT_THINKING_EMOJIS`.
- `SquirrelAvatar`: per-state poses (hand-on-chin while thinking, reading/soldering while working) gated behind an opt-in `poses` prop — off by default.

### Fixed
- Thinking emoji bubble is anchored inside the avatar's own `size × size` box and scales with `size` — it no longer grows the component's footprint.
- Thinking emoji reel no longer leaks stacked spans on rapid state changes.

## [0.1.3] — 2026-06-25

### Fixed
- `useChat` example reads assistant text from message **parts** (Vercel AI SDK v5).

### Changed
- README restructured; SVG logo added.

## [0.1.2] — 2026-06-25

### Changed
- Documented the `working` state and the `tool` prop for agentic UIs; added the hero banner.

## [0.1.1] — 2026-06-24

### Fixed
- The same VRM/GLB avatar can now render in multiple places at once.

### Changed
- Converted the demo app into the publishable library package.

## [0.1.0] — 2026-06-21

Initial public release.

- **Five conversation states** — `idle`, `listening`, `thinking`, `speaking`, and `working` (tool use, with the `tool` prop).
- **Audio-reactive mouth** from a WebAudio `AnalyserNode`, with a synthetic speech-like fallback when no analyser is provided.
- **Text-streaming drivers** — declarative `streamingText` prop (for chat hooks like `useChat`) and imperative `createSpeechActivity()` for hand-rolled reader loops.
- **Own-design avatar catalog** — `geometric`, `memoji`, `pixelart`, `doodle` presets, all MIT.
- **DiceBear variant** — curated CC0-only style set, generated client-side, animated via the option API.
- **Optional 3D** — `vrm` (VRoid/VRM) and `glb` (ARKit blendshapes) variants; three.js stack is an optional, lazy-loaded peer dependency.
- **Bring your own SVG (`byos`)** — the `#rra-*` layer contract animates any compliant SVG; `SquirrelAvatar` ships as the worked example.
- **Production quality** — SSR-safe, honors `prefers-reduced-motion`, announces state changes via `aria-live`.
- Copy-pasteable examples for every integration pattern, including a reference relay server.

[0.7.0]: https://github.com/aralde/react-ai-avatar/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/aralde/react-ai-avatar/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/aralde/react-ai-avatar/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/aralde/react-ai-avatar/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/aralde/react-ai-avatar/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/aralde/react-ai-avatar/compare/v0.1.3...v0.2.0
[0.1.3]: https://github.com/aralde/react-ai-avatar/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/aralde/react-ai-avatar/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/aralde/react-ai-avatar/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/aralde/react-ai-avatar/releases/tag/v0.1.0
