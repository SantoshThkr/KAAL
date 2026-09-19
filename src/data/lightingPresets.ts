/**
 * Lighting tells the story. Presets follow the brief's palette (midnight blue, deep indigo, moonlight, warm gold,
 * soft amber) and its per-scene direction. Values are PROVISIONAL: they are tuned against real environments and the
 * real Krishna assets in the scene phases (blue skin must be checked under every preset).
 *
 * azimuth: degrees from +Z toward +X (180 = directly behind the river, -Z). elevation: degrees above the horizon.
 */
export const LIGHTING_PRESET_IDS = [
  "nightMoon",
  "stormNight",
  "divine",
  "dawn",
  "goldenHour",
  "sunset",
  "dusk",
  "starNight",
  "fluteMoon",
  "dusty",
  "dramatic",
  "cosmic",
  "void",
  "finalRim"
] as const;
export type LightingPresetId = (typeof LIGHTING_PRESET_IDS)[number];

export interface LightingPreset {
  ambient: { color: number; intensity: number };
  key: { color: number; intensity: number; azimuth: number; elevation: number };
  rim: { color: number; intensity: number; azimuth: number; elevation: number };
  fog: { color: number; density: number };
  exposure: number;
  bloom: number;
}

export const LIGHTING: Record<LightingPresetId, LightingPreset> = {
  // Act I, and the same river at the end: cold moonlight, mist.
  nightMoon: {
    ambient: { color: 0x16224a, intensity: 0.18 },
    key: { color: 0xa9bde8, intensity: 1.3, azimuth: 200, elevation: 13 },
    rim: { color: 0x6f86c9, intensity: 0.5, azimuth: 20, elevation: 18 },
    fog: { color: 0x0a1024, density: 0.035 },
    exposure: 1,
    bloom: 0.6
  },
  // Mathura: storm, rain, lightning flashes ride on top of this.
  stormNight: {
    ambient: { color: 0x0f1626, intensity: 0.12 },
    key: { color: 0x7f92b8, intensity: 0.6, azimuth: 250, elevation: 40 },
    rim: { color: 0x3c4c7a, intensity: 0.3, azimuth: 60, elevation: 20 },
    fog: { color: 0x0b0f18, density: 0.06 },
    exposure: 0.9,
    bloom: 0.35
  },
  // The birth: subtle divine light, never cheesy.
  divine: {
    ambient: { color: 0x2a2a46, intensity: 0.25 },
    key: { color: 0xf4e2b0, intensity: 1.4, azimuth: 0, elevation: 62 },
    rim: { color: 0xffe9b8, intensity: 0.9, azimuth: 180, elevation: 30 },
    fog: { color: 0x1a1830, density: 0.04 },
    exposure: 1.05,
    bloom: 1.1
  },
  // Bal Krishna: warm morning sunlight.
  dawn: {
    ambient: { color: 0xa9b7d6, intensity: 0.45 },
    key: { color: 0xffc98a, intensity: 2.6, azimuth: 100, elevation: 12 },
    rim: { color: 0xffd9a8, intensity: 0.8, azimuth: 280, elevation: 20 },
    fog: { color: 0xd6b48f, density: 0.012 },
    exposure: 1.05,
    bloom: 0.7
  },
  // Vrindavan: golden hour.
  goldenHour: {
    ambient: { color: 0xb48a5a, intensity: 0.4 },
    key: { color: 0xffb45a, intensity: 3.0, azimuth: 260, elevation: 8 },
    rim: { color: 0xffcf8a, intensity: 0.9, azimuth: 80, elevation: 18 },
    fog: { color: 0xc98f55, density: 0.014 },
    exposure: 1.05,
    bloom: 0.8
  },
  sunset: {
    ambient: { color: 0x7c5a7a, intensity: 0.3 },
    key: { color: 0xff8a4a, intensity: 2.0, azimuth: 265, elevation: 3 },
    rim: { color: 0xff9a6a, intensity: 0.6, azimuth: 85, elevation: 14 },
    fog: { color: 0x8a4a3a, density: 0.02 },
    exposure: 1,
    bloom: 0.8
  },
  dusk: {
    ambient: { color: 0x2a3266, intensity: 0.22 },
    key: { color: 0x8a7fc0, intensity: 0.8, azimuth: 270, elevation: -2 },
    rim: { color: 0x5a6ab0, intensity: 0.4, azimuth: 90, elevation: 10 },
    fog: { color: 0x1a2048, density: 0.03 },
    exposure: 1,
    bloom: 0.6
  },
  starNight: {
    ambient: { color: 0x0f1a3e, intensity: 0.16 },
    key: { color: 0x9db2e6, intensity: 1.0, azimuth: 200, elevation: 20 },
    rim: { color: 0x5f78c0, intensity: 0.5, azimuth: 20, elevation: 16 },
    fog: { color: 0x080d22, density: 0.03 },
    exposure: 1,
    bloom: 0.7
  },
  // The flute: moonlight plus a soft warm rim.
  fluteMoon: {
    ambient: { color: 0x18244f, intensity: 0.2 },
    key: { color: 0xb5c7ef, intensity: 1.1, azimuth: 205, elevation: 16 },
    rim: { color: 0xf0c890, intensity: 0.7, azimuth: 40, elevation: 14 },
    fog: { color: 0x0c1330, density: 0.03 },
    exposure: 1,
    bloom: 0.7
  },
  // Kurukshetra: desaturated, dusty, harsh.
  dusty: {
    ambient: { color: 0x8a8578, intensity: 0.5 },
    key: { color: 0xd8cbb0, intensity: 2.0, azimuth: 240, elevation: 22 },
    rim: { color: 0xb0a58e, intensity: 0.4, azimuth: 60, elevation: 20 },
    fog: { color: 0x9a8f78, density: 0.02 },
    exposure: 0.95,
    bloom: 0.3
  },
  // The Gita: one dramatic directional key.
  dramatic: {
    ambient: { color: 0x2b2a2e, intensity: 0.15 },
    key: { color: 0xffd9a0, intensity: 3.2, azimuth: 300, elevation: 18 },
    rim: { color: 0x7a88b8, intensity: 0.6, azimuth: 120, elevation: 22 },
    fog: { color: 0x3a352f, density: 0.02 },
    exposure: 1,
    bloom: 0.5
  },
  cosmic: {
    ambient: { color: 0x1a1440, intensity: 0.4 },
    key: { color: 0xffe8c0, intensity: 1.8, azimuth: 0, elevation: 40 },
    rim: { color: 0x8ab0ff, intensity: 1.2, azimuth: 180, elevation: 30 },
    fog: { color: 0x05030f, density: 0 },
    exposure: 1,
    bloom: 1.4
  },
  // After everything collapses.
  void: {
    ambient: { color: 0x000000, intensity: 0 },
    key: { color: 0x000000, intensity: 0, azimuth: 0, elevation: 45 },
    rim: { color: 0x000000, intensity: 0, azimuth: 180, elevation: 30 },
    fog: { color: 0x000000, density: 0 },
    exposure: 1,
    bloom: 0
  },
  // Final: minimal blue and gold rim.
  finalRim: {
    ambient: { color: 0x0d1636, intensity: 0.12 },
    key: { color: 0xa5b8e4, intensity: 0.9, azimuth: 205, elevation: 14 },
    rim: { color: 0xf0c078, intensity: 0.9, azimuth: 160, elevation: 12 },
    fog: { color: 0x070c22, density: 0.03 },
    exposure: 1,
    bloom: 0.8
  }
};
