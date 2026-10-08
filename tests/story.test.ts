import { describe, expect, it } from "vitest";
import { KRISHNA_PARTS } from "@/art/krishnaArt";
import { WORLD_PARTS } from "@/art/worldArt";
import { MOODS } from "@/data/moods";
import { SCENES, SCENE_IDS, SCENE_KEYS } from "@/data/story";
import { SHLOKA_IDS } from "@/data/shlokas";
import { createFilmState, type FilmState } from "@/lib/filmState";
import { actorBeatAt, buildMasterTimeline, compileFilm, sceneIndexAt, shotIndexAt } from "@/lib/timelineBuilder";

const film = compileFilm();
const EPS = 1e-6;

describe("the story", () => {
  it("is the eight scenes, in order", () => {
    expect(SCENES.map((scene) => scene.id)).toEqual([...SCENE_IDS]);
    expect(SCENE_IDS).toEqual(["OPENING", "BAL", "VRINDAVAN", "FLUTE", "TRANSFORMATION", "KISHORE", "DIVINE", "SILENCE"]);
  });

  it("runs four to seven minutes", () => {
    expect(film.duration).toBeGreaterThan(4 * 60);
    expect(film.duration).toBeLessThan(7 * 60);
  });

  it("lays scenes end to end, with shots tiling each one", () => {
    let cursor = 0;
    for (const scene of film.scenes) {
      expect(scene.start).toBeCloseTo(cursor, 9);
      const shots = film.shots.slice(scene.firstShot, scene.lastShot + 1);
      expect(shots[0].start).toBeCloseTo(scene.start, 9);
      expect(shots[shots.length - 1].end).toBeCloseTo(scene.end, 9);
      for (let i = 1; i < shots.length; i += 1) expect(shots[i].start).toBeCloseTo(shots[i - 1].end, 9);
      cursor = scene.end;
    }
    expect(film.duration).toBeCloseTo(cursor, 9);
  });

  it("gives every scene a key, a mood from the first frame, and shots that say what they are for", () => {
    expect(Object.keys(SCENE_KEYS).sort()).toEqual(["1", "2", "3", "4", "5", "6", "7", "8"]);
    for (const scene of SCENES) {
      expect(scene.mood[0]?.at, scene.id).toBe(0);
      for (const key of scene.mood) expect(MOODS[key.mood], `${scene.id}: ${key.mood}`).toBeDefined();
      for (const shot of scene.shots) expect(shot.intent.length, `${scene.id}/${shot.id}`).toBeGreaterThan(12);
    }
  });

  it("keeps every cue inside its own scene", () => {
    for (const scene of film.scenes) {
      const length = scene.duration;
      for (const list of [scene.def.audio, scene.def.beats, scene.def.titles, scene.def.actors]) {
        for (const item of list) {
          expect(item.at, scene.def.id).toBeGreaterThanOrEqual(0);
          expect(item.at, scene.def.id).toBeLessThanOrEqual(length + EPS);
        }
      }
      for (const title of scene.def.titles) expect(title.at + title.duration).toBeLessThanOrEqual(length + EPS);
      for (const verse of scene.def.shlokas) expect(verse.end).toBeLessThanOrEqual(length + EPS);
    }
  });

  it("uses five of the seven verses, each once, revealed line by line then explained", () => {
    const used = film.cues.filter((cue) => cue.kind === "shloka").map((cue) => (cue.kind === "shloka" ? cue.cue.id : ""));
    expect(used).toEqual(["BG-4-7", "BG-2-47", "BG-2-23", "BG-11-32", "BG-18-66"]);
    expect(new Set(used).size).toBe(used.length);
    for (const id of used) expect(SHLOKA_IDS).toContain(id);
    for (const scene of SCENES) {
      for (const verse of scene.shlokas) {
        expect(verse.padaGap).toBeGreaterThan(1.5);
        expect(verse.at + 3 * verse.padaGap, `${verse.id}: all four lines before the meaning`).toBeLessThan(verse.meaningAt);
        expect(verse.meaningAt).toBeLessThan(verse.end);
      }
    }
  });

  it("keeps Krishna on screen: someone is visible for almost the whole film", () => {
    const state = createFilmState();
    const timeline = buildMasterTimeline(film, state);
    let visible = 0;
    const step = 0.5;
    for (let t = 0; t < film.duration; t += step) {
      timeline.time(t, true);
      if (state.actors.bal.opacity > 0.05 || state.actors.kishore.opacity > 0.05) visible += step;
    }
    timeline.kill();
    expect(visible / film.duration).toBeGreaterThan(0.8);
  });

  it("never leaves both Krishnas on screen at once except during the transformation", () => {
    const state = createFilmState();
    const timeline = buildMasterTimeline(film, state);
    for (let t = 0; t < film.duration; t += 0.5) {
      timeline.time(t, true);
      const both = state.actors.bal.opacity > 0.08 && state.actors.kishore.opacity > 0.08;
      if (!both) continue;
      const scene = film.scenes[sceneIndexAt(film, t)];
      expect(scene.def.id, `both visible at ${t.toFixed(1)}s`).toBe("TRANSFORMATION");
    }
    timeline.kill();
  });

  it("finds what Krishna is doing at any moment, by time alone", () => {
    const opening = film.scenes[0];
    expect(actorBeatAt(film, "bal", opening.start + 16)?.action).toBe("wonder");
    expect(actorBeatAt(film, "bal", opening.start + 21)?.action).toBe("wave");
    expect(actorBeatAt(film, "bal", opening.start + 2)).toBeNull();
    const flute = film.scenes.find((scene) => scene.def.id === "FLUTE")!;
    expect(actorBeatAt(film, "bal", flute.start + 20)?.action).toBe("flute");
  });

  it("looks up the scene and shot for any time", () => {
    expect(sceneIndexAt(film, 0)).toBe(0);
    expect(sceneIndexAt(film, film.duration)).toBe(film.scenes.length - 1);
    for (const shot of film.shots) expect(shotIndexAt(film, shot.start + 0.001)).toBe(shot.index);
  });
});

