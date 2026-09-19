import { clamp } from "./math";

/** Longest frame the clock will believe. A backgrounded tab must not fast-forward the film. */
const MAX_DT = 0.1;
/** Time constant of a scrub: how quickly scroll momentum is spent. */
const SCRUB_TAU = 0.35;
const MIN_RATE = -6;
const MAX_RATE = 8;

/** Film seconds per pixel of wheel travel. One notch (100 px) is 1.5 s. */
export const SECONDS_PER_PIXEL = 0.015;

/**
 * The one clock the whole film runs on.
 *
 * Autoplay advances film time at 1x. Scroll, touch and keys add to a budget of scrub time still owed ("pending"),
 * which is spent on top of autoplay at a rate proportional to what remains, so a flick eases in and out and settles
 * back to normal playback. The rate is capped (8x forward, 6x back) so scrubbing stays readable, but the budget is
 * conserved: a huge flick takes longer at the cap; it never loses distance. There is no per-component scroll listener
 * anywhere: input feeds this clock, and everything else reads film.time.
 */
export class FilmClock {
  time = 0;
  prevTime = 0;
  /** Effective rate of the last update. */
  rate = 0;
  paused = false;
  ended = false;
  /** True for the update that consumed a seek(). */
  seeked = false;

  private pending = 0;
  private pendingSeek = false;

  constructor(readonly duration: number) {}

  update(dt: number) {
    const step = Math.min(Math.max(dt, 0), MAX_DT);
    this.seeked = this.pendingSeek;
    this.pendingSeek = false;
    this.prevTime = this.time;
    if (this.seeked) {
      this.rate = 0;
      return;
    }

    const base = this.paused ? 0 : 1;
    this.rate = clamp(base + this.pending / SCRUB_TAU, MIN_RATE, MAX_RATE);
    this.pending -= (this.rate - base) * step;
    if (Math.abs(this.pending) < 0.0005) this.pending = 0;

    this.time = clamp(this.time + this.rate * step, 0, this.duration);
    this.ended = this.time >= this.duration;
    // Reaching either end spends any momentum still pushing that way.
    if ((this.time === 0 && this.rate < 0) || (this.ended && this.rate > 0)) this.pending = 0;
  }

  /** Not playing: keep the clock still and quiet. */
  hold() {
    this.prevTime = this.time;
    this.rate = 0;
    this.seeked = false;
  }

  /** Push the film by this many film-seconds, smoothly. Negative pulls it back. */
  nudge(seconds: number) {
    this.pending += seconds;
  }

  /** Hard cut to a film time. */
  seek(time: number) {
    this.time = clamp(time, 0, this.duration);
    this.prevTime = this.time;
    this.pending = 0;
    this.pendingSeek = true;
    this.ended = this.time >= this.duration;
  }

  setPaused(paused: boolean) {
    this.paused = paused;
  }
}
