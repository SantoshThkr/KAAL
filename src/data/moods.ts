/**
 * The look of each moment: sky, lamp (sun or moon), the light that tints every drawing, air and water. Scenes name a
 * mood; the master timeline blends between them, so dawn arrives gradually and the cosmos takes the sky slowly.
 * Colours are sRGB hex, converted to linear once when the timeline is compiled.
 */
export interface MoodDef {
  skyTop: number;
  skyHorizon: number;
  lamp: number;
  /** Lamp position in sky coordinates: x across (-1..1), y up (0 = horizon, 1 = zenith). */
  lampX: number;
  lampY: number;
  lampSize: number;
  /** Multiplies every drawing. */
  tint: number;
  fog: number;
  fogDensity: number;
  stars: number;
  clouds: number;
  water: number;
  exposure: number;
  bloom: number;
  vignette: number;
}

export const MOODS = {
  /** Before the first light: almost nothing but the moon. */
  nightDeep: {
    skyTop: 0x05070f, skyHorizon: 0x0b1026, lamp: 0xf4f1e2, lampX: -0.35, lampY: 0.62, lampSize: 0.055,
    tint: 0x6f86c0, fog: 0x0b1026, fogDensity: 0.055, stars: 1, clouds: 0.35, water: 0x0d1c3a, exposure: 1, bloom: 0.75, vignette: 0.62
  },
  /** Moonlit Vrindavan: the opening reveal. */
  moonlit: {
    skyTop: 0x0d1438, skyHorizon: 0x1d2a62, lamp: 0xf6f3e6, lampX: -0.3, lampY: 0.5, lampSize: 0.05,
    tint: 0x90a6d8, fog: 0x1d2a62, fogDensity: 0.04, stars: 0.9, clouds: 0.45, water: 0x16366b, exposure: 1, bloom: 0.7, vignette: 0.55
  },
  /** Bal Krishna's morning: warm, bright, playful. */
  morning: {
    skyTop: 0x2f86d8, skyHorizon: 0xffcf96, lamp: 0xfff2c4, lampX: 0.45, lampY: 0.42, lampSize: 0.05,
    tint: 0xfff3e0, fog: 0xffe3bb, fogDensity: 0.012, stars: 0, clouds: 0.7, water: 0x3f8ad2, exposure: 1.02, bloom: 0.5, vignette: 0.4
  },
  /** Vrindavan at its greenest, late morning. */
  vrindavan: {
    skyTop: 0x2b7fd4, skyHorizon: 0xaddcff, lamp: 0xfff6d8, lampX: 0.3, lampY: 0.6, lampSize: 0.045,
    tint: 0xffffff, fog: 0xd8edff, fogDensity: 0.01, stars: 0, clouds: 0.75, water: 0x3f8ad2, exposure: 1.02, bloom: 0.45, vignette: 0.38
  },
  /** The flute: the day letting go, gold turning to blue. */
  golden: {
    skyTop: 0x2f5fa8, skyHorizon: 0xffb066, lamp: 0xffd79a, lampX: -0.5, lampY: 0.16, lampSize: 0.07,
    tint: 0xffd9b0, fog: 0xffb98a, fogDensity: 0.018, stars: 0, clouds: 0.6, water: 0x2f6fae, exposure: 1.02, bloom: 0.8, vignette: 0.45
  },
  /** The flute's spell: dusk gone violet, fireflies out. */
  magicDusk: {
    skyTop: 0x1a1f55, skyHorizon: 0x6b3f86, lamp: 0xffd2a8, lampX: -0.6, lampY: 0.06, lampSize: 0.06,
    tint: 0xb49ad6, fog: 0x5a3a74, fogDensity: 0.03, stars: 0.45, clouds: 0.5, water: 0x293b78, exposure: 1, bloom: 1, vignette: 0.5
  },
  /** The transformation: time itself turning over. */
  timeTurn: {
    skyTop: 0x101a46, skyHorizon: 0x3c2f73, lamp: 0xffe6c0, lampX: -0.1, lampY: 0.3, lampSize: 0.08,
    tint: 0xa7a9e0, fog: 0x2b2a5e, fogDensity: 0.035, stars: 0.7, clouds: 0.4, water: 0x1d2f63, exposure: 1.03, bloom: 1.2, vignette: 0.5
  },
  /** Kishore by the Yamuna: still, silver, deep. */
  riverNight: {
    skyTop: 0x080f2c, skyHorizon: 0x16255c, lamp: 0xf4f2e4, lampX: -0.42, lampY: 0.34, lampSize: 0.052,
    tint: 0x8fa5d6, fog: 0x16255c, fogDensity: 0.035, stars: 1, clouds: 0.3, water: 0x112a59, exposure: 1, bloom: 0.85, vignette: 0.55
  },
  /** The divine moment: the sky becoming everything. */
  cosmic: {
    skyTop: 0x090620, skyHorizon: 0x2a1a55, lamp: 0xffe9c0, lampX: 0, lampY: 0.45, lampSize: 0.12,
    tint: 0xd8cff0, fog: 0x160f33, fogDensity: 0.02, stars: 1, clouds: 0.15, water: 0x1a1240, exposure: 1.05, bloom: 1.5, vignette: 0.45
  },
  /** Everything returns to silence. */
  silence: {
    skyTop: 0x05070f, skyHorizon: 0x0a1026, lamp: 0xf4f1e2, lampX: -0.35, lampY: 0.5, lampSize: 0.05,
    tint: 0x7b8fc4, fog: 0x0a1026, fogDensity: 0.05, stars: 1, clouds: 0.25, water: 0x0d1c3a, exposure: 1, bloom: 0.7, vignette: 0.6
  }
} as const satisfies Record<string, MoodDef>;

export type MoodId = keyof typeof MOODS;
