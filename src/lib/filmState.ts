/**
 * The film's continuous state. This is a plain mutable object, NOT React state: the GSAP master timeline writes into
 * it, and the camera rig, lighting rig, post-processing and (later) shaders read from it every frame.
 * React only ever sees discrete events (scene changed, shot changed) through the Zustand store.
 */

export interface CameraState {
  px: number;
  py: number;
  pz: number;
  tx: number;
  ty: number;
  tz: number;
  /** mm, 35 mm film back. */
  focal: number;
  /** Metres to the plane in focus. */
  focus: number;
  /** Degrees. */
  roll: number;
  /** 0..1 handheld. */
  shake: number;
}

/** Linear RGB, so it can be handed straight to Color.setRGB. */
export interface LightBlock {
  r: number;
  g: number;
  b: number;
  i: number;
}
export interface DirectionalBlock extends LightBlock {
  /** Degrees from +Z toward +X. */
  az: number;
  /** Degrees above the horizon. */
  el: number;
}
export interface FogBlock {
  r: number;
  g: number;
  b: number;
  d: number;
}

export interface FilmStats {
  fps: number;
  frameMs: number;
  /** The renderer's actual pixel ratio, not the requested one. */
  pixelRatio: number;
  calls: number;
  triangles: number;
  points: number;
  lines: number;
  geometries: number;
  textures: number;
  /** Sum of every registered particle system. 0 while none exist. */
  particles: number;
}

export interface FilmState {
  /** Film time in seconds. Driven by the FilmClock. */
  time: number;
  progress: number;
  /** Effective playback rate this frame (1 = normal, negative = rewinding). */
  rate: number;
  /** Real seconds since the experience began. Breathing, blinking and wind run on this. */
  wallTime: number;
  /** Seconds of WORLD time: wallTime scaled by world.timeScale. Water, leaves and clouds run on this. */
  worldTime: number;
  /** Increments on every hard cut or seek, so cameras and effects can snap instead of easing. */
  cutId: number;
  sceneIndex: number;
  shotIndex: number;
  cam: CameraState;
  light: {
    ambient: LightBlock;
    key: DirectionalBlock;
    rim: DirectionalBlock;
    fog: FogBlock;
    exposure: number;
    bloom: number;
  };
  fx: {
    /** 0 = picture, 1 = black. */
    fade: number;
    /** Depth-of-field bokeh scale. */
    bokeh: number;
    grain: number;
    vignette: number;
    chromatic: number;
  };
  world: { timeScale: number; muffle: number; wind: number };
  /** Smoothed flute analysis, written by the AudioManager every frame. */
  audio: { low: number; mid: number; high: number; energy: number; onset: number };
  stats: FilmStats;
}

export function createFilmState(): FilmState {
  return {
    time: 0,
    progress: 0,
    rate: 0,
    wallTime: 0,
    worldTime: 0,
    cutId: 0,
    sceneIndex: 0,
    shotIndex: 0,
    cam: { px: 0, py: 1.6, pz: 4, tx: 0, ty: 0.6, tz: -10, focal: 35, focus: 8, roll: 0, shake: 0 },
    light: {
      ambient: { r: 0, g: 0, b: 0, i: 0 },
      key: { r: 0, g: 0, b: 0, i: 0, az: 0, el: 45 },
      rim: { r: 0, g: 0, b: 0, i: 0, az: 180, el: 30 },
      fog: { r: 0, g: 0, b: 0, d: 0 },
      exposure: 1,
      bloom: 0.6
    },
    fx: { fade: 1, bokeh: 1.6, grain: 0.32, vignette: 0.55, chromatic: 0.0005 },
    world: { timeScale: 1, muffle: 0, wind: 0.2 },
    audio: { low: 0, mid: 0, high: 0, energy: 0, onset: 0 },
    stats: { fps: 0, frameMs: 0, pixelRatio: 1, calls: 0, triangles: 0, points: 0, lines: 0, geometries: 0, textures: 0, particles: 0 }
  };
}
