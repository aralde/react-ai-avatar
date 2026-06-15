# Example 3D models (not versioned)

The `react-realtime-avatar` **library ships no 3D models** — the `vrm` and `glb`
variants take a URL you provide (`vrmUrl` / `glbUrl`).

The demo in this repo references a few example models by path
(`/models/*.vrm`, `/models/rocketbox.glb`). These are intentionally **git-ignored**:
they are large binaries and some carry third-party licenses, so they are not part
of the repository or the published npm package.

To run the demo's 3D variants locally, drop your own files here:

| path | what to use |
|---|---|
| `public/models/rocketbox.glb` | any `.glb` exposing the 52 ARKit blendshapes — e.g. a [Microsoft Rocketbox](https://github.com/microsoft/Microsoft-Rocketbox) avatar (MIT) converted to glTF, or a [Ready Player Me](https://readyplayer.me) avatar with `?morphTargets=ARKit` |
| `public/models/*.vrm` | any VRoid/VRM model |

The flat SVG presets (`geometric`, `memoji`, `pixelart`, `doodle`) and the
`dicebear` variant need **no** assets and work out of the box.
