# KAAL: The Many Forms of Krishna

A cinematic animated film that happens to run in a browser. **Not a website about Krishna.** The viewer should forget they
are on a website. Krishna is the hero; the story is the structure; the camera tells the story; the music controls the
emotion; the environment responds to Krishna; the ending returns to silence.

Priority order, never reversed: Krishna character, character animation, storytelling, camera, lighting, environment,
sound, shlokas, transformation, effects, UI. If a particle effect competes with better Krishna animation, choose the animation.

## Status

- **Phase 1 (foundation): complete and verified.** Stack, clock, timeline, camera, lighting, post, audio graph, quality
  tiers, engineering mode, shloka data, asset spec.
- **Phase 2 (real Krishna GLB visible, animated, lit): BLOCKED. This is a hard gate.** No Krishna asset exists. See
  `TODO.md` (generated) and `docs/ASSET_SPEC.md`. Do not declare the project complete until an actual animated Krishna is
  present.
- Later phases: 3 Bal scene, 4 Vrindavan, 5 flute and audio, 6 Bal-to-Kishore transformation (hard gate), 7 Kurukshetra,
  8 Gita, 9 Vishwaroopa, 10 final, 11 mobile, performance, accessibility, polish.

## Hard rules (from the brief)

- **Never build Krishna, or any character, from primitives** (sphere, capsule, cylinder, cone, torus, box), and never as
  particles alone. No mascot. No low-quality stand-in. Missing asset means: document it in `TODO.md`, do not fake it.
- **Never write Sanskrit from memory or edit it by hand.** It lives only in `src/data/shlokas.ts`, locked by SHA-256,
  cross-checked against a public corpus (`npm run shlokas:verify`), pending a person's sign-off on the Gita Supersite
  (https://www.gitasupersite.in/, formerly gitasupersite.iitk.ac.in; its verse API needs a login). Never hardcode
  Devanagari in a component (a test enforces it). Hindi and English meanings are drafts until reviewed.
- **Any closing Hindi copy (the first brief had "कर्म करते रहो…"; the second dropped it) is original website copy, never presented as a Gita quotation.** It would live in its own data file with its own type, so the shloka overlay can never render it.
- **The Bal-to-Kishore transformation is GPU particle morphing** (surface sampling, curl noise, attractors), never a fade,
  crossfade or scale.
- **One central controller.** No per-component scroll listeners, no OrbitControls, no `setState` in `useFrame` for
  continuous values. Continuous values live in `film` (`src/state/film.ts`) and are read by refs and uniforms. React state
  (Zustand) holds only discrete things.
- **Audio is real:** Web Audio, gesture-unlocked, no oscillator placeholders, no fake TTS voice. Flute stems are dry; the
  analyser listens to the flute bus only.
- **Effects must answer "why is this here?"** Cosmic effects belong to Vishwaroopa only.

## Commands

```bash
npm run dev            # copies decoders, then next dev
npm run build          # production build (Next 16 / Turbopack)
npm test               # vitest: clock, timeline, cues, shlokas, asset spec, brief rules
npm run typecheck && npm run lint
npm run assets:check   # validates public/ against src/data/assetSpec.json, rewrites TODO.md
npm run shlokas:verify # integrity + corpus cross-check (add -- --strict as a release gate)
```

Never `rm -rf .next` while a `next dev` may be running: the dev server writes generated files at startup and cannot
recover, and it must be restarted. Check `lsof -i :3000` first.

**Debug tools** (always on in `next dev`; in a production build only with `?engineering`):

- `E` engineering mode: measured FPS, draw calls, triangles, particles, scene, shot, animation, timeline, audio, quality.
- `1`-`9`, `0` jump to a chapter: INTRO, BAL_KRISHNA, VRINDAVAN, FLUTE, TRANSFORMATION, KISHORE, KURUKSHETRA, GITA,
  VISHWAROOPA, FINAL. BIRTH, TIME_PASSAGE and RETURN have no key.
- `?quality=high|medium|low` pins the quality tier (and turns off live adaptation).

Viewer controls (always): wheel/swipe/arrows nudge the film, `Space` pauses, `[` `]` (or PgUp/PgDn) step scenes, `Home`
restarts. Sound, motion and skip appear when the pointer moves and leave when it rests.

## Architecture

```
src/
  app/                 layout, page, globals.css (a black stage; no page design)
  data/
    cinematicTimeline.ts   THE FILM, declaratively: 13 scenes, shots, beats, cues, lighting, fades, world time
    lightingPresets.ts     the story's light (provisional values, tuned per scene)
    shlokas.ts             the seven verses, hash-locked
    assetSpec.json         every production asset and character contract
  lib/
    filmClock.ts           autoplay + scroll impulses (a conserved displacement budget)
    timelineBuilder.ts     compiles the data into ONE GSAP master timeline + a cue list; path-independent seeking
    cueScheduler.ts        fires audio/shloka/title/beat cues once, going forward only (not GSAP callbacks)
    filmState.ts           the mutable per-frame state type (camera, light, fx, world, audio, stats)
    quality.ts webgl.ts assetLoader.ts cinematicActions.ts uiTicker.ts env.ts math.ts
  state/
    film.ts                singletons: compiled film, mutable film state, clock, cue bus
    experienceStore.ts     Zustand: DISCRETE state only
  hooks/                   useCinematicTimeline (all input), useQuality, useAudioAnalyser
  components/
    experience/  Experience (shell) ExperienceCanvas CinematicController (the one useFrame that runs the film) LightingRig
    camera/      CinematicCamera CameraRig (dolly/crane/handheld from film.cam; snaps on cuts)
    effects/     PostFX (DOF, bloom, AgX, vignette, grain, CA, fade) GainEffect
    audio/       AudioManager (buses, muffle, analyser)
    scenes/      SceneDirector (lazy, scene-level loading). Scenes land with their phases
    debug/       DebugStage (engineering only: grid, 18% grey ball, aim marker)
    ui/          EnterGate Controls EngineeringPanel
    krishna/ environment/    (empty until Phase 2 and 3)
  shaders/                   (empty until the phases that need them)
scripts/  assets.mjs  verify-shlokas.mjs  copy-decoders.mjs
tests/    docs/ASSET_SPEC.md
public/   models/{krishna,environment,characters,props}  audio/{flute,voice,ambience,effects,score}  textures  hdri  decoders
```

Per-frame order, all in `CinematicController` (priority -100): stats, wall/world time, film clock, GSAP master timeline
seek, scene/shot tracking (discrete updates to React), cues, flute analyser.

## Measured baseline (Phase 1, Apple M2, 1280x720, debug stage on)

60 fps at every tier. Draw calls (all passes): 32 high, 28 medium, 17 low. 4 store writes in 5 s of playback. These are
the numbers to protect when scenes arrive.
