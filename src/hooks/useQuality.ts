import { PROFILES, type QualityProfile } from "@/lib/quality";
import { useExperienceStore } from "@/state/experienceStore";

/** The active quality profile. Re-renders only when the tier changes (a handful of times per session at most). */
export function useQuality(): QualityProfile {
  return PROFILES[useExperienceStore((state) => state.quality)];
}
