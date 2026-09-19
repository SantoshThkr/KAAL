# Performance

Target: 60 fps on a modern desktop. Krishna's quality is never sacrificed for an effect, and Krishna is never removed at any tier.

## Tiers

The starting tier comes from the device (software renderer, pointer type, cores, memory); `?quality=` pins it. drei's
`PerformanceMonitor` then steps down (and back up, with a flip-flop guard) live. There is no `detect-gpu`: it fetches
benchmark data from a CDN at runtime.

| | HIGH | MEDIUM | LOW |
|---|---|---|---|
| Pixel ratio | 1 to 2 | 1 to 1.5 | 1 |
| MSAA | 4x | none | none |
| Depth of field | yes | yes | no |
| Grain / chromatic aberration | yes / yes | yes / no | no / no |
| Shadows | 2048 | 1024 | off |
| Particles | x1 | x0.5 | x0.2 |
| Environment density | x1 | x0.6 | x0.3 |
| Texture cap | 4096 | 2048 | 1024 |
| Krishna | LOD0 | LOD0 | LOD1 (same rig) |

## Rules

1. **No state updates per frame.** Continuous values are refs and uniforms (`film`). The store holds discrete state only. The
   browser run measures store writes during playback (4 in 5 s at Phase 1).
2. **One frame loop** (`CinematicController`). No component runs its own scroll listener or animation loop. The 10 Hz UI
   ticker writes straight to DOM nodes.
3. **Scene-level loading.** Only the current chapter is mounted; the next is preloaded before the cut; two chapters back is disposed.
4. **Pre-compile shaders** (`renderer.compileAsync`) for the next chapter before its first frame. A stutter during the
   transformation would ruin it. (Mounting the debug stage the first time already shows why: one compile hitch.)
5. **Instancing** for grass, trees, fireflies, birds, cows, and the army (impostors far away). Frustum culling on. Dispose what leaves.
6. **Self-hosted decoders** (Draco, Basis). Meshopt for characters, Draco for static meshes, KTX2 textures.
7. **Render stats are measured**, across every pass, from `renderer.info` (autoReset off, read and reset once per frame).

## Baseline

Apple M2, Chrome, 1280x720, engineering debug stage on: 60 fps at all three tiers. Draw calls (all passes) 32 / 28 / 17.
Re-measure when each scene lands.

## Known

- `THREE.Clock` deprecation warning at startup comes from inside `@react-three/fiber` 9.7.
- The dev-time 404s for `bal-krishna.glb` and `kishore-krishna.glb` are the asset probe reporting the truth.
