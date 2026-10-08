import gsap from "gsap";
import { Color } from "three";
import { MOODS, type MoodDef } from "@/data/moods";
import {
  SCENES,
  type ActorId,
  type AudioCueDef,
  type BeatDef,
  type CameraPose,
  type SceneDef,
  type SceneId,
  type ShlokaCueDef,
  type ShotDef,
  type TitleCueDef
} from "@/data/story";
import type { FilmState, RGB } from "./filmState";

export interface CompiledScene {
  def: SceneDef;
  index: number;
  start: number;
  end: number;
  duration: number;
  firstShot: number;
  lastShot: number;
}

export interface CompiledShot {
  def: ShotDef;
  sceneId: SceneId;
  sceneIndex: number;
  index: number;
  start: number;
  end: number;
  /** False when a shot has no camera path and simply holds the previous one. */
  authored: boolean;
}

export type Cue =
  | { kind: "audio"; at: number; sceneId: SceneId; cue: AudioCueDef }
  | { kind: "shloka"; at: number; sceneId: SceneId; cue: ShlokaCueDef }
  | { kind: "title"; at: number; sceneId: SceneId; cue: TitleCueDef }
  | { kind: "beat"; at: number; sceneId: SceneId; cue: BeatDef };

export function describeCue(cue: Cue): string {
  switch (cue.kind) {
    case "audio":
      return `audio: ${cue.cue.id} (${cue.cue.action})`;
    case "shloka":
      return `shloka: ${cue.cue.id}`;
    case "title":
      return `title: ${cue.cue.text}`;
    case "beat":
      return `beat: ${cue.cue.who} ${cue.cue.action}`;
  }
}

export interface CompiledFilm {
  scenes: CompiledScene[];
  shots: CompiledShot[];
  cues: Cue[];
  duration: number;
}

const sceneDuration = (def: SceneDef) => def.shots.reduce((total, shot) => total + shot.duration, 0);

/** Lay the scenes end to end on one clock. Pure. */
export function compileFilm(defs: readonly SceneDef[] = SCENES): CompiledFilm {
  const scenes: CompiledScene[] = [];
  const shots: CompiledShot[] = [];
  const cues: Cue[] = [];
  let cursor = 0;

  defs.forEach((def, sceneIndex) => {
    const duration = sceneDuration(def);
    const start = cursor;
    const firstShot = shots.length;
    let shotStart = start;
    for (const shotDef of def.shots) {
      shots.push({
        def: shotDef,
        sceneId: def.id,
        sceneIndex,
        index: shots.length,
        start: shotStart,
        end: shotStart + shotDef.duration,
        authored: shotDef.from !== undefined || shotDef.to !== undefined
      });
      shotStart += shotDef.duration;
    }
    scenes.push({ def, index: sceneIndex, start, end: start + duration, duration, firstShot, lastShot: shots.length - 1 });

    for (const cue of def.audio) cues.push({ kind: "audio", at: start + cue.at, sceneId: def.id, cue });
    for (const cue of def.shlokas) cues.push({ kind: "shloka", at: start + (cue.speakerAt ?? cue.at), sceneId: def.id, cue });
    for (const cue of def.titles) cues.push({ kind: "title", at: start + cue.at, sceneId: def.id, cue });
    for (const cue of def.beats) cues.push({ kind: "beat", at: start + cue.at, sceneId: def.id, cue });
    cursor += duration;
  });

  cues.sort((a, b) => a.at - b.at);
  return { scenes, shots, cues, duration: cursor };
}

function indexAt(items: readonly { start: number }[], time: number) {
  let low = 0;
  let high = items.length - 1;
  while (low < high) {
    const mid = (low + high + 1) >> 1;
    if (items[mid].start <= time) low = mid;
    else high = mid - 1;
  }
  return low;
}

export const sceneIndexAt = (film: CompiledFilm, time: number) => indexAt(film.scenes, time);
export const shotIndexAt = (film: CompiledFilm, time: number) => indexAt(film.shots, time);

export interface ActorBeat {
  action: BeatDef["action"];
  since: number;
  at: number;
}

const beatsByActor = new WeakMap<CompiledFilm, Map<string, { at: number; sceneIndex: number; cue: BeatDef }[]>>();

/**
 * What an actor is doing at film time t: the last beat for them, at or before t, in the current scene. A pure
 * function of time, so any seek or scrub lands in the right pose.
 */
export function actorBeatAt(film: CompiledFilm, who: ActorId, time: number): ActorBeat | null {
  let index = beatsByActor.get(film);
  if (!index) {
    index = new Map();
    for (const cue of film.cues) {
      if (cue.kind !== "beat") continue;
      const list = index.get(cue.cue.who) ?? [];
      list.push({ at: cue.at, sceneIndex: sceneIndexAt(film, cue.at), cue: cue.cue });
      index.set(cue.cue.who, list);
    }
    beatsByActor.set(film, index);
  }
  const list = index.get(who);
  if (!list) return null;
  const scene = sceneIndexAt(film, time);
  let found: (typeof list)[number] | null = null;
  for (const beat of list) {
    if (beat.at > time) break;
    if (beat.sceneIndex === scene) found = beat;
  }
  return found ? { action: found.cue.action, since: time - found.at, at: found.at } : null;
}

// ---------------------------------------------------------------------------------------------------------------
// The master timeline. Every move is a fromTo with explicit start values, so seeking anywhere, in any order, gives
// exactly the same picture.
// ---------------------------------------------------------------------------------------------------------------

const DEFAULT_POSE: CameraPose = { position: [0, 1.6, 6], target: [0, 1.2, 0], focal: 40, focus: 6 };

