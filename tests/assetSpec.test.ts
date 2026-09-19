import { describe, expect, it } from "vitest";
import { SCENES } from "@/data/cinematicTimeline";
import { SHLOKA_IDS } from "@/data/shlokas";
import spec from "@/data/assetSpec.json";

type Character = { requiredClips: string[]; requiredMorphTargets?: string[]; template?: string; file: string; mobileFile: string };
const characters = spec.characters as Record<string, Character>;
const templates = spec.templates as Record<string, { requiredMorphTargets: string[] }>;
const actionClips = spec.actionClips as Record<string, string>;

describe("asset spec", () => {
  it("places both Krishnas where the loader expects them", () => {
    expect(characters.bal.file).toBe("models/krishna/bal-krishna.glb");
    expect(characters.kishore.file).toBe("models/krishna/kishore-krishna.glb");
  });

  it("gives Bal and Kishore identical rigs (the transformation depends on it)", () => {
    expect(characters.bal.template).toBe("krishna");
    expect(characters.kishore.template).toBe("krishna");
  });

  it("supplies a clip or morph for every character action the timeline uses", () => {
    for (const scene of SCENES) {
      for (const beat of scene.beats) {
        const target = actionClips[beat.action];
        expect(target, `${beat.action} has no clip mapping`).toBeTruthy();
        const character = characters[beat.actor];
        if (target.startsWith("morph:")) {
          const morphs = character.requiredMorphTargets ?? (character.template ? templates[character.template].requiredMorphTargets : []);
          expect(morphs, `${beat.actor} needs morph ${target}`).toContain(target.slice("morph:".length));
        } else {
          expect(character.requiredClips, `${scene.id}: ${beat.actor} needs clip ${target} for ${beat.action}`).toContain(target);
        }
      }
    }
  });

  it("specifies every audio cue the timeline plays, and a recitation for every verse", () => {
    const specified = new Set(Object.keys(spec.audio));
    for (const scene of SCENES) {
      for (const cue of scene.audio) if (cue.id !== "*") expect(specified.has(cue.id), `${scene.id}: ${cue.id} missing from assetSpec.json`).toBe(true);
    }
    for (const id of SHLOKA_IDS) expect(Object.keys(spec.voice), id).toContain(id.toLowerCase());
  });

  it("puts every audio file under the directories the brief lists", () => {
    for (const id of Object.keys(spec.audio)) expect(id).toMatch(/^(ambience|flute|effects|score)\//);
  });
});