// ---------------------------------------------------------------------------------------------------------------

type Json = number | string | boolean | null | Json[] | { [key: string]: Json };
const plain = (value: unknown): Json => {
  if (typeof value === "number") return +value.toFixed(6);
  if (typeof value === "string" || typeof value === "boolean") return value;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !key.startsWith("_"))
        .map(([key, inner]) => [key, plain(inner)])
    );
  }
  return null;
};

const sample = (times: number[]) => {
  const state = createFilmState();
  const timeline = buildMasterTimeline(film, state);
  const out = new Map<number, string>();
  for (const time of times) {
    timeline.time(time, true);
    out.set(time, JSON.stringify(plain({ cam: state.cam, mood: state.mood, fx: state.fx, actors: state.actors, world: state.world } as unknown as FilmState)));
  }
  timeline.kill();
  return out;
};

describe("the master timeline", () => {
  let seed = 11;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  const times = Array.from({ length: 120 }, () => random() * film.duration).concat([0, film.duration]);

  it("is path-independent: any seek order gives the same picture", () => {
    const forward = sample([...times].sort((a, b) => a - b));
    const shuffled = sample(times);
    const backward = sample([...times].sort((a, b) => b - a));
    for (const time of times) {
      expect(shuffled.get(time), `shuffled @${time.toFixed(2)}`).toBe(forward.get(time));
      expect(backward.get(time), `backward @${time.toFixed(2)}`).toBe(forward.get(time));
    }
  });

  it("opens black, shows the film, and ends black", () => {
    const state = createFilmState();
    const timeline = buildMasterTimeline(film, state);
    timeline.time(0, true);
    expect(state.fx.fade).toBe(1);
    timeline.time(14, true);
    expect(state.fx.fade).toBeCloseTo(0, 5);
    timeline.time(film.duration, true);
    expect(state.fx.fade).toBeCloseTo(1, 5);
    timeline.kill();
  });

  it("turns the sky from night to morning and back to night", () => {
    const state = createFilmState();
    const timeline = buildMasterTimeline(film, state);
    const luminance = () => 0.2126 * state.mood.skyHorizon.r + 0.7152 * state.mood.skyHorizon.g + 0.0722 * state.mood.skyHorizon.b;
    timeline.time(5, true);
    const night = luminance();
    timeline.time(film.scenes[1].start + 20, true);
    const morning = luminance();
    timeline.time(film.duration - 10, true);
    const ending = luminance();
    timeline.kill();
    expect(morning).toBeGreaterThan(night * 4);
    expect(ending).toBeLessThan(morning * 0.5);
  });

  it("opens the cosmos only in the divine scene", () => {
    const state = createFilmState();
    const timeline = buildMasterTimeline(film, state);
    const divine = film.scenes.find((scene) => scene.def.id === "DIVINE")!;
    timeline.time(divine.start - 5, true);
    expect(state.fx.cosmos).toBeLessThan(0.1);
    timeline.time(divine.start + 30, true);
    expect(state.fx.cosmos).toBeGreaterThan(0.6);
    timeline.time(film.duration - 5, true);
    expect(state.fx.cosmos).toBeLessThan(0.15);
    timeline.kill();
  });
});

describe("the art", () => {
  const all = [...KRISHNA_PARTS, ...WORLD_PARTS];

  it("draws every part as self-contained SVG with a sane pivot", () => {
    for (const part of all) {
      expect(part.svg.startsWith("<svg"), part.id).toBe(true);
      expect(part.svg.trimEnd().endsWith("</svg>"), part.id).toBe(true);
      expect(part.svg).toContain(`viewBox="0 0 ${part.w} ${part.h}"`);
      expect(part.pivot[0], part.id).toBeGreaterThanOrEqual(0);
      expect(part.pivot[0], part.id).toBeLessThanOrEqual(part.w);
      expect(part.pivot[1], part.id).toBeGreaterThanOrEqual(0);
      expect(part.pivot[1], part.id).toBeLessThanOrEqual(part.h);
    }
  });

  it("has no duplicate part ids, and no unresolved template holes", () => {
    const ids = all.map((part) => part.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const part of all) expect(part.svg, part.id).not.toContain("undefined");
  });

  it("gives Krishna everything that makes him recognisable", () => {
    const ids = KRISHNA_PARTS.map((part) => part.id);
    for (const required of ["head", "hairFront", "crown", "eyeWhite", "iris", "mouthSmile", "torso", "dhoti", "flute"]) {
      expect(ids, required).toContain(required);
    }
    // The crown carries the peacock feather, and the skin is Krishna blue.
    const crown = KRISHNA_PARTS.find((part) => part.id === "crown")!;
    expect(crown.svg).toContain("#1FA398");
    const head = KRISHNA_PARTS.find((part) => part.id === "head")!;
    expect(head.svg.toUpperCase()).toContain("#6A8FE0");
  });
});
