import { describe, expect, it } from "vitest";
import { CueBus, CueScheduler } from "@/lib/cueScheduler";
import type { Cue } from "@/lib/timelineBuilder";

const audio = (at: number, id = `cue-${at}`): Cue => ({
  kind: "audio",
  at,
  sceneId: "OPENING",
  cue: { at, bus: "environment", id, action: "oneShot" }
});
const ids = (cues: readonly Cue[]) => cues.map((cue) => (cue.kind === "audio" ? cue.cue.id : cue.kind));

describe("CueScheduler", () => {
  const cues = [audio(0), audio(1), audio(1), audio(5), audio(9)];

  it("fires each cue exactly once going forward, including a cue at exactly 0", () => {
    const scheduler = new CueScheduler(cues);
    expect(scheduler.advance(0, 0.5, false).length).toBe(1);
    expect(scheduler.advance(0.5, 1.5, false).length).toBe(2);
    expect(scheduler.advance(1.5, 4, false).length).toBe(0);
    expect(scheduler.advance(4, 5, false).length).toBe(1);
    expect(scheduler.advance(5, 20, false).length).toBe(1);
    expect(scheduler.advance(20, 30, false).length).toBe(0);
  });

  it("fires nothing scrubbing backward; playing forward across a cue again plays it again, like rewinding a film", () => {
    const scheduler = new CueScheduler(cues);
    scheduler.advance(0, 6, false);
    expect(scheduler.advance(6, 2, false).length).toBe(0);
    expect(ids(scheduler.advance(2, 6, false))).toEqual(["cue-5"]);
  });

  it("a seek fires nothing on the seek itself, then plays the cue sitting exactly at the target", () => {
    const scheduler = new CueScheduler(cues);
    expect(scheduler.advance(0, 5, true).length).toBe(0);
    expect(ids(scheduler.advance(5, 5.016, false))).toEqual(["cue-5"]);
    expect(ids(scheduler.advance(5.016, 9.1, false))).toEqual(["cue-9"]);
  });

  it("a big forward jump reports every cue it crossed, in order", () => {
    const scheduler = new CueScheduler(cues);
    scheduler.advance(0, 0.1, false);
    expect(ids(scheduler.advance(0.1, 9, false))).toEqual(["cue-1", "cue-1", "cue-5", "cue-9"]);
  });
});

describe("CueBus", () => {
  it("delivers to every subscriber and stops after unsubscribe", () => {
    const bus = new CueBus();
    const seen: string[] = [];
    const off = bus.subscribe((cue) => seen.push(`a:${cue.kind}`));
    bus.subscribe((cue, meta) => seen.push(`b:${cue.kind}:${meta.fast}`));
    bus.emit(audio(1), { fast: true });
    off();
    bus.emit(audio(2), { fast: false });
    expect(seen).toEqual(["a:audio", "b:audio:true", "b:audio:false"]);
  });
});
