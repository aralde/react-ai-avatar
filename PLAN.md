# react-realtime-avatar — Improvement Plan

> Goal: the **MIT-distributable library** is the product; the demo/builder is its showcase.
> Tagline: *A presentational React avatar for realtime LLM voice UIs — you bring the connection, it brings the face.*
> Reference philosophy: `mind-elixir-core` — one thing, done well, embeddable, MIT.

## Context / verified facts (2026-06-12)

- `models.readyplayer.me` no longer resolves (DNS NXDOMAIN). The remote RPM catalog avatars
  (Masculine `63e5...`, Feminine `6583...`) are unrecoverable → the RPM variant is removed.
- The Sketchfab caricature GLB is almost certainly CC-BY (attribution required) → incompatible
  with packaging inside an MIT library → removed, along with all its special-case code.
- `Developer 1` / `Developer 2` SVG avatars look bad → removed, replaced by the new catalog (Phase 4).
- Golden license rule: anything packaged INSIDE the MIT lib must be CC0 or own design.

## Decisions

| Topic | Decision |
|---|---|
| VRM variant | **Stays**, as an optional lazy-loaded path (`three` & friends are optional peers, loaded on demand). VRM is a living open standard (VRoid) and a real differentiator. |
| RPM variant | **Removed** (service dead). |
| Sketchfab caricature | **Removed** (license + demo-only hack code). |
| Developer 1 / 2 | **Removed** (quality). |
| `custom` (CLI avatar) | Kept for now; adapt to the layer contract or replace during Phase 4. |
| Mouth honesty | README/demo say **"audio-reactive mouth"**, never "lip-sync" (3D viseme talk allowed only for VRM). |

---

## Phase 1 — Surgery: separate library from demo  ✅ (this commit)

- [x] `src/lib/` = publishable only: `RealtimeAvatar`, presets, runtime, types. `AvatarState` lives in `src/lib/types.ts` (components no longer import types from the Gemini hook — dependency direction fixed).
- [x] `src/demo/` = `useGeminiLive`, `AudioStreamer`/`MicRecorder`, mock server utils. Demo imports from lib, never the reverse.
- [x] Delete: `RpmAvatar`, `DeveloperAvatar`, `DeveloperAvatar2`, caricature assets, RPM animations, dead 14-byte VRM stubs.
- [x] `VrmAvatar` loaded via `React.lazy` so SVG-only consumers never pay for Three.js.

## Phase 2 — Publishable packaging  ✅ (this commit)

- [x] `package.json`: `react`/`react-dom`/`motion` → peerDependencies only; `three`/`@react-three/fiber`/`@react-three/drei`/`@pixiv/three-vrm` → **optional** peers; build tools and demo/server deps (`express`, `ws`, `dotenv`, `@google/genai`, `vite`, `tailwind`, …) → devDependencies; **remove unused `better-sqlite3`**.
- [x] `vite.config.lib.ts`: externalize three/r3f/drei/pixiv (no more megabytes bundled in).
- [x] Remove module-level `useGLTF.preload` and hardcoded asset URLs (no more 404s in consumer apps).
- [x] `sideEffects` field for tree-shaking; fix `types` path.
- [x] Server reads `process.env.PORT` (Cloud Run requirement).
- [x] Lib ships its own stylesheet (`src/lib/lib.css`): utilities generated only from library components, **no preflight** (no resetting the consumer's app). 41.8 kB → 17 kB.

## Phase 3 — Animation runtime (the heart)

- [x] `createMouthEngine` + `useAudioMouth`: single shared engine for amplitude + A/E/O band analysis, with the procedural fallback built in. `DefaultAvatar`, `VrmAvatar`, `CustomAvatar` and the contract runtime all consume it.
- [x] **Procedural mouth fallback**: `state="speaking"` + `analyser=null` animates the mouth with a synthetic speech-like pattern — now in every engine consumer, including VRM.
- [x] **`thinking` is behavior, not a color**: runtime fades in `#rra-think` and pulses its dots out of phase; pupils drift up-left. (Done for contract presets; `DefaultAvatar` smiley has no think bubble by design.)
- [x] **Layer contract**: `useAvatarRuntime(containerRef, opts)` drives `#rra-ring`/`#rra-mouth`/`.rra-pupil`/`.rra-lid`/`#rra-think` found inside the container. `variant="byos"` ships: `<RealtimeAvatar variant="byos">{yourSvg}</RealtimeAvatar>`. Conformance test in `src/lib/contract.test.tsx`.
- [x] Production quality: `useReducedMotion` gates blink/gaze/pulse everywhere (runtime, `DefaultAvatar`, `RealtimeAvatar`, `CustomAvatar`, `VrmAvatar`); state pill is an `aria-live` status region; SSR render covered by test.
- [x] Fix known leaks: blink loop surviving unmount, re-entrant `disconnect` (handlers detached before close), Object URLs revoked via effect cleanup.

## Phase 4 — The avatar catalog (the "wow")

All own design, MIT, head/bust only, all implementing the same layer contract
(one runtime animates everything; a new preset is drawing, not logic):

| Preset | Style | Quality keys |
|---|---|---|
| `geometric` ✅ | GeometricAvatar (HANDOFF base) | Default preset + canonical byos example — shipped, default variant |
| `memoji` ✅ | Soft 3D-ish SVG, radial gradients | Volume shading, glossy eyes with highlights, blush, brows — shipped |
| `pixelart` ✅ | Logical 32×32 grid | `crispEdges`, mouth/pupils snapped to whole pixels via `data-quantize` — shipped |
| `doodle` ✅ | Hand-drawn ink | Wobbly outlines, scribble hair, dashed sketch ring — shipped |

Decision: `custom` (the CLI-compiled personal avatar) stays as a demo showcase variant; it now
consumes the shared mouth engine (procedural fallback included) and honors reduced-motion.

Backlog (post-v1.2 polish): brow poses per state, idle breathing micro-motion.

## Phase 5 — Demo/builder aligned  ✅

- [x] Builder shows the full catalog (geometric/memoji/pixelart/doodle/default/custom/VRM); exported code matches the real package (peers, no lucide-react, fallback documented).
- [x] Honest copy ("audio-reactive mouth", no lip-sync claims for SVG), `GEMINI_LIVE_MODEL` env var, per-IP concurrent-session cap on `/live` (`MAX_SESSIONS_PER_IP`, default 3).

## Phase 6 — Quality close-out  ✅

- [x] Tests (28): SSR render, procedural fallback motion, A/E/O band mapping with a mocked analyser, layer-contract conformance for all 4 presets.
- [x] New README: tagline, catalog table, byos contract table, comparison vs TalkingHead, license section, honest "audio-reactive" wording.
- [x] `npm pack --dry-run` audit: 79.6 kB package / 234 kB unpacked / 28 files — no demo assets, no third-party models.

Backlog: catalog GIF for the README, brow poses per state, idle breathing micro-motion,
AudioWorklet migration for the demo's MicRecorder (ScriptProcessorNode is deprecated).
