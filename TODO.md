# Production TODO

## Blocker

No Krishna character asset exists in this repository. The procedural Krishna has been removed from the production render path. The application now renders no character until a proper rigged GLB is supplied.

Required drop-in files:

- `public/models/krishna/bal-krishna.glb`
- `public/models/krishna/kishore-krishna.glb`

Required clips or morph targets:

- `idle`
- `blink`
- `look`
- `fluteIdle`
- `flutePlay`
- optional `smile`

The loader, material configuration, AnimationMixer controller, and surface-sampling morph utilities are isolated under `components/krishna/`.

- Replace the procedural particle silhouette with a GPU morph target pipeline sourced from Bal Krishna and Kishore Krishna GLBs.
- Add optimized character and environment assets under `public/models` and `public/textures`.
- Replace the oscillator placeholder with licensed flute, water, wind, thunder, and ambience stems.
- Add Web Audio analyser routing so flute frequency data drives particles, ripples, fireflies, and light.
- Add real WebGL post-processing and a cinematic camera timeline after assets are available.
