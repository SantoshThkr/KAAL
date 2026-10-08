import type { AudioBus } from "@/data/story";
import { clamp } from "@/lib/math";
import type { AudioStatus } from "@/state/experienceStore";

export const AUDIO_BUSES: readonly AudioBus[] = ["ambience", "flute", "voice", "environment", "cinematic"];

export interface FluteEnergy {
  low: number;
  mid: number;
  high: number;
  energy: number;
  onset: number;
}

/** Envelope follower times, seconds. Fast attack so a note is felt at once; slow release so the world exhales. */
const ATTACK = 0.03;
const RELEASE = 0.4;
/** Loudness window, dBFS. Below the floor is silence (0); at the ceiling the world is fully alive (1). A flute stem
 *  mastered near -18 dBFS RMS sits around 0.9, and a soft breath of a note around 0.4. */
const FLOOR_DB = -50;
const CEILING_DB = -14;
/** How long the slow average used for onset detection takes to follow the signal. */
const ONSET_AVERAGE = 0.8;
const ONSET_DECAY = 0.25;

/** Hz. A bansuri sits mostly in `mid`; `high` is breath and harmonics; `low` is body and the score under it. */
const BANDS = { low: [20, 250], mid: [250, 2000], high: [2000, 8000] } as const;

/**
 * The single owner of the AudioContext.
 *
 *   ambience ─┐
 *   flute ────┤
 *   voice ────┼─► muffle (low-pass, "time slows") ─► master ─► compressor ─► destination
 *   environment ┤
 *   cinematic ┘
 *   flute ─► analyser ─► band energies ─► film.audio ─► water, fireflies, light, cloth
 *
 * The analyser listens to the FLUTE bus only, so the world reacts to the flute and never to thunder.
 * The context is created and resumed inside the ENTER click; nothing plays before a user gesture.
 */
export class AudioManager {
  status: AudioStatus = "idle";

  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private muffleFilter: BiquadFilterNode | null = null;
  private analyser: AnalyserNode | null = null;
  private waveform: Float32Array<ArrayBuffer> | null = null;
  private spectrum: Float32Array<ArrayBuffer> | null = null;
  private readonly buses: Partial<Record<AudioBus, GainNode>> = {};
  private readonly listeners = new Set<(status: AudioStatus) => void>();

  private muted = false;
  private volume = 0.9;
  private lastMuffle = -1;
  private slowEnergy = 0;

  /** Must be called synchronously from a user gesture. Safe to call repeatedly. */
  async unlock(): Promise<AudioStatus> {
    if (!this.context) this.build();
    if (this.context && this.context.state !== "running") {
      try {
        await this.context.resume();
      } catch {
        // Autoplay policy refused. The status listener below reports it and the UI shows sound as unavailable.
      }
    }
    this.syncStatus();
    return this.status;
  }

