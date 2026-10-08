import type { SpriteItem } from "@/components/world/Sprites";

/**
 * Where everything in Vrindavan stands. Generated from a fixed seed, so the world is identical on every machine and
 * in every screenshot, but still has the irregularity of a real grove.
 *
 * The bank runs along X: the village lies to the west (negative X), the open grove in the middle, the river bend and
 * the great kadamba to the east. The river is behind everything (negative Z); the camera watches from the front.
 */
function seeded(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

const random = seeded(20260919);
const between = (min: number, max: number) => min + random() * (max - min);

const scatter = (count: number, make: (index: number) => SpriteItem) => Array.from({ length: count }, (_, index) => make(index));

/** The far bank: a dense line of trees across the river, small with distance. */
export const FAR_TREES: SpriteItem[] = scatter(26, (index) => ({
  x: -42 + index * 3.3 + between(-1, 1),
  z: -26 - between(0, 4),
  height: between(5.5, 8),
  flip: random() > 0.5,
  sway: 0.25
}));

/** The grove behind the bank. */
export const MID_TREES: SpriteItem[] = [
  { x: -17.5, z: -6.5, height: 7.6, sway: 0.5 },
  { x: -12.2, z: -7.2, height: 6.4, flip: true, sway: 0.5 },
  { x: -6.5, z: -6.8, height: 8.2, sway: 0.5 },
  { x: -1.5, z: -7.4, height: 6.8, flip: true, sway: 0.5 },
  { x: 4.5, z: -6.6, height: 7.2, sway: 0.5 },
  { x: 9.5, z: -7.1, height: 6.2, flip: true, sway: 0.5 },
  { x: 15, z: -6.4, height: 7.8, sway: 0.5 }
];

/** The great kadamba Krishna plays under, and its neighbours on the near bank. */
export const NEAR_TREES: SpriteItem[] = [
  { x: 6.2, z: -3.6, height: 9.4, sway: 0.7 },
  { x: -9.4, z: -3.2, height: 7.4, flip: true, sway: 0.7 },
  { x: -20, z: -2.4, height: 8, sway: 0.7 },
  { x: 17.5, z: -2.8, height: 8.6, flip: true, sway: 0.7 }
];

/** Framing trees at the very front, dark and out of focus. */
export const FOREGROUND_TREES: SpriteItem[] = [
  { x: -8.5, z: 4.2, height: 11, sway: 0.8 },
  { x: 8.8, z: 4.6, height: 12, flip: true, sway: 0.8 }
];

export const BUSHES: SpriteItem[] = scatter(22, () => ({
  x: between(-24, 22),
  z: between(-5.6, -1.6),
  height: between(0.8, 1.5),
  flip: random() > 0.5,
  sway: 0.9
}));

export const GRASS: SpriteItem[] = scatter(150, () => ({
  x: between(-26, 24),
  z: between(-6.5, 3.2),
  height: between(0.28, 0.62),
  flip: random() > 0.5,
  sway: 1.2
}));

export const FLOWERS: SpriteItem[] = scatter(54, () => ({
  x: between(-24, 22),
  z: between(-5.5, 2.6),
  height: between(0.3, 0.52),
  flip: random() > 0.5,
  sway: 1
}));

/** Lotuses on the water, just beyond the bank. */
export const LOTUS: SpriteItem[] = scatter(16, () => ({
  x: between(-18, 18),
  z: between(-13, -8.5),
  height: between(0.3, 0.5),
  flip: random() > 0.5,
  sway: 0.3,
  y: 0.02
}));

/** The village, west along the bank. */
export const HUTS: SpriteItem[] = [
  { x: -16.5, z: -4.4, height: 3.4, sway: 0 },
  { x: -12.8, z: -5.2, height: 3, flip: true, sway: 0 },
  { x: -20.5, z: -5.6, height: 2.7, sway: 0 }
];

export const POTS: SpriteItem[] = [
  { x: -13.6, z: -2.6, height: 0.72, sway: 0 },
  { x: -11.4, z: -3.4, height: 0.6, flip: true, sway: 0 }
];

export const COWS: SpriteItem[] = [
  { x: -15.2, z: -1.6, height: 1.5, sway: 0.15 },
  { x: -10.2, z: -2.2, height: 1.4, flip: true, sway: 0.15 },
  { x: -6.4, z: -1.2, height: 1.45, sway: 0.15 },
  { x: 12.5, z: -2, height: 1.4, flip: true, sway: 0.15 }
];

export const PEACOCKS: SpriteItem[] = [{ x: 8.6, z: -1.4, height: 1.5, flip: true, sway: 0.2 }];

export const CLOUDS: SpriteItem[] = scatter(9, (index) => ({
  x: -30 + index * 8 + between(-3, 3),
  z: -34,
  height: between(2.6, 5),
  flip: random() > 0.5,
  sway: 0,
  y: between(7, 13)
}));

/** Butterflies drift around these points. */
export const BUTTERFLY_HOMES: { x: number; y: number; z: number }[] = Array.from({ length: 7 }, () => ({
  x: between(-18, 16),
  y: between(0.5, 1.6),
  z: between(-4, 1.5)
}));
