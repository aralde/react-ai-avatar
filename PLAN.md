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
- [ ] **Pending**: stop shipping the demo's Tailwind CSS as the lib stylesheet — presets should style themselves (inline/scoped). Tracked for Phase 3/4 while components are rewritten anyway.

## Phase 3 — Animation runtime (the heart)

- [ ] `useAudioMouth(analyser, opts)`: single shared hook for amplitude + E/O/A band analysis (today copy-pasted in 3+ components).
- [ ] **Procedural mouth fallback**: `state="speaking"` + `analyser=null` animates the mouth with a synthetic pattern (sum of sines + pseudo-random variation). This is the 80% use case.
- [ ] **`thinking` is behavior, not a color**: `#rra-think` bubble with 3 dots pulsing out of phase + pupils up-left. In every preset.
- [ ] **Layer contract** (`#rra-ring`, `#rra-head`, `#rra-mouth`, `.rra-pupil`, `.rra-lid`, `#rra-think`, …): runtime finds ids inside the container ref and drives them. Enables `variant="byos"` (bring-your-own-SVG; the dev's avatar license is the dev's problem).
- [ ] Production quality: respect `prefers-reduced-motion` (kill blink/idle/mouse-tracking; keep the informative mouth), SSR-safe (no `window` at module scope), `stateLabels` as `aria-live` region.
- [ ] Fix known leaks: blink loop surviving unmount, re-entrant `disconnect`, un-revoked Object URLs.

## Phase 4 — The avatar catalog (the "wow")

All own design, MIT, head/bust only, all implementing the same layer contract
(one runtime animates everything; a new preset is drawing, not logic):

| Preset | Style | Quality keys |
|---|---|---|
| `geometric` | GeometricAvatar (HANDOFF base) | Default preset + canonical byos example |
| `memoji` | Soft 3D-ish SVG, radial gradients | Volume shading, eye highlights, expressive brows per state |
| `pixelart` | Logical 16×16/32×32 | `shape-rendering: crispEdges`, quantized pixel-row mouth, 2-frame blink |
| `doodle` | Hand-drawn ink | Irregular strokes, subtle idle wobble, redrawn-stroke mouth |

Cross-cutting: brows + pupils posed per state (not just the mouth), idle breathing micro-motion,
coherent customization props per preset.

## Phase 5 — Demo/builder aligned

- [ ] Builder shows the new catalog; exported code matches the real package (peers, imports).
- [ ] Honest copy ("audio-reactive"), Gemini model name via env var, basic rate limit on `/live`.

## Phase 6 — Quality close-out

- [ ] Tests: SSR `renderToString`, procedural fallback, layer-contract conformance per preset, reduced-motion.
- [ ] New README: tagline, catalog GIF, comparison vs TalkingHead, license section.
- [ ] `npm pack --dry-run` audit of published contents.