const poseVars = (pose: CameraPose) => ({
  px: pose.position[0],
  py: pose.position[1],
  pz: pose.position[2],
  tx: pose.target[0],
  ty: pose.target[1],
  tz: pose.target[2],
  focal: pose.focal,
  focus: pose.focus,
  roll: pose.roll ?? 0,
  shake: pose.shake ?? 0
});

const linear = (hex: number): RGB => {
  const color = new Color(hex);
  return { r: color.r, g: color.g, b: color.b };
};

/** A mood's colours, pre-converted to linear, plus its scalars. */
function moodVars(mood: MoodDef) {
  return {
    skyTop: linear(mood.skyTop),
    skyHorizon: linear(mood.skyHorizon),
    lamp: linear(mood.lamp),
    tint: linear(mood.tint),
    fog: linear(mood.fog),
    water: linear(mood.water),
    scalars: {
      lampX: mood.lampX,
      lampY: mood.lampY,
      lampSize: mood.lampSize,
      fogDensity: mood.fogDensity,
      stars: mood.stars,
      clouds: mood.clouds,
      exposure: mood.exposure,
      bloom: mood.bloom,
      vignette: mood.vignette
    }
  };
}

export function buildMasterTimeline(film: CompiledFilm, state: FilmState) {
  const timeline = gsap.timeline({ paused: true, autoRemoveChildren: false, defaults: { ease: "none" } });

  // ---- camera: one tween per shot, tiling the film
  let pose = DEFAULT_POSE;
  for (const shot of film.shots) {
    const from = shot.def.from ?? pose;
    const to = shot.def.to ?? from;
    timeline.fromTo(
      state.cam,
      poseVars(from),
      { ...poseVars(to), duration: shot.def.duration, ease: shot.def.ease ?? "sine.inOut", immediateRender: false },
      shot.start
    );
    pose = to;
  }

  // ---- mood: blend between looks
  let previous: ReturnType<typeof moodVars> | undefined;
  for (const scene of film.scenes) {
    for (const key of scene.def.mood) {
      const to = moodVars(MOODS[key.mood]);
      const from = previous ?? to;
      const at = scene.start + key.at;
      const options = { duration: key.blend, ease: "sine.inOut", immediateRender: false };
      for (const channel of ["skyTop", "skyHorizon", "lamp", "tint", "fog", "water"] as const) {
        timeline.fromTo(state.mood[channel], from[channel], { ...to[channel], ...options }, at);
      }
      timeline.fromTo(state.mood, from.scalars, { ...to.scalars, ...options }, at);
      previous = to;
    }
  }

  // ---- fade to black
  let fade = 1;
  for (const scene of film.scenes) {
    for (const key of scene.def.fade) {
      timeline.fromTo(
        state.fx,
        { fade: key.duration === 0 ? key.to : fade },
        { fade: key.to, duration: key.duration, ease: "sine.inOut", immediateRender: false },
        scene.start + key.at
      );
      fade = key.to;
    }
  }

  // ---- effects (magic, cosmos, bokeh) and the world clock
  const fx = { magic: 0, cosmos: 0, bokeh: 1.4 };
  const world = { timeScale: 1, muffle: 0, wind: 0.25 };
  const track = <T extends object>(
    keys: readonly (T & { at: number; duration: number })[],
    carry: Record<string, number>,
    targetObject: object,
    at: number
  ) => {
    for (const key of keys) {
      const from: Record<string, number> = {};
      const to: Record<string, number> = {};
      for (const prop of Object.keys(carry)) {
        const next = (key as Record<string, number | undefined>)[prop];
        if (next === undefined) continue;
        from[prop] = key.duration === 0 ? next : carry[prop];
        to[prop] = next;
        carry[prop] = next;
      }
      if (Object.keys(to).length === 0) continue;
      timeline.fromTo(targetObject, from, { ...to, duration: key.duration, ease: "sine.inOut", immediateRender: false }, at + key.at);
    }
  };
  for (const scene of film.scenes) {
    track(scene.def.fx, fx, state.fx, scene.start);
    track(scene.def.world, world, state.world, scene.start);
  }

  // ---- actors: where Krishna stands, how big he is, whether he is here at all
  const carried: Record<ActorId, Record<string, number>> = {
    bal: { x: 0, y: 0, z: 0, scale: 1, facing: 0, opacity: 0, lookAtPointer: 1 },
    kishore: { x: 0, y: 0, z: 0, scale: 1, facing: 0, opacity: 0, lookAtPointer: 1 }
  };
  for (const scene of film.scenes) {
    for (const key of scene.def.actors) {
      const at = scene.start + key.at;
      const state0 = carried[key.who];
      if (key.set) {
        const from = { ...key.set } as Record<string, number>;
        timeline.fromTo(state.actors[key.who], from, { ...from, duration: 0.001, immediateRender: false }, at);
        Object.assign(state0, key.set);
      }
      if (key.to) {
        const from: Record<string, number> = {};
        const to: Record<string, number> = {};
        for (const [prop, value] of Object.entries(key.to)) {
          from[prop] = state0[prop] ?? 0;
          to[prop] = value as number;
          state0[prop] = value as number;
        }
        timeline.fromTo(
          state.actors[key.who],
          from,
          { ...to, duration: key.duration ?? 1, ease: key.ease ?? "sine.inOut", immediateRender: false },
          at
        );
      }
    }
  }

  // Prime: fromTo tweens with immediateRender off do nothing until the playhead moves, so render to the end and back.
  timeline.time(timeline.duration(), true);
  timeline.time(0, true);
  return timeline;
}
