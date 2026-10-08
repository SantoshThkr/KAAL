/**
 * A small deterministic generator. Scatter (fireflies, grass phases) uses it instead of Math.random, so the world is
 * identical on every machine and in every screenshot, and nothing impure runs while React renders.
 */
export function seeded(seed: number) {
  let state = (seed >>> 0) || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
