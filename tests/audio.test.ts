import { describe, expect, it } from "vitest";
import { SOUNDS, soundUrl } from "@/data/audioManifest";
import { SCENES } from "@/data/story";
import { clipsAt, planAudio } from "@/lib/audioPlan";
import { compileFilm } from "@/lib/timelineBuilder";

const film = compileFilm();
const clips = planAudio(film);
const scene = (id: string) => film.scenes.find((candidate) => candidate.def.id === id)!;

describe("sound follows film time", () => {
  const durations = new Map<string, number>([
    ["flute/first-note", 6.8],
    ["flute/call-hint", 5],
    ["flute/kishore-theme", 100.5],
    ["flute/bal-motif", 9.8],
    ["ambience/yamuna-night", 26]
  ]);
  const at = (t: number) => clipsAt(clips, t, durations).map((clip) => clip.id).sort();

  it("only plays sounds the manifest knows, and every manifest entry has a file path", () => {
    for (const clip of clips) expect(SOUNDS[clip.id], clip.id).toBeDefined();
    for (const id of Object.keys(SOUNDS)) expect(soundUrl(id)).toMatch(/^\/audio\/.+\.m4a$/);
  });

  it("every scene has something to hear", () => {
    for (const definition of SCENES) expect(definition.audio.length, definition.id).toBeGreaterThan(0);
  });

  it("opens on the river, brings the flute in, and leaves silence for the title", () => {
    const opening = scene("OPENING").start;
    expect(at(opening + 1)).toContain("ambience/yamuna-night");
    expect(at(opening + 13)).toContain("flute/first-note");
    expect(at(opening + 25)).toContain("flute/kishore-theme");
    expect(at(opening + 37)).toEqual([]);
  });

  it("loops the ambience beds and plays the flute straight through", () => {
    for (const clip of clips) expect(clip.loop, clip.id).toBe(clip.id.startsWith("ambience/") && !clip.oneShot);
  });

  it("is a pure function of time: asking out of order changes nothing", () => {
    const times = [40, 3, 200, 14, 300, 3, 120];
    const once = times.map((t) => at(t).join("|"));
    const twice = times.map((t) => at(t).join("|"));
    expect(twice).toEqual(once);
  });

  it("gives the flute scene its own sound, and the cosmos another", () => {
    expect(at(scene("FLUTE").start + 30)).toContain("flute/bal-motif");
    expect(at(scene("DIVINE").start + 10)).toContain("ambience/cosmic-wind");
  });
});