  subscribe(listener: (status: AudioStatus) => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getContext() {
    return this.context;
  }

  getBus(bus: AudioBus) {
    return this.buses[bus] ?? null;
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    this.applyMasterGain();
  }

  setVolume(volume: number) {
    this.volume = clamp(volume, 0, 1);
    this.applyMasterGain();
  }

  /** Mute or duck one layer without touching the others. */
  setBusGain(bus: AudioBus, gain: number, rampSeconds = 0.3) {
    const node = this.buses[bus];
    if (!node || !this.context) return;
    node.gain.setTargetAtTime(clamp(gain, 0, 2), this.context.currentTime, Math.max(0.001, rampSeconds / 3));
  }

  /** 0 = clear, 1 = heavily muffled. "Time slows; sound becomes muffled." Only touches the param when it changed. */
  setMuffle(amount: number) {
    if (!this.context || !this.muffleFilter) return;
    if (Math.abs(amount - this.lastMuffle) < 0.005) return;
    this.lastMuffle = amount;
    const cutoff = 20000 * Math.pow(0.02, clamp(amount, 0, 1));
    this.muffleFilter.frequency.setTargetAtTime(cutoff, this.context.currentTime, 0.06);
  }

  /**
   * Sample the flute analyser into `out`. Loudness comes from the waveform (a flute is a narrow tone, so averaging
   * its spectrum would read a strong note as quiet), and the spectrum only decides how that loudness is shared between
   * low, mid and high. With no context, or a silent one, everything eases to zero.
   */
  readEnergy(out: FluteEnergy, dt: number) {
    let level = 0;
    let low = 0;
    let mid = 0;
    let high = 0;
    const context = this.context;
    if (context && context.state === "running" && this.analyser && this.waveform && this.spectrum) {
      this.analyser.getFloatTimeDomainData(this.waveform);
      let sum = 0;
      for (let index = 0; index < this.waveform.length; index += 1) sum += this.waveform[index] * this.waveform[index];
      const rms = Math.sqrt(sum / this.waveform.length);
      const decibels = rms > 1e-6 ? 20 * Math.log10(rms) : -120;
      level = clamp((decibels - FLOOR_DB) / (CEILING_DB - FLOOR_DB), 0, 1);
      if (level > 0) {
        this.analyser.getFloatFrequencyData(this.spectrum);
        const hzPerBin = context.sampleRate / this.analyser.fftSize;
        const lowPower = this.bandPower(BANDS.low, hzPerBin);
        const midPower = this.bandPower(BANDS.mid, hzPerBin);
        const highPower = this.bandPower(BANDS.high, hzPerBin);
        const total = lowPower + midPower + highPower;
        if (total > 1e-12) {
          low = (level * lowPower) / total;
          mid = (level * midPower) / total;
          high = (level * highPower) / total;
        }
      }
    }
    out.low = follow(out.low, low, dt);
    out.mid = follow(out.mid, mid, dt);
    out.high = follow(out.high, high, dt);
    out.energy = follow(out.energy, level, dt);

    this.slowEnergy += (out.energy - this.slowEnergy) * (1 - Math.exp(-dt / ONSET_AVERAGE));
    const spike = clamp((out.energy - this.slowEnergy) * 6, 0, 1);
    out.onset = Math.max(spike, out.onset * Math.exp(-dt / ONSET_DECAY));
  }

  dispose() {
    void this.context?.close();
    this.context = null;
    this.status = "idle";
    this.listeners.clear();
  }

  private build() {
    const Context: typeof AudioContext | undefined =
      typeof window === "undefined"
        ? undefined
        : (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
    if (!Context) {
      this.setStatus("unsupported");
      return;
    }
    const context = new Context({ latencyHint: "interactive" });
    const master = context.createGain();
    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 24;
    compressor.ratio.value = 3;
    compressor.attack.value = 0.01;
    compressor.release.value = 0.3;
    const muffle = context.createBiquadFilter();
    muffle.type = "lowpass";
    muffle.frequency.value = 20000;
    muffle.Q.value = 0.7;
    muffle.connect(master);
    master.connect(compressor);
    compressor.connect(context.destination);

    for (const id of AUDIO_BUSES) {
      const bus = context.createGain();
      bus.connect(muffle);
      this.buses[id] = bus;
    }

    // Space. Flute and voice are recorded dry; a send into a generated riverbank reverb places them by the water.
    const reverb = context.createConvolver();
    reverb.buffer = impulseResponse(context, 2.8, 2.2);
    const wet = context.createGain();
    wet.gain.value = 0.32;
    reverb.connect(wet).connect(muffle);
    this.buses.flute?.connect(reverb);
    this.buses.voice?.connect(reverb);

    const analyser = context.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0; // our own envelope followers do the smoothing
    this.buses.flute?.connect(analyser);

    this.context = context;
    this.master = master;
    this.muffleFilter = muffle;
    this.analyser = analyser;
    this.waveform = new Float32Array(new ArrayBuffer(analyser.fftSize * 4));
    this.spectrum = new Float32Array(new ArrayBuffer(analyser.frequencyBinCount * 4));
    this.applyMasterGain();
    context.onstatechange = () => this.syncStatus();
  }

  /** Linear power in a band, summed from the analyser's dB spectrum. */
  private bandPower([fromHz, toHz]: readonly [number, number], hzPerBin: number) {
    const spectrum = this.spectrum;
    if (!spectrum) return 0;
    const first = Math.max(1, Math.floor(fromHz / hzPerBin));
    const last = Math.min(spectrum.length - 1, Math.ceil(toHz / hzPerBin));
    let power = 0;
    for (let index = first; index <= last; index += 1) power += Math.pow(10, spectrum[index] / 10);
    return power;
  }

  private applyMasterGain() {
    if (!this.master || !this.context) return;
    this.master.gain.setTargetAtTime(this.muted ? 0 : this.volume, this.context.currentTime, 0.05);
  }

  private syncStatus() {
    if (!this.context) return;
    this.setStatus(this.context.state === "running" ? "running" : "suspended");
  }

  private setStatus(status: AudioStatus) {
    if (this.status === status) return;
    this.status = status;
    for (const listener of this.listeners) listener(status);
  }
}

/**
 * A stereo impulse response for an open riverbank at night: a short pre-delay, a few early reflections off the water
 * and the bank, then a smooth exponential tail that loses its highs as it decays.
 */
function impulseResponse(context: BaseAudioContext, seconds: number, decay: number) {
  const rate = context.sampleRate;
  const length = Math.floor(seconds * rate);
  const buffer = context.createBuffer(2, length, rate);
  const preDelay = Math.floor(0.018 * rate);
  for (let channel = 0; channel < 2; channel += 1) {
    const data = buffer.getChannelData(channel);
    let seed = 1234567 + channel * 7919;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296 - 0.5;
    };
    let lowpassed = 0;
    for (let index = preDelay; index < length; index += 1) {
      const t = (index - preDelay) / rate;
      const envelope = Math.pow(1 - t / seconds, decay) * Math.exp(-t * 1.6);
      const damping = 0.35 + 0.6 * Math.min(1, t / 1.2);
      lowpassed += (random() - lowpassed) * (1 - damping);
      data[index] = lowpassed * envelope;
    }
    for (const [time, level] of [[0.023, 0.5], [0.041, 0.35], [0.067, 0.22], [0.089, 0.16]] as const) {
      const at = Math.floor((time + channel * 0.0031) * rate);
      if (at < length) data[at] += level * (channel ? -1 : 1);
    }
  }
  return buffer;
}

const follow = (current: number, target: number, dt: number) => {
  const tau = target > current ? ATTACK : RELEASE;
  return current + (target - current) * (1 - Math.exp(-dt / tau));
};

export const audioManager = new AudioManager();
