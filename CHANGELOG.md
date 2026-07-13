# Changelog

All notable changes to **react-ai-avatar** are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[0.2.0]: https://github.com/aralde/react-ai-avatar/compare/v0.1.3...v0.2.0
[0.1.3]: https://github.com/aralde/react-ai-avatar/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/aralde/react-ai-avatar/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/aralde/react-ai-avatar/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/aralde/react-ai-avatar/releases/tag/v0.1.0
