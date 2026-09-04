# Production TODO

## Blocker

No Krishna character asset exists in this repository. The current visible hero is an isolated procedural stand-in, explicitly intended to validate camera, lighting, identity cues, and animation architecture only.

Required drop-in files:

- `public/models/bal-krishna.glb`
- `public/models/kishore-krishna.glb`

Required clips or morph targets:

- `idle`
- `blink`
- `look`
- `fluteIdle`
- `flutePlay`
- optional `smile`

- Replace the procedural particle silhouette with a GPU morph target pipeline sourced from Bal Krishna and Kishore Krishna GLBs.
- Add optimized character and environment assets under `public/models` and `public/textures`.
- Replace the oscillator placeholder with licensed flute, water, wind, thunder, and ambience stems.
- Add Web Audio analyser routing so flute frequency data drives particles, ripples, fireflies, and light.
- Add real WebGL post-processing and a cinematic camera timeline after assets are available.
