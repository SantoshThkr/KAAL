/**
 * How many times React committed each root, and how many times the store was written. Read by the engineering panel
 * to prove the "no state updates every frame" rule instead of asserting it. React's Profiler only reports in
 * development builds, so the commit counters stay 0 in production; the store-write counter works everywhere.
 */
export const debugCounters = { domCommits: 0, canvasCommits: 0, storeWrites: 0 };
