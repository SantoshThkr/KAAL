import { create } from "zustand";
import type { SceneId } from "@/data/cinematicTimeline";
import type { CharacterId } from "@/data/characters";
import { stepTier, type QualityTier } from "@/lib/quality";

/**
 * DISCRETE state only: things that change a handful of times per film. Anything that changes every frame (film time,
 * camera, lights, audio energy, FPS) lives in `film` (state/film.ts) and is read by refs and uniforms, never by React.
 */
export type Status = "booting" | "ready" | "playing" | "ended" | "unsupported";
/** checking -> missing | loading -> ready | error */
export type CharacterState = "checking" | "missing" | "loading" | "ready" | "error";
export type AudioStatus = "idle" | "running" | "suspended" | "unsupported";

interface ExperienceState {
  status: Status;
  sceneId: SceneId;
  shotId: string;
  shotAuthored: boolean;
  quality: QualityTier;
  /** True when ?quality= pinned the tier; live adaptation is then off. */
  qualityLocked: boolean;
  soundOn: boolean;
  audioStatus: AudioStatus;
  reducedMotion: boolean;
  engineering: boolean;
  paused: boolean;
  activeClip: string;
  lastCue: string;
  characters: Record<CharacterId, CharacterState>;

  setStatus: (status: Status) => void;
  setPosition: (sceneId: SceneId, shotId: string, authored: boolean) => void;
  setQuality: (quality: QualityTier, locked?: boolean) => void;
  stepQuality: (direction: 1 | -1) => void;
  setSound: (soundOn: boolean) => void;
  setAudioStatus: (audioStatus: AudioStatus) => void;
  setReducedMotion: (reducedMotion: boolean) => void;
  toggleEngineering: () => void;
  setPaused: (paused: boolean) => void;
  setActiveClip: (activeClip: string) => void;
  setLastCue: (lastCue: string) => void;
  setCharacter: (id: CharacterId, state: CharacterState) => void;
}

export const useExperienceStore = create<ExperienceState>((set) => ({
  status: "booting",
  sceneId: "INTRO",
  shotId: "black",
  shotAuthored: true,
  quality: "medium",
  qualityLocked: false,
  soundOn: true,
  audioStatus: "idle",
  reducedMotion: false,
  engineering: false,
  paused: false,
  activeClip: "none (no character loaded)",
  lastCue: "none",
  characters: { kishore: "checking", bal: "checking" },

  setStatus: (status) => set({ status }),
  setPosition: (sceneId, shotId, shotAuthored) => set({ sceneId, shotId, shotAuthored }),
  setQuality: (quality, locked = false) => set({ quality, qualityLocked: locked }),
  stepQuality: (direction) => set((state) => (state.qualityLocked ? state : { quality: stepTier(state.quality, direction) })),
  setSound: (soundOn) => set({ soundOn }),
  setAudioStatus: (audioStatus) => set({ audioStatus }),
  setReducedMotion: (reducedMotion) => set({ reducedMotion }),
  toggleEngineering: () => set((state) => ({ engineering: !state.engineering })),
  setPaused: (paused) => set({ paused }),
  setActiveClip: (activeClip) => set({ activeClip }),
  setLastCue: (lastCue) => set({ lastCue }),
  setCharacter: (id, state) => set((current) => ({ characters: { ...current.characters, [id]: state } }))
}));
