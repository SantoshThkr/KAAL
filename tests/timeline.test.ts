import { describe, expect, it } from "vitest";
import { DEBUG_KEY_SCENES, SCENES, SCENE_IDS, type FadeKey, type LightingKey, type WorldKey } from "@/data/cinematicTimeline";
import { LIGHTING } from "@/data/lightingPresets";
import { SHLOKA_IDS } from "@/data/shlokas";
import { createFilmState, type FilmState } from "@/lib/filmState";
import { buildMasterTimeline, compileFilm, sceneIndexAt, shotIndexAt } from "@/lib/timelineBuilder";

const film = compileFilm();
const EPS = 1e-6;

describe("cinematic timeline data", () => {
  it("has the thirteen chapters, in the story's order", () => {
    expect(SCENES.map((scene) => scene.id)).toEqual([...SCENE_IDS]);
    expect(SCENE_IDS).toEqual([
      "INTRO", "BIRTH", "BAL_KRISHNA", "VRINDAVAN", "FLUTE", "TIME_PASSAGE", "TRANSFORMATION",
      "KISHORE", "KURUKSHETRA", "GITA", "VISHWAROOPA", "RETURN", "FINAL"
    ]);
  });

  it("lays scenes end to end with no gaps, and shots tile every scene", () => {
    let cursor = 0;
    for (const scene of film.scenes) {
      expect(scene.start).toBeCloseTo(cursor, 9);
      expect(scene.duration).toBeGreaterThan(0);
      const shots = film.shots.slice(scene.firstShot, scene.lastShot + 1);
      expect(shots[0].start).toBeCloseTo(scene.start, 9);
      expect(shots[shots.length - 1].end).toBeCloseTo(scene.end, 9);
      for (let index = 1; index < shots.length; index += 1) expect(shots[index].start).toBeCloseTo(shots[index - 1].end, 9);
      cursor = scene.end;
    }
    expect(film.duration).toBeCloseTo(cursor, 9);
  });

  it("runs about five to eight minutes at 1x", () => {
    expect(film.duration).toBeGreaterThanOrEqual(5 * 60);
    expect(film.duration).toBeLessThanOrEqual(8.5 * 60);
  });

  it("maps the debug keys exactly as specified: 1-9 and 0", () => {
    expect(DEBUG_KEY_SCENES).toEqual({
      "1": "INTRO", "2": "BAL_KRISHNA", "3": "VRINDAVAN", "4": "FLUTE", "5": "TRANSFORMATION",
      "6": "KISHORE", "7": "KURUKSHETRA", "8": "GITA", "9": "VISHWAROOPA", "0": "FINAL"
    });
  });

  it("every shot says what it tells", () => {
    for (const shot of film.shots) expect(shot.def.intent.trim().length, shot.def.id).toBeGreaterThan(10);
  });

  it("keeps every timed item inside its scene, in order", () => {
    for (const scene of film.scenes) {
      const { def, duration } = scene;
      const ordered = (items: readonly { at: number }[]) => items.every((item, index) => index === 0 || item.at >= items[index - 1].at);
      const all = [...def.audio, ...def.beats, ...def.titles, ...def.lighting, ...def.fade, ...def.world];
      for (const item of all) {
        expect(item.at, `${def.id} item at ${item.at}`).toBeGreaterThanOrEqual(0);
        expect(item.at, `${def.id} item at ${item.at}`).toBeLessThanOrEqual(duration);
      }
      for (const list of [def.lighting, def.fade, def.world, def.beats]) expect(ordered(list), def.id).toBe(true);
    }
  });

  it("never lets two blends on the same property overlap (that would make scrubbing order-dependent)", () => {
    const clean = (keys: readonly (LightingKey | FadeKey | WorldKey)[], duration: (key: LightingKey | FadeKey | WorldKey) => number, id: string) => {
      keys.forEach((key, index) => {
        const next = keys[index + 1];
        if (next) expect(key.at + duration(key), `${id} @${key.at}`).toBeLessThanOrEqual(next.at + EPS);
      });
    };
    for (const scene of film.scenes) {
      const { def, duration } = scene;
      clean(def.lighting, (key) => (key as LightingKey).blend, `${def.id} lighting`);
      clean(def.fade, (key) => (key as FadeKey).duration, `${def.id} fade`);
      clean(def.world, (key) => (key as WorldKey).duration, `${def.id} world`);
      for (const key of def.lighting) expect(key.at + key.blend, `${def.id} lighting finishes inside its scene`).toBeLessThanOrEqual(duration + EPS);
      for (const key of def.fade) expect(key.at + key.duration).toBeLessThanOrEqual(duration + EPS);
      for (const key of def.world) expect(key.at + key.duration).toBeLessThanOrEqual(duration + EPS);
      for (const title of def.titles) expect(title.at + title.duration, `${def.id} title "${title.text}" ends inside its scene`).toBeLessThanOrEqual(duration + EPS);
      expect(def.lighting[0]?.at, `${def.id} starts with a lighting key`).toBe(0);
    }
  });

  it("uses every one of the seven verses exactly once, in narrative order", () => {
    const used = film.cues.filter((cue) => cue.kind === "shloka").map((cue) => (cue.kind === "shloka" ? cue.cue.id : ""));
    expect([...used].sort()).toEqual([...SHLOKA_IDS].sort());
    expect(used).toEqual(["BG-4-7", "BG-2-47", "BG-2-23", "BG-9-22", "BG-15-7", "BG-11-32", "BG-18-66"]);
  });

  it("reveals each verse line by line, then its meaning, all inside the scene", () => {
    for (const scene of film.scenes) {
      for (const cue of scene.def.shlokas) {
        const lastPada = cue.at + 3 * cue.padaGap;
        expect(cue.padaGap, cue.id).toBeGreaterThan(1);
        expect(lastPada, `${cue.id}: all four pādas shown before the meaning`).toBeLessThan(cue.meaningAt);
        expect(cue.meaningAt, cue.id).toBeLessThan(cue.end);
        expect(cue.end, `${cue.id} ends inside ${scene.def.id}`).toBeLessThanOrEqual(scene.duration + EPS);
        if (cue.speakerAt !== undefined) expect(cue.speakerAt).toBeLessThan(cue.at);
      }
    }
  });

  it("puts the 2.23 pādas on the four element cuts: weapon, fire, water, wind", () => {
    const scene = film.scenes.find((candidate) => candidate.def.id === "KURUKSHETRA");
    const cue = scene?.def.shlokas.find((candidate) => candidate.id === "BG-2-23");
    expect(scene && cue).toBeTruthy();
    if (!scene || !cue) return;
    const elements = film.shots.slice(scene.firstShot, scene.lastShot + 1).filter((shot) => ["weapon_strike", "fire", "water", "wind"].includes(shot.def.id));
    expect(elements.length).toBe(4);
    elements.forEach((shot, index) => {
      expect(cue.at + index * cue.padaGap).toBeCloseTo(shot.start - scene.start, 6);
      expect(shot.def.cut).toBe(true);
    });
  });

  it("looks up the scene and shot for any time", () => {
    expect(sceneIndexAt(film, 0)).toBe(0);
    expect(sceneIndexAt(film, film.duration)).toBe(film.scenes.length - 1);
    for (const scene of film.scenes) {
      expect(sceneIndexAt(film, scene.start)).toBe(scene.index);
      expect(sceneIndexAt(film, scene.end - 0.001)).toBe(scene.index);
    }
    for (const shot of film.shots) expect(shotIndexAt(film, shot.start + 0.0005)).toBe(shot.index);
  });
});

