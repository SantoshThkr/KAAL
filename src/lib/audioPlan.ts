import type { AudioBus } from "@/data/cinematicTimeline";
import { SOUNDS } from "@/data/audioManifest";
import type { CompiledFilm } from "./timelineBuilder";

/**
 * The film's sound laid out like clips on an editor's timeline. Audio then FOLLOWS film time: whatever the film time
 * is (playing, seeked, scrubbed, rewound), the set of clips that should be sounding is a pure function of it, and the
 * engine reconciles the real voices to that set. Nothing is "fired and forgotten", so a seek can never leave a stale
 * sound playing or skip a bed.
 */
export interface AudioClip {
  key: string;
  id: string;
  bus: AudioBus;
  /** Absolute film seconds. */
  start: number;
  /** Absolute film seconds, or null to play to the end of the file (one-shots and music with no explicit stop). */
  end: number | null;
  loop: boolean;
  /** true for one-shot cues. */
  oneShot: boolean;
  fadeIn: number;
  fadeOut: number;
  gainDb: number;
}

export function planAudio(film: CompiledFilm): AudioClip[] {
  const clips: AudioClip[] = [];
  for (const scene of film.scenes) {
    const open = new Map<string, AudioClip>();
    const close = (clip: AudioClip, at: number) => {
      clip.end = at;
      open.delete(clip.id);
    };
    const cues = [...scene.def.audio].sort((a, b) => a.at - b.at);
    for (const cue of cues) {
      const at = scene.start + cue.at;
      if (cue.action === "duck" || cue.action === "stop") {
        if (cue.id === "*") {
          for (const clip of [...open.values()]) if (clip.bus === cue.bus || cue.bus === "cinematic") close(clip, at);
        } else {
          const clip = open.get(cue.id);
          if (clip) close(clip, at);
        }
        continue;
      }
      const def = SOUNDS[cue.id];
      if (!def) continue;
      const previous = open.get(cue.id);
      if (previous) close(previous, at);
      const clip: AudioClip = {
        key: `${scene.def.id}:${cue.id}:${cue.at}`,
        id: cue.id,
        bus: def.bus,
        start: at,
        end: null,
        loop: Boolean(def.loop) && cue.action === "start",
        oneShot: cue.action === "oneShot",
        fadeIn: def.fadeIn ?? (cue.action === "oneShot" ? 0.01 : 0.6),
        fadeOut: def.fadeOut ?? 1.5,
        gainDb: def.gain
      };
      clips.push(clip);
      if (cue.action === "start") open.set(cue.id, clip);
    }
    // Beds and music still open at the end of the scene end with it (the next scene sets its own sound).
    for (const clip of open.values()) clip.end = scene.end;
  }
  return clips.sort((a, b) => a.start - b.start);
}

/** Clips that should be sounding at film time t. `durations` supplies file lengths for clips with no explicit end. */
export function clipsAt(clips: readonly AudioClip[], t: number, durations: ReadonlyMap<string, number>): AudioClip[] {
  const out: AudioClip[] = [];
  for (const clip of clips) {
    if (clip.start > t) break;
    const length = durations.get(clip.id);
    const naturalEnd = clip.loop || length === undefined ? Infinity : clip.start + length;
    const end = Math.min(clip.end ?? Infinity, naturalEnd);
    if (t < end) out.push(clip);
  }
  return out;
}
