import { film } from "@/state/film";

/**
 * The live flute analysis: { low, mid, high, energy, onset }, each 0..1. Returns the SAME mutable object every
 * frame, so read it inside useFrame (water ripple, firefly motion, light, cloth); never put it in React state.
 * The CinematicController refreshes it once per frame from the AudioManager's analyser.
 */
export function useAudioAnalyser() {
  return film.audio;
}
