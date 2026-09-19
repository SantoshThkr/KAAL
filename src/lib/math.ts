export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const lerp = (from: number, to: number, t: number) => from + (to - from) * t;

/** Frame-rate independent exponential smoothing. `lambda` is 1/seconds: higher = snappier. */
export const damp = (current: number, target: number, lambda: number, dt: number) =>
  lerp(current, target, 1 - Math.exp(-lambda * dt));

export const DEG2RAD = Math.PI / 180;

/** m:ss for the engineering panel. */
export const formatTime = (seconds: number) => {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
};
