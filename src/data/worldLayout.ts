/**
 * The Yamuna bank: the film's recurring place (the opening at midnight, Bal Krishna at dawn, the flute at dusk, the
 * passage of time, Kishore, and the return at the end). Metres, +Y up. The river runs across the frame along X; the
 * water is everything with z below WATER_EDGE_Z; the near bank rises gently toward +Z.
 */
export const WATER_EDGE_Z = -1.4;

/** Bank surface height at a point. Shared by the terrain mesh and anything placed on it. */
export function bankHeight(x: number, z: number) {
  const rise = Math.max(0, z - WATER_EDGE_Z);
  const base = -0.12 + Math.min(rise * 0.09, 0.9) + Math.max(0, rise - 6) * 0.05;
  const undulation = Math.sin(x * 0.31 + 1.3) * 0.06 + Math.sin(x * 0.07 - z * 0.13) * 0.18 * Math.min(1, rise / 8);
  return base + undulation * Math.min(1, rise / 2);
}

/** Where Krishna stands: at the water's edge, looking out across the river toward the moon. */
export const KRISHNA_MARK = { position: [0, bankHeight(0, -0.35), -0.35] as const, facing: Math.PI };

/** Where the child stands: a little up the bank, turned three-quarters toward the river, so the Yamuna is in his shots. */
export const BAL_MARK = { position: [0.6, bankHeight(0.6, 0.4), 0.4] as const, facing: Math.PI * 0.8 };

export interface Framing {
  /** Radians around Krishna, relative to the way he faces: 0 = in front of him, PI = behind him. Positive = his left. */
  angle: number;
  /** Metres from him (horizontal). */
  distance: number;
  /** Camera height above his feet, metres. */
  height: number;
  /** Height on his body the camera looks at, metres above his feet. */
  look: number;
  focal: number;
  /** Handheld amount, 0..1. */
  shake?: number;
  /** Look slightly past him (metres, in the direction he faces): frames him against what he sees. */
  lead?: number;
}

/** A camera pose placed around a character on a mark. Pure data, used by the timeline. */
export function aroundMark(mark: { position: readonly [number, number, number]; facing: number }, framing: Framing) {
  const [x, y, z] = mark.position;
  const heading = mark.facing + framing.angle;
  const camera = [x + Math.sin(heading) * framing.distance, y + framing.height, z + Math.cos(heading) * framing.distance] as const;
  const lead = framing.lead ?? 0;
  const target = [x + Math.sin(mark.facing) * lead, y + framing.look, z + Math.cos(mark.facing) * lead] as const;
  const focus = Math.hypot(camera[0] - x, camera[1] - (y + framing.look), camera[2] - z);
  return { position: camera, target, focal: framing.focal, focus, shake: framing.shake ?? 0 };
}
