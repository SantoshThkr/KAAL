import { describe, expect, it } from "vitest";
import { FilmClock, SECONDS_PER_PIXEL } from "@/lib/filmClock";

const STEP = 1 / 60;
const run = (clock: FilmClock, seconds: number) => {
  for (let elapsed = 0; elapsed < seconds; elapsed += STEP) clock.update(STEP);
};

describe("FilmClock", () => {
  it("autoplays at 1x", () => {
    const clock = new FilmClock(100);
    run(clock, 10);
    expect(clock.time).toBeCloseTo(10, 1);
    expect(clock.rate).toBeCloseTo(1, 5);
  });

  it("a nudge moves the film by about its size, then settles back to 1x", () => {
    const clock = new FilmClock(1000);
    clock.nudge(10);
    run(clock, 5);
    expect(clock.time).toBeCloseTo(5 + 10, 0);
    expect(clock.rate).toBeCloseTo(1, 1);
  });

  it("one wheel notch is a second or two of film, not a chapter", () => {
    expect(100 * SECONDS_PER_PIXEL).toBeGreaterThan(0.5);
    expect(100 * SECONDS_PER_PIXEL).toBeLessThan(3);
  });

  it("scrolling back rewinds, never below zero, and autoplay resumes from the start", () => {
    const clock = new FilmClock(100);
    run(clock, 20);
    clock.nudge(-30);
    clock.update(STEP);
    expect(clock.rate).toBeLessThan(0);
    let lowest = Infinity;
    for (let elapsed = 0; elapsed < 5; elapsed += STEP) {
      clock.update(STEP);
      lowest = Math.min(lowest, clock.time);
    }
    expect(lowest).toBe(0);
    run(clock, 10);
    expect(clock.time).toBeGreaterThan(5);
  });

  it("caps playback rate so scrubbing stays readable", () => {
    const clock = new FilmClock(10000);
    clock.nudge(100000);
    clock.update(STEP);
    expect(clock.rate).toBeLessThanOrEqual(8);
    const rewind = new FilmClock(10000);
    rewind.seek(5000);
    rewind.update(STEP);
    rewind.nudge(-100000);
    rewind.update(STEP);
    expect(rewind.rate).toBeGreaterThanOrEqual(-6);
  });

  it("caps speed but never loses distance: a huge flick takes longer at the cap and still arrives", () => {
    const clock = new FilmClock(10000);
    clock.nudge(60);
    let fastest = 0;
    for (let elapsed = 0; elapsed < 20; elapsed += STEP) {
      clock.update(STEP);
      fastest = Math.max(fastest, clock.rate);
    }
    expect(fastest).toBeLessThanOrEqual(8);
    expect(fastest).toBeGreaterThan(7.9);
    expect(clock.time).toBeCloseTo(20 + 60, 0);
  });

  it("holds still when paused, but the viewer can still scrub", () => {
    const clock = new FilmClock(100);
    clock.setPaused(true);
    run(clock, 5);
    expect(clock.time).toBe(0);
    clock.nudge(4);
    run(clock, 3);
    expect(clock.time).toBeCloseTo(4, 0);
  });

  it("a seek is a hard cut: flagged for exactly one update, with no advance on that frame", () => {
    const clock = new FilmClock(100);
    run(clock, 1);
    clock.seek(42);
    expect(clock.time).toBe(42);
    clock.update(STEP);
    expect(clock.seeked).toBe(true);
    expect(clock.time).toBe(42);
    expect(clock.prevTime).toBe(42);
    clock.update(STEP);
    expect(clock.seeked).toBe(false);
    expect(clock.time).toBeCloseTo(42 + STEP, 5);
  });

  it("a seek discards any scroll momentum", () => {
    const clock = new FilmClock(1000);
    clock.nudge(500);
    clock.seek(10);
    run(clock, 2);
    expect(clock.time).toBeCloseTo(12, 1);
  });

  it("ends at the duration, and un-ends when scrubbed back", () => {
    const clock = new FilmClock(5);
    run(clock, 10);
    expect(clock.time).toBe(5);
    expect(clock.ended).toBe(true);
    clock.nudge(-3);
    run(clock, 1);
    expect(clock.ended).toBe(false);
  });

  it("does not believe a huge frame (a backgrounded tab must not fast-forward the film)", () => {
    const clock = new FilmClock(1000);
    clock.update(30);
    expect(clock.time).toBeLessThanOrEqual(0.1 + 1e-9);
  });

  it("hold() keeps the clock still and clears the seek flag", () => {
    const clock = new FilmClock(100);
    clock.seek(10);
    clock.update(STEP);
    clock.hold();
    expect(clock.rate).toBe(0);
    expect(clock.seeked).toBe(false);
    expect(clock.time).toBe(10);
  });
});
