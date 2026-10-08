import { audioManager } from "@/components/audio/AudioManager";
import type { SceneId } from "@/data/story";
import { sceneIndexAt } from "@/lib/timelineBuilder";
import { clock, compiled, film, sceneAudio } from "@/state/film";
import { ripple } from "@/components/world/World";
import { useExperienceStore } from "@/state/experienceStore";

/** Pressing "previous scene" more than this far into a scene restarts it; sooner goes to the one before. */
const RESTART_WINDOW = 3;

const isActive = () => {
  const { status } = useExperienceStore.getState();
  return status === "playing" || status === "ended";
};

/**
 * ENTER EXPERIENCE. Must run synchronously inside the click handler: the AudioContext is created and resumed here,
 * because browsers only allow audio to start from a user gesture.
 */
export function enterExperience() {
  const store = useExperienceStore.getState();
  if (store.status !== "ready") return;
  audioManager.setMuted(!store.soundOn);
  void audioManager.unlock();
  store.setStatus("playing");
}

export function replay() {
  const store = useExperienceStore.getState();
  clock.seek(0);
  clock.setPaused(false);
  store.setPaused(false);
  store.setStatus("playing");
}

export function togglePause() {
  if (!isActive()) return;
  const paused = !clock.paused;
  clock.setPaused(paused);
  useExperienceStore.getState().setPaused(paused);
}

/** Smoothly push the film by about this many film-seconds (negative pulls it back). */
export function nudge(seconds: number) {
  if (isActive()) clock.nudge(seconds);
}

export function seekScene(id: SceneId) {
  if (!isActive()) return;
  const scene = compiled.scenes.find((candidate) => candidate.def.id === id);
  if (scene) clock.seek(scene.start);
}

export function stepScene(direction: 1 | -1) {
  if (!isActive()) return;
  // Read the CLOCK, not film.sceneIndex: seek() moves the clock at once, whereas film.* only updates next frame, so
  // several quick key presses within one frame would all target the same scene.
  const current = compiled.scenes[sceneIndexAt(compiled, clock.time)];
  if (direction === 1) {
    const next = compiled.scenes[Math.min(compiled.scenes.length - 1, current.index + 1)];
    clock.seek(next === current ? compiled.duration : next.start);
  } else if (clock.time - current.start > RESTART_WINDOW || current.index === 0) {
    clock.seek(current.start);
  } else {
    clock.seek(compiled.scenes[current.index - 1].start);
  }
}

/** The "skip" control: on to the next scene. */
export const skip = () => stepScene(1);

/**
 * The viewer touches the world: rings spread across the Yamuna from wherever Krishna stands, and the flute answers
 * softly. Interaction, not a control.
 */
export function touchWater() {
  if (!isActive()) return;
  const krishna = film.actors.kishore.opacity > film.actors.bal.opacity ? film.actors.kishore : film.actors.bal;
  ripple.x = krishna.x + film.pointer.x * 3;
  ripple.z = -9 + film.pointer.y * 3;
  ripple.start = film.worldTime;
  sceneAudio.playOnce("flute/call-hint", -14);
}
