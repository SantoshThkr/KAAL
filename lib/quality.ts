export type QualityPreset = "low" | "medium" | "high";

export function getQualityPreset(): QualityPreset {
  if (typeof window === "undefined") return "high";
  const narrow = window.innerWidth < 700;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  if (narrow || memory <= 4) return "low";
  if (memory <= 8) return "medium";
  return "high";
}
