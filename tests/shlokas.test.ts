import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { SHLOKAS, SHLOKA_BY_ID, SHLOKA_IDS, sanskritText } from "@/data/shlokas";

const DEVANAGARI = /[ऀ-ॿ]/;

describe("shloka data", () => {
  it("contains exactly the seven verses from the brief", () => {
    expect(SHLOKAS.map((shloka) => shloka.id).sort()).toEqual([...SHLOKA_IDS].sort());
    expect(SHLOKAS.map((shloka) => `${shloka.chapter}.${shloka.verse}`).sort()).toEqual(["11.32", "15.7", "18.66", "2.23", "2.47", "4.7", "9.22"].sort());
    for (const shloka of SHLOKAS) expect(shloka.id).toBe(`BG-${shloka.chapter}-${shloka.verse}`);
  });

  it("never lets the Sanskrit drift: NFC, four pādas, danda placement, SHA-256 lock", () => {
    for (const shloka of SHLOKAS) {
      const text = sanskritText(shloka);
      expect(text, shloka.id).toBe(text.normalize("NFC"));
      expect(shloka.sanskrit, shloka.id).toHaveLength(4);
      expect(shloka.sanskrit[1].endsWith("।"), `${shloka.id} pāda 2`).toBe(true);
      expect(shloka.sanskrit[3].endsWith("॥"), `${shloka.id} pāda 4`).toBe(true);
      expect(shloka.sanskrit[0].endsWith("।") || shloka.sanskrit[2].endsWith("।"), `${shloka.id} stray danda`).toBe(false);
      for (const pada of shloka.sanskrit) {
        expect(pada, shloka.id).toBe(pada.trim());
        expect(pada, shloka.id).not.toMatch(/ {2}/);
        expect(pada, shloka.id).not.toMatch(/[A-Za-z0-9]/);
      }
      expect(createHash("sha256").update(text).digest("hex"), `${shloka.id} was edited`).toBe(shloka.verification.sanskritSha256);
    }
  });

  it("carries the speaker line only on 11.32, apart from the verse", () => {
    for (const shloka of SHLOKAS) {
      if (shloka.id === "BG-11-32") {
        expect(shloka.speaker).toBe("श्रीभगवानुवाच");
        expect(shloka.sanskrit.join("")).not.toContain("भगवानुवाच");
      } else {
        expect(shloka.speaker).toBeUndefined();
      }
    }
  });

  it("has transliteration and both meanings, with the right scripts", () => {
    for (const shloka of SHLOKAS) {
      expect(shloka.transliteration, shloka.id).toHaveLength(4);
      for (const line of shloka.transliteration) {
        expect(line.length, shloka.id).toBeGreaterThan(5);
        expect(line, shloka.id).not.toMatch(DEVANAGARI);
      }
      expect(shloka.meaningHindi, shloka.id).toMatch(DEVANAGARI);
      expect(shloka.meaningEnglish, shloka.id).not.toMatch(DEVANAGARI);
      expect(shloka.meaningEnglish.endsWith("."), shloka.id).toBe(true);
      expect(shloka.purpose.length, `${shloka.id} must say why it is in the film`).toBeGreaterThan(20);
    }
  });

  it("uses the briefed English wording where the brief gave it", () => {
    expect(SHLOKA_BY_ID["BG-4-7"].meaningEnglish).toBe("Whenever there is decline of dharma and rise of adharma, I manifest Myself.");
    expect(SHLOKA_BY_ID["BG-18-66"].meaningEnglish).toBe("Take refuge in Me alone; I will free you from all wrongdoing; do not grieve.");
    expect(SHLOKA_BY_ID["BG-2-23"].meaningEnglish).toBe("Weapons cannot cut the Self, fire cannot burn it, water cannot wet it, and wind cannot dry it.");
  });

  it("is honest about verification: cross-checked, and not yet signed off by a person", () => {
    for (const shloka of SHLOKAS) {
      expect(shloka.verification.crossChecks.length, shloka.id).toBeGreaterThan(0);
      for (const check of shloka.verification.crossChecks) expect(check.result).toBe("exact");
      const signOff = shloka.verification.supersiteSignOff;
      if (signOff !== null) {
        expect(signOff.by.length).toBeGreaterThan(1);
        expect(signOff.on).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    }
  });
});
