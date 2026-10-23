# Contributing to react-ai-avatar

Thanks for helping. Questions and ideas go to [Discussions](https://github.com/aralde/react-ai-avatar/discussions); bugs and feature requests to [Issues](https://github.com/aralde/react-ai-avatar/issues).

## Setup

This repo is the library only: no app, no backend. The runnable demos live on the [docs site](https://react-ai-avatar.vercel.app/), built separately.

```bash
npm install
npm test           # vitest: engine, layer contract, SSR, parsers
npm run test:e2e   # Playwright: the runtime in a real browser (blink, mouth, gaze, overlays)
npm run lint       # tsc --noEmit
npm run build:lib  # builds the publishable package into dist/lib
npm run size       # what each entry point costs a consumer (needs build:lib)
```

## What's welcome

- Bug fixes, with a test that fails without the fix.
- New faces that follow the `#rra-*` layer contract. The [Agent Skill](.claude/skills/rra-character-avatar/SKILL.md) in this repo explains the contract and has a preview page to check a face in every state.
- Integration examples for [`examples/`](examples/): one file per pattern.

## The few rules

- **The library stays presentational and provider-agnostic.** It never fetches; your app owns the microphone, the connection and the model.
- **Optional stays optional.** Three.js, DiceBear and other heavy peers are optional peer dependencies, lazy-loaded only when used.
- **The core stays within its size budget.** CI checks every entry point against the budgets in `scripts/size.mjs`.
- **Accessibility is not optional.** Respect `prefers-reduced-motion` and keep state changes announced.
- Add or update tests when behavior changes, and a line in the [CHANGELOG](CHANGELOG.md) under `[Unreleased]`.

## License

By contributing, you agree that your contributions are licensed under the [Apache License 2.0](LICENSE), like the rest of the project.
