"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { audioManager } from "@/components/audio/AudioManager";
import { buildMasterTimeline, describeCue, shotIndexAt } from "@/lib/timelineBuilder";
import { clock, compiled, cueBus, cues, film, sceneAudio } from "@/state/film";
import { useExperienceStore } from "@/state/experienceStore";

/** Playback faster than this is scrubbing: one-shots and voice are suppressed by their listeners. */
const FAST_RATE = 1.6;
/** Frames rendered before the experience is declared ready to enter. */
const WARMUP_FRAMES = 3;
/** Seconds per FPS reading. */
const FPS_WINDOW = 0.5;

/**
 * THE central cinematic controller. One useFrame drives the entire film, and it runs before everything that reads
 * from `film`. Order every frame:
 *
 *   1. snapshot render stats from the previous frame, reset counters
 *   2. advance wall time and world time
 *   3. advance the FilmClock (autoplay + scroll impulses)
 *   4. seek the GSAP master timeline to film time  ->  camera, lights, fx, world are now current
 *   5. track scene and shot; report DISCRETE changes to React
 *   6. fire cues (audio, shloka, title, beats) crossed going forward
 *   7. sample the flute analyser into film.audio
 *
 * Continuous values never touch React state.
 */
export function CinematicController() {
  const gl = useThree((state) => state.gl);
  const timeline = useRef<ReturnType<typeof buildMasterTimeline> | null>(null);
  const warmup = useRef(0);
  const fps = useRef({ time: 0, frames: 0 });

  useEffect(() => {
    const master = buildMasterTimeline(compiled, film);
    master.time(clock.time, true);
    cues.reset(clock.time);
    timeline.current = master;
    return () => {
      master.kill();
      timeline.current = null;
    };
  }, []);

  useFrame((_, delta) => {
    const master = timeline.current;
    if (!master) return;
    const dt = Math.min(delta, 0.1);
    const store = useExperienceStore.getState();

    // 1. Render stats. autoReset is off, so gl.info still holds LAST frame's totals across every pass.
    const { render, memory } = gl.info;
    const stats = film.stats;
    stats.calls = render.calls;
    stats.triangles = render.triangles;
    stats.points = render.points;
    stats.lines = render.lines;
    stats.geometries = memory.geometries;
    stats.textures = memory.textures;
    stats.pixelRatio = gl.getPixelRatio();
    gl.info.reset();
    fps.current.time += delta;
    fps.current.frames += 1;
    if (fps.current.time >= FPS_WINDOW) {
      stats.fps = fps.current.frames / fps.current.time;
      stats.frameMs = (1000 * fps.current.time) / fps.current.frames;
      fps.current.time = 0;
      fps.current.frames = 0;
    }

    // 2. Two clocks. Krishna's breathing runs on wall time; water and leaves run on world time, which the timeline
    //    can slow to a near stop while Krishna keeps moving.
    film.wallTime += dt;
    film.worldTime += dt * film.world.timeScale;

    // 3. Film clock. It also runs when ended, so the viewer can scroll back out of the final titles.
    if (store.status === "playing" || store.status === "ended") clock.update(dt);
    else clock.hold();
    film.time = clock.time;
    film.progress = clock.duration > 0 ? clock.time / clock.duration : 0;
    film.rate = clock.rate;

    // 4. One seek drives every continuous value in the film.
    master.time(clock.time, true);

    // 5. Where are we? Only changes reach React.
    const shotIndex = shotIndexAt(compiled, clock.time);
    if (shotIndex !== film.shotIndex || clock.seeked) {
      const previous = compiled.shots[film.shotIndex];
      const shot = compiled.shots[shotIndex];
      const hardCut = clock.seeked || shot.def.cut || previous.def.cut || shot.sceneIndex !== film.sceneIndex;
      if (hardCut) film.cutId += 1;
      film.shotIndex = shotIndex;
      film.sceneIndex = shot.sceneIndex;
      store.setPosition(shot.sceneId, shot.def.id, shot.authored);
    }
    if (store.status === "playing" && clock.ended) store.setStatus("ended");
    else if (store.status === "ended" && !clock.ended) store.setStatus("playing");

    // 6. Cues.
    if (store.status === "playing" || store.status === "ended") {
      const fired = cues.advance(clock.prevTime, clock.time, clock.seeked);
      if (fired.length > 0) {
        const fast = clock.rate > FAST_RATE;
        for (const cue of fired) cueBus.emit(cue, { fast });
        store.setLastCue(describeCue(fired[fired.length - 1]));
      }
    }

    // 7. Audio follows film time: the right clips at the right offsets, whatever the viewer did.
    sceneAudio.update(clock.time, clock.rate, store.status === "playing" && !clock.paused);
    audioManager.readEnergy(film.audio, dt);
    audioManager.setMuffle(film.world.muffle);

    if (store.status === "booting" && ++warmup.current >= WARMUP_FRAMES) {
      const settling = Object.values(store.characters).some((state) => state === "checking" || state === "loading");
      if (!settling) store.setStatus("ready");
    }
  }, -100);

  return null;
}
