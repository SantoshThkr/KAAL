# KAAL — The Many Forms of Krishna

A six-minute animated short that runs in a browser. Krishna as a child in Vrindavan, the flute, time turning, and the
moment the cosmos comes out of him. It plays by itself from the first frame to the last; scrolling only nudges it along.

Everything you see is drawn in code: there is no character model, no texture atlas, no video. Krishna is a jointed
puppet made of vector drawings, animated procedurally frame by frame.

```bash
npm install
npm run dev          # http://localhost:3000
```

Click **ENTER EXPERIENCE** (browsers only allow sound after a gesture) and let it play.

## What is on screen

| # | Scene | Length | What happens |
|---|-------|--------|--------------|
| 1 | OPENING | 43 s | Night on the Yamuna. A feather falls. Krishna steps into the moonlight and looks at you. |
| 2 | BAL | 61 s | Morning in the village. He steals butter, is caught, bolts along the bank, dances. |
| 3 | VRINDAVAN | 37 s | He walks, and the world leans toward him: butterflies, blossom, a peacock. |
| 4 | FLUTE | 59 s | He sits at the water and plays. Fireflies rise; the river rings outward. |
| 5 | TRANSFORMATION | 32 s | The child comes apart into light and gathers again, taller. |
| 6 | KISHORE | 47 s | The youth under the moon, the same note played older. |
| 7 | DIVINE | 60 s | कालोऽस्मि. The cosmos opens out of him and the camera falls away. |
| 8 | SILENCE | 38 s | The river again. One last look, one last note, black. |

Total runtime 6 m 17 s. Five verses from the Bhagavad Gita appear in Devanagari with an English meaning.

## Controls

Always available: **wheel / swipe / arrow keys** nudge the film forward or back, **Space** pauses, **`[` `]`** (or
PgUp / PgDn) step scenes, **Home** restarts. The pointer moves Krishna's gaze; clicking the water raises ripples. The
only on-screen controls — sound, motion, skip — appear when the pointer moves and fade when it rests.

In `next dev`, or in a production build opened with `?engineering`:

- **`E`** — engineering panel: measured fps, draw calls, triangles, scene, shot, action, timeline position, audio, quality tier.
- **`1`–`8`** — jump to a scene.
- **`?quality=high|medium|low`** — pin the quality tier and turn off live adaptation.

## Architecture

One clock drives everything. `FilmClock` advances film time; scroll adds a conserved impulse to it rather than
controlling it directly, so the film always resumes playing itself. `timelineBuilder` compiles `src/data/story.ts`
into a single GSAP master timeline, which is **seeked** (never played) once per frame. Because every tween is a
`fromTo`, the picture at time *t* is the same however you arrived at *t* — scrub anywhere and nothing is left behind.

Continuous values live in one mutable object, `film` (`src/state/film.ts`), read by refs and shader uniforms.
React state (Zustand) holds only discrete things: the current scene, the status, the quality tier. There is one
`useFrame` in the whole app — `CinematicController`, priority −100 — which does, in order: stats, clock, timeline seek,
scene/shot tracking, cues, flute analyser.

```
src/
  art/          the drawings. krishnaArt (every body part as an SVG with a pivot), worldArt (trees, cows,
                peacocks, huts, lotus), palette, artTextures (SVG → CanvasTexture, cached)
  components/
    krishna/    puppet.ts   builds the joint hierarchy and hangs each drawing on it
                KrishnaAnimator.ts  poses, cycles, breath, blinks, gaze, 2-bone IK, the flute
                Krishna.tsx driven entirely by film.actors
    world/      World (sky, river, ground), Sprites (instanced, wind in the vertex shader), Motes, Creatures
    camera/     CinematicCamera, CameraRig (dolly/crane/handheld; snaps on a cut)
    effects/    PostFX (thin-lens DOF, bloom, AgX, vignette, grain, chromatic aberration), GainEffect
    audio/      AudioManager (buses, muffle, analyser), SceneAudio (reconciles voices against film time)
    story/      Captions (verses and titles as DOM text, written at 10 Hz)
    experience/ Experience, ExperienceCanvas, CinematicController
    ui/         EnterGate, Controls, EngineeringPanel
  data/
    story.ts    THE FILM: 8 scenes, their shots, camera moves, beats, cues, moods, fx
    shlokas.ts  the verses, SHA-256 locked
    moods.ts vrindavan.ts audioManifest.ts
  lib/          filmClock, timelineBuilder, cueScheduler, filmState, audioPlan, quality, random, math
  shaders/      sky, water and ground GLSL
```

