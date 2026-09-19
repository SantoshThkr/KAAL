import { describe, expect, it } from "vitest";
import { SOUNDS } from "@/data/audioManifest";
import { clipsAt, planAudio } from "@/lib/audioPlan";
import { WALK_SPEED, actorBeatAt, actorTravelAt, compileFilm } from "@/lib/timelineBuilder";

const film = compileFilm();
const clips = planAudio(film);
const intro = film.scenes.find((scene) => scene.def.id === "INTRO")!;
const kishore = film.scenes.find((scene) => scene.def.id === "KISHORE")!;

describe("audio follows film time", () => {
  const durations = new Map<string, number>([
    ["flute/first-note", 6.8],
    ["flute/kishore-theme", 100.5],
    ["ambience/yamuna-night", 26]
  ]);

  it("plans only sounds that exist in the manifest", () => {
    for (const clip of clips) expect(SOUNDS[clip.id], clip.id).toBeDefined();
  });

  it("opens on the river at night, then the one note, then the melody", () => {
    const at = (t: number) => clipsAt(clips, intro.start + t, durations).map((clip) => clip.id).sort();
    expect(at(1)).toEqual(["ambience/yamuna-night"]);
    expect(at(14)).toEqual(["ambience/yamuna-night", "flute/first-note"]);
    expect(at(19.5)).toEqual(["ambience/yamuna-night", "flute/first-note"]);
    expect(at(22)).toEqual(["ambience/yamuna-night", "flute/kishore-theme"]);
  });

  it("silences the melody and the river for the title", () => {
    const ids = clipsAt(clips, intro.start + 31, durations).map((clip) => clip.id);
    expect(ids).not.toContain("flute/kishore-theme");
    expect(ids).not.toContain("ambience/yamuna-night");
  });

  it("is a pure function of time: asking out of order changes nothing", () => {
    const times = [40, 3, 200, 14, 22, 3];
    const first = times.map((t) => clipsAt(clips, t, durations).map((clip) => clip.key).join("|"));
    const again = times.map((t) => clipsAt(clips, t, durations).map((clip) => clip.key).join("|"));
    expect(again).toEqual(first);
  });

  it("loops only the ambience beds", () => {
    for (const clip of clips) expect(clip.loop, clip.id).toBe(clip.id.startsWith("ambience/"));
  });
});

describe("actors follow film time", () => {
  it("finds Krishna's beat by time, and none before his first beat in the scene", () => {
    expect(actorBeatAt(film, "kishore", intro.start + 5)?.action).toBe("IDLE");
    expect(actorBeatAt(film, "kishore", intro.start + 12)?.action).toBe("FLUTE_RAISE");
    expect(actorBeatAt(film, "kishore", intro.start + 20)?.action).toBe("FLUTE_PLAY");
    const birth = film.scenes.find((scene) => scene.def.id === "BIRTH")!;
    expect(actorBeatAt(film, "kishore", birth.start + 5)).toBeNull();
  });

  it("walks Kishore along the bank at a steady pace, scrubbable, and stops on the STOP beat", () => {
    expect(actorTravelAt(film, "kishore", kishore.start + 9)).toBe(0);
    expect(actorTravelAt(film, "kishore", kishore.start + 16)).toBeCloseTo(6 * WALK_SPEED, 6);
    expect(actorTravelAt(film, "kishore", kishore.start + 22)).toBeCloseTo(12 * WALK_SPEED, 6);
    expect(actorTravelAt(film, "kishore", kishore.start + 29)).toBeCloseTo(12 * WALK_SPEED, 6);
  });

  it("the tracking shot behind the walk ends where he stops (walked 10.8 m)", () => {
    expect(12 * WALK_SPEED).toBeCloseTo(10.8, 6);
  });
});