// ---------------------------------------------------------------------------------------------------------------

type Json = number | string | boolean | null | Json[] | { [key: string]: Json };
const closeTo = (a: Json, b: Json, path = "state"): void => {
  if (typeof a === "number" && typeof b === "number") {
    expect(Math.abs(a - b), `${path}: ${a} vs ${b}`).toBeLessThan(1e-9);
  } else if (a && b && typeof a === "object" && typeof b === "object") {
    for (const key of Object.keys(a)) closeTo((a as Record<string, Json>)[key], (b as Record<string, Json>)[key], `${path}.${key}`);
  } else {
    expect(a, path).toEqual(b);
  }
};

/** Numbers only. GSAP hangs a `_gsap` bookkeeping object (with functions) on everything it tweens. */
const plain = (value: unknown): Json => {
  if (typeof value === "number") return value;
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).filter(([key]) => !key.startsWith("_")).map(([key, inner]) => [key, plain(inner)]));
  }
  return null;
};

function sample(times: number[]) {
  const state = createFilmState();
  const timeline = buildMasterTimeline(film, state);
  const results = new Map<number, FilmState>();
  for (const time of times) {
    timeline.time(time, true);
    results.set(time, plain({ cam: state.cam, light: state.light, fx: state.fx, world: state.world }) as unknown as FilmState);
  }
  timeline.kill();
  return results;
}

const at = (time: number) => sample([time]).get(time) as FilmState;

