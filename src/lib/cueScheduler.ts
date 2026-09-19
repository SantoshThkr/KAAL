import type { Cue } from "./timelineBuilder";

/**
 * Fires each discrete cue (audio, shloka, title, character beat) exactly once as film time crosses it going forward.
 * Backward motion and seeks fire nothing and just re-anchor, so scrubbing never replays a thunderclap or a verse.
 * This deliberately does not use GSAP callbacks: those misfire when a timeline is seeked.
 */
export class CueScheduler {
  private index = 0;
  private readonly crossed: Cue[] = [];

  constructor(private readonly cues: readonly Cue[]) {}

  /** Anchor at `time`: the next cue to fire is the first one at or after it, so a cue exactly at `time` still plays. */
  reset(time: number) {
    let low = 0;
    let high = this.cues.length;
    while (low < high) {
      const mid = (low + high) >> 1;
      if (this.cues[mid].at < time) low = mid + 1;
      else high = mid;
    }
    this.index = low;
  }

  /** Cues crossed moving from prev to next. The returned array is reused: consume it before the next call. */
  advance(prev: number, next: number, seeked: boolean): readonly Cue[] {
    this.crossed.length = 0;
    if (seeked || next < prev) {
      this.reset(next);
      return this.crossed;
    }
    while (this.index < this.cues.length && this.cues[this.index].at <= next) {
      this.crossed.push(this.cues[this.index]);
      this.index += 1;
    }
    return this.crossed;
  }
}

export type CueListener = (cue: Cue, meta: { fast: boolean }) => void;

/** Tiny pub/sub so audio, the shloka overlay and character performers can each subscribe without knowing each other. */
export class CueBus {
  private readonly listeners = new Set<CueListener>();

  subscribe(listener: CueListener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  emit(cue: Cue, meta: { fast: boolean }) {
    for (const listener of this.listeners) listener(cue, meta);
  }
}
