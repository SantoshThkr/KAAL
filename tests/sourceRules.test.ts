import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(__dirname, "..");
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
const files = (dir: string, extensions: string[]) => walk(join(root, dir)).filter((file) => extensions.some((extension) => file.endsWith(extension)));
const read = (file: string) => readFileSync(file, "utf8");

/** Guards for rules the brief makes non-negotiable. They fail loudly if someone quietly breaks one. */
describe("brief rules, enforced", () => {
  it("never hardcodes Sanskrit or Hindi in a component or the app shell (it lives in src/data)", () => {
    const offenders = [...files("src/components", [".ts", ".tsx"]), ...files("src/app", [".ts", ".tsx", ".css"]), ...files("src/hooks", [".ts"]), ...files("src/lib", [".ts"])].filter((file) => /[ऀ-ॿ]/.test(read(file)));
    expect(offenders.map((file) => relative(root, file))).toEqual([]);
  });

  it("never builds Krishna, or any character, from primitive geometry", () => {
    const primitives = /(sphere|capsule|cylinder|cone|torus|box|circle|dodecahedron|icosahedron|octahedron)Geometry|<Sphere|<Capsule|<Cylinder|<Cone|<Torus|<Box/;
    const offenders = files("src/components/krishna", [".ts", ".tsx"]).filter((file) => primitives.test(read(file)));
    expect(offenders.map((file) => relative(root, file))).toEqual([]);
  });

  it("has no OrbitControls: the camera is a film camera, never a viewer", () => {
    const offenders = files("src", [".ts", ".tsx"]).filter((file) => /\bimport\b[^;]*\b(OrbitControls|TrackballControls|ArcballControls|ScrollControls|useScroll)\b|<(OrbitControls|TrackballControls|ArcballControls|ScrollControls)\b/.test(read(file)));
    expect(offenders.map((file) => relative(root, file))).toEqual([]);
  });

  it("has exactly one place that listens for wheel and touch input", () => {
    const listeners = files("src", [".ts", ".tsx"]).filter((file) => /addEventListener\(\s*["'](wheel|scroll|touchmove)["']/.test(read(file)));
    expect(listeners.map((file) => relative(root, file))).toEqual(["src/hooks/useCinematicTimeline.ts"]);
  });

  it("has exactly one place that drives the film clock", () => {
    const drivers = files("src", [".ts", ".tsx"]).filter((file) => /clock\.update\(/.test(read(file)));
    expect(drivers.map((file) => relative(root, file))).toEqual(["src/components/experience/CinematicController.tsx"]);
  });

  it("never uses an oscillator as sound", () => {
    const offenders = files("src", [".ts", ".tsx"]).filter((file) => /createOscillator\(/.test(read(file)));
    expect(offenders.map((file) => relative(root, file))).toEqual([]);
  });
});
