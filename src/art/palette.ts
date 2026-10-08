/**
 * The film's colour language. One palette for every drawing and every scene tint, so the world holds together:
 * Krishna blue, peacock green, Radha pink, temple gold, Vrindavan green, Yamuna blue, sunset orange, moonlight silver.
 */
export const PALETTE = {
  skin: "#6A8FE0",
  skinShade: "#4A6AC0",
  skinDeep: "#39539F",
  skinLight: "#9FBAF4",
  blush: "#E2879C",
  /** The ink line that holds every drawing together, like a storybook illustration. */
  ink: "#2A2250",
  inkSoft: "#3B3366",

  hair: "#1B1630",
  hairSheen: "#3B3566",

  dhoti: "#F4B63F",
  dhotiShade: "#D18F22",
  dhotiLight: "#FFD27A",
  sash: "#E2594F",
  sashShade: "#B83C38",

  gold: "#F7D277",
  goldDeep: "#C79A32",
  gem: "#E2594F",
  gemGreen: "#2BB39B",

  featherTeal: "#1FA398",
  featherBlue: "#2E63C8",
  featherDeep: "#15324F",
  featherGold: "#EFC75E",

  eyeWhite: "#FDFBFF",
  iris: "#43291A",
  irisLight: "#6B452B",
  pupil: "#140C08",
  lash: "#180F22",
  lip: "#C0526B",
  lipLight: "#E0788B",

  bamboo: "#D8B169",
  bambooShade: "#A87E3C",

  // World
  nightSky: "#131F4A",
  nightSkyDeep: "#070C25",
  moon: "#F2F0E0",
  yamuna: "#1B3F7A",
  yamunaLight: "#3E7FC1",
  leaf: "#2E7D4F",
  leafDeep: "#1C5134",
  leafLight: "#5FB87A",
  trunk: "#5A3B2A",
  trunkShade: "#3E2619",
  grass: "#3E8A52",
  grassDeep: "#276038",
  blossomPink: "#F3899E",
  blossomWhite: "#FFF2E4",
  dawn: "#FFC58A",
  sunset: "#FF8A5B",
  earth: "#8A6243"
} as const;

export type PaletteKey = keyof typeof PALETTE;