### Krishna

`src/art/krishnaArt.ts` holds 22 drawings — head, hair, crown and feather, eyes, lids, brows, four mouths,
torso, dhoti, arm and leg segments, hands, flute — each an SVG with a declared pivot and named landmarks
(`FACE.eyeLeft`, `FACE.mouth`). They are rasterised once into `CanvasTexture`s at a resolution chosen by the quality
tier, then hung on a joint hierarchy as camera-facing quads at slightly different depths. That is the whole character:
flat drawings in a 3D world, which is what lets the camera dolly and parallax through a scene that looks hand-drawn.

Two sets of proportions, `BAL` and `KISHORE`, share one rig, so every pose and cycle works for the child and the
youth. The animator provides `idle, walk, run, flute, dance, sit, peek, reach, wave, wonder, bless`, with breathing,
a seeded blink scheduler, gaze (irises plus a little head yaw and pitch), and 2-bone IK for reaching.

### Audio

Nine real recordings from Wikimedia Commons (bansuri and ambience), listed with sources and licences in
`public/audio/CREDITS.md`. No oscillators, no synthesised stand-ins. Web Audio graph: master → buses (flute,
ambience, environment) → a generated riverbank convolution reverb, with a low-pass "muffle" the story can close over
the whole mix. `audioPlan` turns the timeline's cues into clips with a start and an end; `SceneAudio` reconciles live
voices against film time every frame, resyncing a clip that drifts more than 0.35 s and suppressing one-shots while
you scrub. The flute bus feeds an analyser whose energy drives the fireflies and the bloom.

### Verses

Sanskrit lives only in `src/data/shlokas.ts`, locked by a SHA-256 hash over the NFC text and cross-checked against a
public corpus with `npm run shlokas:verify`. A test fails the build if Devanagari appears in a component. Verses are
rendered as DOM text, not drawn into the canvas, so the browser shapes the script properly and a screen reader can
read it.

## Commands

```bash
npm run dev              # next dev
npm run build            # production build (Next 16, Turbopack)
npm start                # serve the production build
npm test                 # vitest: clock, cues, story shape, audio plan, verses, source rules
npm run typecheck        # tsc --noEmit
npm run lint             # eslint
npm run shlokas:verify   # verse integrity + corpus cross-check
```

## Performance

Quality tiers (high / medium / low) pick particle counts, texture resolution and post settings, and adapt live
through drei's `PerformanceMonitor`; `?quality=` pins one. Measured on an Apple M2 at 1280×720 against a production
build, sampled across four points in the film: a steady 60 fps at every tier, 102 draw calls and 3.0k triangles on
high, 102 and 2.7k on medium, 91 and 2.6k on low, and 2 Zustand writes in 4 s of playback. An emulated iPhone 13
plays it smoothly. The whole world is instanced — one draw call per kind of tree, flower or cow — so the tiers differ
mostly in texture resolution and particle count rather than in geometry.

## Known limitations

- Three ambience beds (`yamuna-evening`, `vrindavan-evening`, `cosmic-wind`) reuse the closest real recording rather
  than a dedicated one; the mapping is explicit in `src/data/audioManifest.ts`. There is no music score, only the
  bansuri and the ambience.
- The verses' English meanings are drafts. The Sanskrit matches a public corpus exactly, but a person still has to
  sign it off against the Gita Supersite (https://www.gitasupersite.in/), whose verse API needs a login.
- Krishna is drawn in profile-friendly 2.5D: he turns by mirroring, not by rotating in depth, so the camera stays
  roughly in front of him. Shots are composed for that.
- There is no WebGL fallback beyond a message; the film needs WebGL 2.
- Audio cannot start before the viewer clicks ENTER — a browser rule, not a choice.
