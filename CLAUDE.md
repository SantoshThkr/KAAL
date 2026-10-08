# KAAL: The Many Forms of Krishna

A six-minute animated short that happens to run in a browser. **Not a website about Krishna.** The viewer should forget
they are on a website. Krishna is the hero; the story is the structure; the camera tells the story; the music controls
the emotion; the world responds to Krishna; the ending returns to silence.

The look is a **hand-drawn cartoon**, not photoreal 3D: flat vector drawings rigged as a puppet inside a 3D world.
Expressiveness beats fidelity everywhere. Priority order, never reversed: Krishna character, character animation,
storytelling, camera, environment, sound, shlokas, effects, UI. If a particle effect competes with better Krishna
animation, choose the animation.

## Status

Complete and verified end to end: all eight scenes, Krishna animated as a child and as a youth, real audio throughout,
five verses, interaction, three quality tiers, desktop and mobile. 52 tests, clean typecheck and lint, production build
verified in real Chrome at 60 fps. `README.md` is the up-to-date description of the architecture.

## Hard rules

- **Never build Krishna, or any character, from primitives** (sphere, capsule, cylinder, cone, torus, box), and never
  as particles alone. He is drawings — `src/art/krishnaArt.ts` — hung on a joint hierarchy. No mascot, no stand-in.
- **Never write Sanskrit from memory or edit it by hand.** It lives only in `src/data/shlokas.ts`, locked by SHA-256,
  cross-checked against a public corpus (`npm run shlokas:verify`), pending a person's sign-off on the Gita Supersite
  (https://www.gitasupersite.in/; its verse API needs a login). Never hardcode Devanagari in a component — a test
  enforces it. Hindi and English meanings are drafts until reviewed.
- **Any original Hindi or English copy is website copy, never presented as a Gita quotation.** It would live in its own
  data file with its own type, so the verse overlay can never render it.
- **One central controller.** No per-component scroll listeners, no OrbitControls, no `setState` in `useFrame` for
  continuous values. Continuous values live in `film` (`src/state/film.ts`) and are read by refs and uniforms. React
  state (Zustand) holds only discrete things.
- **Audio is real:** Web Audio, gesture-unlocked, real recordings credited in `public/audio/CREDITS.md`. No oscillator
  placeholders, no fake TTS voice. The analyser listens to the flute bus only.
- **The timeline is seeked, never played.** Every tween is a `fromTo` with `immediateRender: false`, so the picture at
  time *t* is identical however the viewer arrived there. Discrete cues fire through `CueScheduler`, forward only.
- **Effects must answer "why is this here?"** Cosmic effects belong to the DIVINE scene only.
- **Don't fake a missing thing.** Say it is missing.

## Commands

```bash
npm run dev            # next dev
npm run build          # production build (Next 16 / Turbopack)
npm test               # vitest: clock, cues, story shape, audio plan, verses, source rules
npm run typecheck && npm run lint
npm run shlokas:verify # verse integrity + corpus cross-check
```

Never `rm -rf .next` while a `next dev` may be running: the dev server writes generated files at startup and cannot
recover, and it must be restarted. Check `lsof -i :3000` first. `next build` also writes `.next`, so stop the dev
server before building.

**Debug tools** (always on in `next dev`; in a production build only with `?engineering`):

- `E` engineering mode: measured FPS, draw calls, triangles, scene, shot, action, timeline position, audio, quality.
- `1`-`8` jump to a scene: OPENING, BAL, VRINDAVAN, FLUTE, TRANSFORMATION, KISHORE, DIVINE, SILENCE.
- `?quality=high|medium|low` pins the quality tier (and turns off live adaptation).

Viewer controls (always): wheel/swipe/arrows nudge the film, `Space` pauses, `[` `]` (or PgUp/PgDn) step scenes, `Home`
restarts. The pointer moves his gaze; clicking the water raises ripples. Sound, motion and skip appear when the pointer
moves and leave when it rests.

## Architecture

```
src/
  app/                 layout, page, globals.css (a black stage; no page design)
  art/
    krishnaArt.ts        every body part as an SVG with a pivot, plus FACE landmarks
    worldArt.ts          trees, bushes, grass, flowers, lotus, huts, pots, cows, peacocks, butterflies, clouds
    artTextures.ts       SVG -> CanvasTexture, rasterised once per tier and cached
    palette.ts           the single colour language
  data/
    story.ts             THE FILM, declaratively: 8 scenes, shots, beats, cues, moods, fx, world
    shlokas.ts           the verses, hash-locked
    moods.ts             named light: nightDeep, moonlit, morning, vrindavan, golden, magicDusk, cosmic, silence...
    vrindavan.ts         the seeded layout of the place
    audioManifest.ts     every sound, its bus and gain
  lib/
    filmClock.ts         autoplay + scroll impulses (a conserved displacement budget)
    timelineBuilder.ts   compiles the data into ONE GSAP master timeline + a cue list; path-independent seeking
    cueScheduler.ts      fires audio/verse/title/beat cues once, going forward only (not GSAP callbacks)
    filmState.ts         the mutable per-frame state type (cam, mood, actors, fx, world, pointer, audio, stats)
    audioPlan.ts quality.ts random.ts math.ts webgl.ts env.ts uiTicker.ts cinematicActions.ts debugCounters.ts
  state/
    film.ts              singletons: compiled film, mutable film state, clock, cue bus
    experienceStore.ts   Zustand: DISCRETE state only
  hooks/                 useCinematicTimeline (all input), useQuality, useAudioAnalyser
  components/
    krishna/     puppet.ts (joints + drawings) KrishnaAnimator.ts (poses, cycles, breath, blink, gaze, IK) Krishna.tsx
    world/       World (sky/river/ground) Sprites (instanced, wind in the vertex shader) Motes Creatures Stage ArtGate
    camera/      CinematicCamera CameraRig (dolly/crane/handheld from film.cam; snaps on cuts)
    effects/     PostFX (thin-lens DOF, bloom, AgX, vignette, grain, CA, fade) GainEffect
    audio/       AudioManager (buses, muffle, analyser) SceneAudio (reconciles voices against film time)
    story/       Captions (verses and titles as DOM text at 10 Hz)
    experience/  Experience (shell) ExperienceCanvas CinematicController (the one useFrame that runs the film)
    ui/          EnterGate Controls EngineeringPanel
  shaders/       sky.ts (sky, water, ground GLSL)
scripts/  verify-shlokas.mjs
tests/    story, audio, filmClock, cueScheduler, shlokas, sourceRules
public/   audio/{flute,ambience} + CREDITS.md
```

Per-frame order, all in `CinematicController` (priority -100): stats, wall/world time, film clock, GSAP master timeline
seek, scene/shot tracking (discrete updates to React), cues, flute analyser.

### Working on the character

Drawings carry their own pivot and landmarks; the rig reads positions out of the art rather than hardcoding them, so
moving an eye in the SVG moves the eye bone. `segment()` in `puppet.ts` scales a limb drawing so the span from its
pivot to the end of the shape equals the bone length — without it the joints land short and an extended arm comes
apart. `BAL` and `KISHORE` are two sets of proportions on one rig, so every pose works for both.

## Measured baseline (production build, Apple M2, 1280x720)

60 fps at every tier across the film. Draw calls / triangles: 102 and 3.0k high, 102 and 2.7k medium, 91 and 2.6k low.
2 store writes in 4 s of playback. An emulated iPhone 13 plays smoothly. These are the numbers to protect.
