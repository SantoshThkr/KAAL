import { soundUrl } from "@/data/audioManifest";
import { clipsAt, type AudioClip } from "@/lib/audioPlan";
import type { AudioManager } from "./AudioManager";

/** Clips starting within this many film seconds are fetched and decoded ahead of time. */
const LOOKAHEAD = 25;
/** Playing at a rate this far from 1x is scrubbing: music and one-shots duck out, beds carry on. */
const SCRUB_TOLERANCE = 0.25;
/** A voice this far out of sync with film time is restarted at the right offset. */
const MAX_DRIFT = 0.35;

interface Voice {
  clip: AudioClip;
  source: AudioBufferSourceNode;
  gain: GainNode;
  /** AudioContext time at which film offset 0 of this clip would have started. */
  origin: number;
  ending: boolean;
}

/**
 * Plays the film's sound by following film time (see lib/audioPlan). Every frame: work out which clips should be
 * sounding, start the missing ones at the correct offset, fade out the ones that should not be, and resync any that
 * drifted. Beds loop; one-shots and music play from wherever the film is.
 */
export class SceneAudio {
  private readonly buffers = new Map<string, AudioBuffer>();
  private readonly durations = new Map<string, number>();
  private readonly loading = new Map<string, Promise<void>>();
  private readonly failed = new Set<string>();
  private readonly voices = new Map<string, Voice>();

  constructor(
    private readonly manager: AudioManager,
    private readonly clips: readonly AudioClip[]
  ) {}

  /** Sounds the timeline asks for that have no file. For the engineering panel. */
  get missing() {
    return [...this.failed];
  }

  get playing() {
    return [...this.voices.values()].filter((voice) => !voice.ending).map((voice) => voice.clip.id);
  }

  update(time: number, rate: number, active: boolean) {
    const context = this.manager.getContext();
    if (!context) return;
    this.preload(time);

    const scrubbing = Math.abs(rate - 1) > SCRUB_TOLERANCE;
    const wanted = active ? clipsAt(this.clips, time, this.durations) : [];
    const wantedKeys = new Set<string>();

    for (const clip of wanted) {
      // While scrubbing only the beds stay; music and one-shots would stutter.
      if (scrubbing && !clip.loop) continue;
      const buffer = this.buffers.get(clip.id);
      if (!buffer) continue;
      wantedKeys.add(clip.key);
      const offset = time - clip.start;
      const voice = this.voices.get(clip.key);
      if (voice && !voice.ending) {
        if (!clip.loop && Math.abs(context.currentTime - voice.origin - offset) > MAX_DRIFT) this.release(voice, 0.15);
        else continue;
      }
      this.start(clip, buffer, offset);
    }

    for (const voice of this.voices.values()) {
      if (!voice.ending && !wantedKeys.has(voice.clip.key)) this.release(voice, voice.clip.fadeOut);
    }
  }

  /** Stop everything now (e.g. leaving the page). */
  stopAll() {
    for (const voice of this.voices.values()) this.release(voice, 0.05);
  }

  private start(clip: AudioClip, buffer: AudioBuffer, offset: number) {
    const context = this.manager.getContext();
    const bus = this.manager.getBus(clip.bus);
    if (!context || !bus) return;
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = clip.loop;
    const gain = context.createGain();
    const level = Math.pow(10, clip.gainDb / 20);
    const now = context.currentTime;
    // Starting on the cue: a clean attack. Joining part-way (seek, resync): fade in so it never clicks.
    const fade = offset < 0.05 ? clip.fadeIn : Math.max(0.12, Math.min(clip.fadeIn, 0.6));
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(level, now + fade);
    source.connect(gain).connect(bus);
    const within = clip.loop ? offset % buffer.duration : Math.min(offset, buffer.duration);
    source.start(now, Math.max(0, within));
    const voice: Voice = { clip, source, gain, origin: now - offset, ending: false };
    source.onended = () => {
      if (this.voices.get(clip.key) === voice) this.voices.delete(clip.key);
      gain.disconnect();
    };
    this.voices.set(clip.key, voice);
  }

  private release(voice: Voice, seconds: number) {
    const context = this.manager.getContext();
    if (!context || voice.ending) return;
    voice.ending = true;
    const now = context.currentTime;
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setValueAtTime(voice.gain.gain.value, now);
    voice.gain.gain.linearRampToValueAtTime(0, now + seconds);
    try {
      voice.source.stop(now + seconds + 0.02);
    } catch {
      // Already stopped.
    }
    // Free the key immediately so the clip can start again (e.g. scrubbed back into).
    if (this.voices.get(voice.clip.key) === voice) this.voices.delete(voice.clip.key);
  }

  private preload(time: number) {
    for (const clip of this.clips) {
      if (clip.start > time + LOOKAHEAD) break;
      if (clip.end !== null && clip.end < time) continue;
      this.load(clip.id);
    }
  }

  private load(id: string) {
    if (this.buffers.has(id) || this.loading.has(id) || this.failed.has(id)) return;
    const context = this.manager.getContext();
    if (!context) return;
    const job = fetch(soundUrl(id))
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status));
        return response.arrayBuffer();
      })
      .then((data) => context.decodeAudioData(data))
      .then((buffer) => {
        this.buffers.set(id, buffer);
        this.durations.set(id, buffer.duration);
      })
      .catch(() => {
        this.failed.add(id);
      })
      .finally(() => {
        this.loading.delete(id);
      });
    this.loading.set(id, job);
  }
}
