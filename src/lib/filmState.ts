/**
 * The film's continuous state: a plain mutable object, NOT React state. The master timeline writes it every frame and
 * the camera, the world, Krishna and the grade read it. React only ever hears about discrete changes (scene, status).
 */

export interface CameraState {
  px: number;
  py: number;
  pz: number;
  tx: number;
  ty: number;
  tz: number;
  /** mm on a 35 mm film back. */
  focal: number;
  /** Metres to the plane in focus. */
  focus: number;
  roll: number;
  /** 0..1 handheld. */
  shake: number;
}

export interface RGB {
  r: number;
  g: number;
  b: number;
}

/** The look of a moment: sky, light and air. Tweened between scene moods by the master timeline. */
export interface Mood {
  skyTop: RGB;
  skyHorizon: RGB;
  /** Sun or moon colour, and where it sits. */
  lamp: RGB;
  lampX: number;
  lampY: number;
  lampSize: number;
  /** Multiplies every drawing: the world's light on the art. */
  tint: RGB;
  fog: RGB;
  fogDensity: number;
  /** 0..1 */
  stars: number;
  clouds: number;
  /** Water colour. */
  water: RGB;
  exposure: number;
  bloom: number;
  vignette: number;
}

export interface ActorState {
  x: number;
  y: number;
  z: number;
  scale: number;
  /** Radians about Y: flips the puppet to face the other way. */
  facing: number;
  opacity: number;
  action: string;
  /** 0 or 1: does his gaze follow the viewer's pointer in this scene? */
  lookAtPointer: number;
}

export interface FilmStats {
  fps: number;
  frameMs: number;
  pixelRatio: number;
  calls: number;
  triangles: number;
  points: number;
  lines: number;
  geometries: number;
  textures: number;
  particles: number;
}

export interface FilmState {
  time: number;
  progress: number;
  rate: number;
  /** Real seconds since the experience began: breath and blinks run on this. */
  wallTime: number;
  /** World seconds: wallTime scaled by world.timeScale, so the world can slow while Krishna keeps moving. */
  worldTime: number;
  cutId: number;
  sceneIndex: number;
  shotIndex: number;
  cam: CameraState;
  mood: Mood;
  actors: Record<"bal" | "kishore", ActorState>;
  fx: {
    /** 0 = picture, 1 = black. */
    fade: number;
    bokeh: number;
    grain: number;
    chromatic: number;
    /** 0..1 magic: how strongly the flute's light-motes and glows show. */
    magic: number;
    /** 0..1 the cosmic sequence taking over. */
    cosmos: number;
  };
  world: { timeScale: number; muffle: number; wind: number };
  /** Pointer in normalised screen space, -1..1: `pointerTarget` is raw, `pointer` is smoothed. */
  pointer: { x: number; y: number };
  pointerTarget: { x: number; y: number };
  audio: { low: number; mid: number; high: number; energy: number; onset: number };
  stats: FilmStats;
}

const rgb = (r: number, g: number, b: number): RGB => ({ r, g, b });

const actor = (): ActorState => ({ x: 0, y: 0, z: 0, scale: 1, facing: 0, opacity: 0, action: "idle", lookAtPointer: 1 });

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
    cam: { px: 0, py: 1.6, pz: 6, tx: 0, ty: 1.2, tz: 0, focal: 40, focus: 6, roll: 0, shake: 0 },
    mood: {
      skyTop: rgb(0.02, 0.03, 0.09),
      skyHorizon: rgb(0.05, 0.07, 0.16),
      lamp: rgb(1, 0.98, 0.9),
      lampX: -0.35,
      lampY: 0.55,
      lampSize: 0.05,
      tint: rgb(1, 1, 1),
      fog: rgb(0.05, 0.07, 0.16),
      fogDensity: 0.02,
      stars: 1,
      clouds: 0.5,
      water: rgb(0.1, 0.25, 0.5),
      exposure: 1,
      bloom: 0.6,
      vignette: 0.5
    },
    actors: { bal: actor(), kishore: actor() },
    fx: { fade: 1, bokeh: 1.4, grain: 0.22, chromatic: 0.0004, magic: 0, cosmos: 0 },
    world: { timeScale: 1, muffle: 0, wind: 0.25 },
    pointer: { x: 0, y: 0 },
    pointerTarget: { x: 0, y: 0 },
    audio: { low: 0, mid: 0, high: 0, energy: 0, onset: 0 },
    stats: { fps: 0, frameMs: 0, pixelRatio: 1, calls: 0, triangles: 0, points: 0, lines: 0, geometries: 0, textures: 0, particles: 0 }
  };
}
