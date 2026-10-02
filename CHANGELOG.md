# Changelog

All notable changes to **react-ai-avatar** are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[0.4.0]: https://github.com/aralde/react-ai-avatar/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/aralde/react-ai-avatar/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/aralde/react-ai-avatar/compare/v0.1.3...v0.2.0
[0.1.3]: https://github.com/aralde/react-ai-avatar/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/aralde/react-ai-avatar/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/aralde/react-ai-avatar/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/aralde/react-ai-avatar/releases/tag/v0.1.0
