import gsap from "gsap";
import { Color } from "three";
import {
  SCENES,
  type AudioCueDef,
  type BeatDef,
  type CameraPose,
  type SceneDef,
  type SceneId,
  type ShlokaCueDef,
  type ShotDef,
  type TitleCueDef
} from "@/data/cinematicTimeline";
import { LIGHTING, type LightingPreset } from "@/data/lightingPresets";
import type { FilmState } from "./filmState";

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
  /** Index across the whole film. */
  index: number;
  start: number;
  end: number;
  /** False when no camera path has been authored yet: the shot holds the previous pose. */
  authored: boolean;
}

export type Cue =
  | { kind: "audio"; at: number; sceneId: SceneId; cue: AudioCueDef }
  | { kind: "shloka"; at: number; sceneId: SceneId; cue: ShlokaCueDef }
  | { kind: "title"; at: number; sceneId: SceneId; cue: TitleCueDef }
  | { kind: "beat"; at: number; sceneId: SceneId; cue: BeatDef };

/** One line for the engineering panel: "audio: flute/first-note". */
export function describeCue(cue: Cue): string {
  switch (cue.kind) {
    case "audio":
      return `audio: ${cue.cue.id} (${cue.cue.action})`;
    case "shloka":
      return `shloka: ${cue.cue.id}`;
    case "title":
      return `title: ${cue.cue.text}`;
    case "beat":
      return `beat: ${cue.cue.actor} ${cue.cue.action}`;
  }
}

export interface CompiledFilm {
  scenes: CompiledScene[];
  shots: CompiledShot[];
  /** Every discrete event, sorted by absolute time. */
  cues: Cue[];
  duration: number;
}

const sceneDuration = (def: SceneDef) => def.shots.reduce((total, shot) => total + shot.duration, 0);

/** Lay the declarative scenes end to end on one absolute film clock. Pure. */
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

/** Index of the last item whose start is <= time. `starts` must be ascending. */
function indexAt(starts: readonly { start: number }[], time: number) {
  let low = 0;
  let high = starts.length - 1;
  while (low < high) {
    const mid = (low + high + 1) >> 1;
    if (starts[mid].start <= time) low = mid;
    else high = mid - 1;
  }
  return low;
}

export const sceneIndexAt = (film: CompiledFilm, time: number) => indexAt(film.scenes, time);

export interface ActorBeat {
  action: BeatDef["action"];
  /** Film seconds since the beat began. */
  since: number;
  /** Absolute film time the beat began: a stable identity for "is this the same beat as last frame". */
  at: number;
}

const beatsByActor = new WeakMap<CompiledFilm, Map<string, { at: number; sceneIndex: number; cue: BeatDef }[]>>();

/** Walking pace, metres per second. Krishna walks unhurried. */
export const WALK_SPEED = 0.9;
const TRAVELLING = new Set<BeatDef["action"]>(["WALK", "RUN", "FOLLOW_BUTTERFLY", "MAKHAN_ENTER"]);

/**
 * How far an actor has walked in the current scene by film time t (metres along the way he faces). A pure function of
 * time, like everything else, so the walk is scrubbable and tracking shots can be authored to match it.
 */
export function actorTravelAt(film: CompiledFilm, actor: BeatDef["actor"], time: number): number {
  actorBeatAt(film, actor, time);
  const list = beatsByActor.get(film)?.get(actor);
  if (!list) return 0;
  const scene = sceneIndexAt(film, time);
  let travelled = 0;
  for (let i = 0; i < list.length; i += 1) {
    const beat = list[i];
    if (beat.sceneIndex !== scene || beat.at > time) continue;
    if (!TRAVELLING.has(beat.cue.action)) continue;
    const next = list[i + 1];
    const end = Math.min(time, next && next.sceneIndex === scene ? next.at : Infinity);
    travelled += Math.max(0, end - beat.at) * (beat.cue.action === "RUN" ? WALK_SPEED * 2.4 : WALK_SPEED);
  }
  return travelled;
}

/**
 * What an actor is doing at film time t: the latest beat for that actor at or before t, within the current scene.
 * A pure function of time, so performers land in the right state after any seek or scrub. Null before the scene's
 * first beat for that actor.
 */
