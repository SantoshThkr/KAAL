export type QualityTier = "high" | "medium" | "low";

/** Ordered worst to best, so stepping is index arithmetic. */
export const QUALITY_TIERS: readonly QualityTier[] = ["low", "medium", "high"];

export interface QualityProfile {
  tier: QualityTier;
  /** Device pixel ratio range handed to the Canvas. */
  dpr: [number, number];
  /** MSAA samples on the composer's render target. 0 = none. */
  msaa: number;
  shadows: boolean;
  shadowMapSize: number;
  dof: boolean;
  grain: boolean;
  chromatic: boolean;
  /** Multiplier applied to every particle system's count. */
  particleScale: number;
  /** Multiplier for instanced grass, trees, fireflies, crowds. */
  environmentDensity: number;
  /** Largest texture edge to load. */
  textureMax: number;
  /** LOD1 keeps the same rig, morphs and silhouette. Krishna is never removed at any tier. */
  krishnaLod: 0 | 1;
}

export const PROFILES: Record<QualityTier, QualityProfile> = {
  high: { tier: "high", dpr: [1, 2], msaa: 4, shadows: true, shadowMapSize: 2048, dof: true, grain: true, chromatic: true, particleScale: 1, environmentDensity: 1, textureMax: 4096, krishnaLod: 0 },
  medium: { tier: "medium", dpr: [1, 1.5], msaa: 0, shadows: true, shadowMapSize: 1024, dof: true, grain: true, chromatic: false, particleScale: 0.5, environmentDensity: 0.6, textureMax: 2048, krishnaLod: 0 },
  low: { tier: "low", dpr: [1, 1], msaa: 0, shadows: false, shadowMapSize: 512, dof: false, grain: false, chromatic: false, particleScale: 0.2, environmentDensity: 0.3, textureMax: 1024, krishnaLod: 1 }
};

/** Starting tier from what the browser will tell us. PerformanceMonitor then adapts it live. */
export function detectTier(caps: { software: boolean }): QualityTier {
  if (caps.software) return "low";
  const nav = navigator as Navigator & { deviceMemory?: number };
  const cores = nav.hardwareConcurrency ?? 4;
  const memory = nav.deviceMemory ?? 8;
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const small = Math.min(window.innerWidth, window.innerHeight) < 500;
  if (coarsePointer || small) return memory >= 6 && cores >= 8 ? "medium" : "low";
  if (cores >= 8 && memory >= 8) return "high";
  if (cores >= 4) return "medium";
  return "low";
}

/** `?quality=high|medium|low` pins the tier for QA and disables live adaptation. */
export function tierFromQuery(search: string): QualityTier | null {
  const value = new URLSearchParams(search).get("quality");
  return value === "high" || value === "medium" || value === "low" ? value : null;
}

export function stepTier(tier: QualityTier, direction: 1 | -1): QualityTier {
  const index = QUALITY_TIERS.indexOf(tier) + direction;
  return QUALITY_TIERS[Math.min(QUALITY_TIERS.length - 1, Math.max(0, index))];
}
