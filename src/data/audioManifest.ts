import type { AudioBus } from "./story";

/**
 * Every sound the film can play, keyed by the id the timeline's audio cues use. Files live in public/audio/<id>.m4a.
 * A cue whose id is not listed here, or whose file is missing, is skipped (and counted in engineering mode).
 *
 * gain: dB applied to this sound before its bus. loop: the file is a seamless loop (ambience beds).
 * Sources and licences for every recording: public/audio/CREDITS.md.
 */
export interface SoundDef {
  bus: AudioBus;
  gain: number;
  loop?: boolean;
  /** Seconds to fade in when the clip starts part-way (a seek) or as a bed. One-shots start clean. */
  fadeIn?: number;
  /** Seconds to fade out when the clip ends early (stop, duck, cut). */
  fadeOut?: number;
}

export const SOUNDS: Record<string, SoundDef> = {
  "flute/first-note": { bus: "flute", gain: -2 },
  "flute/final-note": { bus: "flute", gain: -2, fadeOut: 3 },
  "flute/call-hint": { bus: "flute", gain: -12 },
  "flute/bal-motif": { bus: "flute", gain: -3 },
  "flute/kishore-theme": { bus: "flute", gain: -3, fadeOut: 2.5 },

  "ambience/yamuna-night": { bus: "ambience", gain: -4, loop: true, fadeIn: 3, fadeOut: 3 },
  "ambience/yamuna-evening": { bus: "ambience", gain: -6, loop: true, fadeIn: 3, fadeOut: 3 },
  "ambience/vrindavan-dawn": { bus: "ambience", gain: -6, loop: true, fadeIn: 3, fadeOut: 3 },
  "ambience/vrindavan-evening": { bus: "ambience", gain: -6, loop: true, fadeIn: 3, fadeOut: 3 },
  "ambience/night-crickets": { bus: "ambience", gain: 4, loop: true, fadeIn: 3, fadeOut: 3 },
  "ambience/wind-harsh": { bus: "ambience", gain: -4, loop: true, fadeIn: 3, fadeOut: 3 },
  "ambience/cosmic-wind": { bus: "ambience", gain: -8, loop: true, fadeIn: 3, fadeOut: 3 }
};

/** Until dedicated recordings exist, some beds reuse the closest real recording rather than play nothing. */
export const SOUND_FILES: Record<string, string> = {
  "ambience/yamuna-evening": "ambience/yamuna-night",
  "ambience/vrindavan-evening": "ambience/vrindavan-dawn",
  "ambience/cosmic-wind": "ambience/wind-harsh"
};

export const soundUrl = (id: string) => `/audio/${SOUND_FILES[id] ?? id}.m4a`;
