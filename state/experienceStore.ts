import { create } from "zustand";

export type SceneName = "INTRO" | "BIRTH" | "BAL" | "VRINDAVAN" | "TRANSFORMATION" | "KISHORE" | "COSMIC" | "FINAL";

type ExperienceState = {
  progress: number;
  audioEnergy: number;
  reducedMotion: boolean;
  engineering: boolean;
  scene: SceneName;
  setProgress: (progress: number) => void;
  setAudioEnergy: (audioEnergy: number) => void;
  setReducedMotion: (reducedMotion: boolean) => void;
  setEngineering: (engineering: boolean) => void;
};

export const useExperienceStore = create<ExperienceState>((set) => ({
  progress: 0,
  audioEnergy: 0,
  reducedMotion: false,
  engineering: false,
  scene: "INTRO",
  setProgress: (progress) => set({ progress, scene: sceneForProgress(progress) }),
  setAudioEnergy: (audioEnergy) => set({ audioEnergy }),
  setReducedMotion: (reducedMotion) => set({ reducedMotion }),
  setEngineering: (engineering) => set({ engineering })
}));

export function sceneForProgress(progress: number): SceneName {
  if (progress < 0.08) return "INTRO";
  if (progress < 0.18) return "BIRTH";
  if (progress < 0.4) return "BAL";
  if (progress < 0.55) return "VRINDAVAN";
  if (progress < 0.72) return "TRANSFORMATION";
  if (progress < 0.86) return "KISHORE";
  if (progress < 0.95) return "COSMIC";
  return "FINAL";
}