describe("master timeline", () => {
  // Deterministic pseudo-random times so a failure reproduces.
  let seed = 7;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  const times = Array.from({ length: 160 }, () => random() * film.duration).concat([0, film.duration]);

  it("is path-independent: any seek order gives the same state as playing forward", () => {
    const forward = sample([...times].sort((a, b) => a - b));
    const shuffled = sample(times);
    const backward = sample([...times].sort((a, b) => b - a));
    for (const time of times) {
      closeTo(shuffled.get(time) as unknown as Json, forward.get(time) as unknown as Json, `shuffled@${time.toFixed(2)}`);
      closeTo(backward.get(time) as unknown as Json, forward.get(time) as unknown as Json, `backward@${time.toFixed(2)}`);
    }
  });

  it("opens black, shows the picture, cuts to black for the titles, and ends black", () => {
    const intro = film.scenes[0];
    const last = film.scenes[film.scenes.length - 1];
    expect(at(0).fx.fade).toBe(1);
    expect(at(intro.start + 3).fx.fade).toBe(1);
    expect(at(intro.start + 12).fx.fade).toBeCloseTo(0, 6);
    expect(at(intro.start + 30.5).fx.fade).toBe(1);
    expect(at(intro.end).fx.fade).toBe(1);
    expect(at(film.duration).fx.fade).toBe(1);
    expect(at(last.start + 20).fx.fade).toBeCloseTo(0, 6);
  });

  it("pauses the world when the flute sounds in Act I, and releases it after", () => {
    expect(at(10).world.timeScale).toBe(1);
    expect(at(15).world.timeScale).toBeCloseTo(0.04, 6);
    expect(at(22).world.timeScale).toBeCloseTo(1, 6);
    const birth = film.scenes[1];
    expect(at(birth.start + 1).world.timeScale).toBe(1);
  });

  it("freezes the world at the end of childhood while Krishna's own clock is separate", () => {
    const bal = film.scenes[2];
    expect(at(bal.start + 30).world.timeScale).toBe(1);
    expect(at(bal.start + 70).world.timeScale).toBeCloseTo(0.08, 6);
    expect(at(bal.start + 70).world.muffle).toBeCloseTo(0.6, 6);
  });

  it("time-lapses the world during the passage of time", () => {
    const passage = film.scenes[5];
    expect(at(passage.start + 10).world.timeScale).toBeCloseTo(8, 6);
    expect(at(passage.end).world.timeScale).toBeCloseTo(1, 6);
  });

  it("settles on each scene's lighting preset once its blend is done", () => {
    const expectKey = (sceneIndex: number, offset: number, preset: keyof typeof LIGHTING) =>
      expect(at(film.scenes[sceneIndex].start + offset).light.key.i, `${film.scenes[sceneIndex].def.id}`).toBeCloseTo(LIGHTING[preset].key.intensity, 6);
    expectKey(0, 10, "nightMoon");
    expectKey(1, 5, "stormNight");
    expectKey(2, 30, "dawn");
    expectKey(3, 10, "goldenHour");
    expectKey(8, 10, "dusty");
    expectKey(9, 10, "dramatic");
    expectKey(10, 10, "cosmic");
    expectKey(11, 8, "void");
    expectKey(12, 20, "finalRim");
  });

  it("never jumps the lighting between scenes (only blends), except in a cut from black", () => {
    for (const scene of film.scenes.slice(1)) {
      if (at(scene.start).fx.fade === 1) continue;
      const before = at(scene.start - 1e-4).light.key.i;
      const after = at(scene.start + 1e-4).light.key.i;
      expect(Math.abs(after - before), scene.def.id).toBeLessThan(0.01);
    }
  });

  it("finds Krishna within the first 15 seconds: the Act I camera glides from the moon on the water to him", () => {
    const intro = film.scenes[0];
    const shots = film.shots.slice(intro.firstShot, intro.lastShot + 1);
    for (let index = 1; index < shots.length; index += 1) {
      const shot = shots[index];
      if (shot.def.cut) continue;
      const before = at(shot.start - 1e-4).cam;
      const after = at(shot.start + 1e-4).cam;
      for (const field of ["px", "py", "pz", "tx", "ty", "tz", "focal", "focus"] as const) {
        expect(Math.abs(before[field] - after[field]), `${shot.def.id}.${field}`).toBeLessThan(0.05);
      }
    }
    const reveal = shots.find((shot) => shot.def.id === "reveal_krishna");
    expect(reveal && reveal.end).toBeLessThanOrEqual(intro.start + 20);
    const kishoreBeats = film.cues.filter((cue) => cue.kind === "beat" && cue.sceneId === "INTRO" && cue.cue.actor === "kishore");
    expect(kishoreBeats.length).toBeGreaterThan(0);
    expect(kishoreBeats.some((cue) => cue.kind === "beat" && cue.cue.action === "FLUTE_PLAY" && cue.at < 15)).toBe(true);
  });
});