export function actorBeatAt(film: CompiledFilm, actor: BeatDef["actor"], time: number): ActorBeat | null {
  let index = beatsByActor.get(film);
  if (!index) {
    index = new Map();
    for (const cue of film.cues) {
      if (cue.kind !== "beat") continue;
      const list = index.get(cue.cue.actor) ?? [];
      list.push({ at: cue.at, sceneIndex: sceneIndexAt(film, cue.at), cue: cue.cue });
      index.set(cue.cue.actor, list);
    }
    beatsByActor.set(film, index);
  }
  const list = index.get(actor);
  if (!list) return null;
  const scene = sceneIndexAt(film, time);
  let found: (typeof list)[number] | null = null;
  for (const beat of list) {
    if (beat.at > time) break;
    if (beat.sceneIndex === scene) found = beat;
  }
  return found ? { action: found.cue.action, since: time - found.at, at: found.at } : null;
}
export const shotIndexAt = (film: CompiledFilm, time: number) => indexAt(film.shots, time);

// ---------------------------------------------------------------------------------------------------------------
// Master timeline. Every move is a fromTo with explicit start values, so seeking to any time, in any order, always
// produces the same state. There are no "to" tweens that depend on where the playhead happened to be.
// ---------------------------------------------------------------------------------------------------------------

const DEFAULT_POSE: CameraPose = { position: [0, 1.6, 4], target: [0, 0.6, -10], focal: 35, focus: 8 };

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

const directional = (block: LightingPreset["key"]) => {
  const color = new Color(block.color);
  return { r: color.r, g: color.g, b: color.b, i: block.intensity, az: block.azimuth, el: block.elevation };
};
const ambientVars = (block: LightingPreset["ambient"]) => {
  const color = new Color(block.color);
  return { r: color.r, g: color.g, b: color.b, i: block.intensity };
};
const fogVars = (block: LightingPreset["fog"]) => {
  const color = new Color(block.color);
  return { r: color.r, g: color.g, b: color.b, d: block.density };
};

export function buildMasterTimeline(film: CompiledFilm, state: FilmState) {
  const timeline = gsap.timeline({ paused: true, autoRemoveChildren: false, defaults: { ease: "none" } });

  // Camera: one tween per shot, tiling the film.
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

  // Lighting: crossfade from the previous preset at every key.
  let previous: LightingPreset | undefined;
  for (const scene of film.scenes) {
    for (const key of scene.def.lighting) {
      const to = LIGHTING[key.preset];
      const from = previous ?? to;
      const at = scene.start + key.at;
      const options = { duration: key.blend, ease: "sine.inOut", immediateRender: false };
      timeline.fromTo(state.light.ambient, ambientVars(from.ambient), { ...ambientVars(to.ambient), ...options }, at);
      timeline.fromTo(state.light.key, directional(from.key), { ...directional(to.key), ...options }, at);
      timeline.fromTo(state.light.rim, directional(from.rim), { ...directional(to.rim), ...options }, at);
      timeline.fromTo(state.light.fog, fogVars(from.fog), { ...fogVars(to.fog), ...options }, at);
      timeline.fromTo(
        state.light,
        { exposure: from.exposure, bloom: from.bloom },
        { exposure: to.exposure, bloom: to.bloom, ...options },
        at
      );
      previous = to;
    }
  }

  // Fade to black (a real cut to black is duration ~0).
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

  // World time, audio muffle and wind. Each property is tracked separately so a key may set only some of them.
  const world = { timeScale: 1, muffle: 0, wind: 0.2 };
  for (const scene of film.scenes) {
    for (const key of scene.def.world) {
      const from: Partial<typeof world> = {};
      const to: Partial<typeof world> = {};
      for (const prop of ["timeScale", "muffle", "wind"] as const) {
        const next = key[prop];
        if (next === undefined) continue;
        from[prop] = key.duration === 0 ? next : world[prop];
        to[prop] = next;
        world[prop] = next;
      }
      if (Object.keys(to).length === 0) continue;
      timeline.fromTo(
        state.world,
        from,
        { ...to, duration: key.duration, ease: "sine.inOut", immediateRender: false },
        scene.start + key.at
      );
    }
  }

  // Prime: fromTo tweens with immediateRender off do nothing until the playhead moves, so render to the end and back.
  // Afterwards every property holds its film-start value, even before the first frame plays.
  timeline.time(timeline.duration(), true);
  timeline.time(0, true);

  return timeline;
}
