import type { LightingPresetId } from "./lightingPresets";
import type { ShlokaId } from "./shlokas";
import { BAL_MARK, KRISHNA_MARK, aroundMark, bankHeight, type Framing } from "./worldLayout.ts";

/**
 * The film, declaratively. Nothing here touches React or Three.js at runtime; `lib/timelineBuilder.ts` compiles it
 * into one GSAP master timeline (continuous values) and one cue list (discrete events).
 *
 * All times are seconds RELATIVE TO THE START OF THEIR SCENE. A scene's duration is the sum of its shot durations,
 * so shots always tile the scene.
 *
 * Camera poses are authored only where the world exists (Act I so far). An unauthored shot holds the previous pose
 * and shows as "unauthored" in engineering mode. Everything else here (order, timing, beats, cues, lighting, world
 * time) is the film's structure and is real.
 *
 * World space: metres, +Y up. The Yamuna bank at the opening: water surface y = 0, river runs away toward -Z, the
 * first ripple lands near (0, 0, -3), the moon sits behind the river.
 */

export const SCENE_IDS = [
  "INTRO",
  "BIRTH",
  "BAL_KRISHNA",
  "VRINDAVAN",
  "FLUTE",
  "TIME_PASSAGE",
  "TRANSFORMATION",
  "KISHORE",
  "KURUKSHETRA",
  "GITA",
  "VISHWAROOPA",
  "RETURN",
  "FINAL"
] as const;
export type SceneId = (typeof SCENE_IDS)[number];

/** R3F scene components. TIME_PASSAGE shares TransformationScene's world; RETURN shares FinalScene's. */
export type SceneComponentId =
  | "IntroScene"
  | "BirthScene"
  | "BalKrishnaScene"
  | "VrindavanScene"
  | "FluteScene"
  | "TransformationScene"
  | "KishoreKrishnaScene"
  | "KurukshetraScene"
  | "GitaScene"
  | "VishwaroopaScene"
  | "FinalScene";

export type Vec3 = readonly [number, number, number];

export interface CameraPose {
  position: Vec3;
  target: Vec3;
  /** Focal length in mm on a 35 mm film back. */
  focal: number;
  /** Distance from the lens (metres) to the plane in perfect focus, for depth of field. */
  focus: number;
  /** Degrees. */
  roll?: number;
  /** Handheld amount 0..1. Zeroed under reduced motion. */
  shake?: number;
}

export type ShotKind =
  | "black"
  | "establishing"
  | "wide"
  | "medium"
  | "close"
  | "extremeClose"
  | "overTheShoulder"
  | "tracking"
  | "crane"
  | "tilt"
  | "dollyIn"
  | "dollyOut"
  | "pushIn"
  | "pullOut"
  | "orbit"
  | "rackFocus";

export interface ShotDef {
  id: string;
  kind: ShotKind;
  duration: number;
  /** What the shot tells. If it doesn't tell anything, it doesn't belong. */
  intent: string;
  /** Hard cut into this shot: the camera rig snaps instead of easing. */
  cut?: boolean;
  from?: CameraPose;
  to?: CameraPose;
  /** GSAP ease for the whole move. Default "sine.inOut". */
  ease?: string;
}

export type ActorId = "bal" | "kishore" | "arjuna";

/** Names the animation state machine must understand. Each maps to a required clip (see assetSpec.json). */
export type CharacterAction =
  | "IDLE"
  | "LOOK"
  | "WALK"
  | "RUN"
  | "STOP"
  | "SIT"
  | "STAND"
  | "TURN"
  | "GESTURE"
  | "SMILE"
  | "LAUGH"
  | "PICK_FLOWER"
  | "FOLLOW_BUTTERFLY"
  | "TOUCH_WATER"
  | "MAKHAN_ENTER"
  | "MAKHAN_CHECK"
  | "MAKHAN_CLIMB"
  | "MAKHAN_TAKE"
  | "MAKHAN_LAUGH"
  | "FLUTE_RAISE"
  | "FLUTE_PLAY"
  | "FLUTE_LOWER"
  | "STAND_EYES_CLOSED"
  | "EYES_OPEN"
  | "SPEAK"
  | "LOWER_BOW";

export interface BeatDef {
  at: number;
  actor: ActorId;
  action: CharacterAction;
  note?: string;
}

export type AudioBus = "ambience" | "flute" | "voice" | "environment" | "cinematic";

export interface AudioCueDef {
  at: number;
  bus: AudioBus;
  /** Path under public/audio without extension, e.g. "flute/first-note". Resolved by the audio managers. */
  id: string;
  action: "start" | "stop" | "oneShot" | "duck";
  note?: string;
}

export interface ShlokaCueDef {
  id: ShlokaId;
  /** Scene-relative time the first pāda appears. */
  at: number;
  /** Seconds between pādas. Sanskrit is revealed line by line, never all at once. */
  padaGap: number;
  /** Optional speaker attribution (11.32) appears here, before the first pāda. */
  speakerAt?: number;
  /** When the Sanskrit gives way to its meaning. */
  meaningAt: number;
  /** When the verse has fully left the screen. */
  end: number;
}

export interface TitleCueDef {
  at: number;
  duration: number;
  text: string;
  style: "title" | "subtitle" | "greeting";
}

export interface LightingKey {
  at: number;
  preset: LightingPresetId;
  /** Seconds to blend from the previous preset. 0 = instant. */
  blend: number;
}

/** 0 = picture, 1 = black. */
export interface FadeKey {
  at: number;
  to: number;
  duration: number;
}

/**
 * timeScale: how fast the WORLD runs (Krishna's own clock does not follow it). 0.04 = the world pauses.
 * muffle: 0..1 low-pass on all audio. wind: 0..1.
 */
export interface WorldKey {
  at: number;
  duration: number;
  timeScale?: number;
  muffle?: number;
  wind?: number;
}

/** How each scene hands over to the next. Narrative, never a generic fade. */
export type TransitionId =
  | "blackToStorm"
  | "divineLightToDawn"
  | "frozenParticlesToGoldenDust"
  | "cameraSettlesByWater"
  | "noteBecomesTime"
  | "nightSettles"
  | "eyesOpenFluteNote"
  | "vrindavanToDust"
  | "battlefieldFreeze"
  | "silhouetteToUniverse"
  | "universeToPoint"
  | "humanScaleToYamuna"
  | "endTitles";

export interface SceneDef {
  id: SceneId;
  component: SceneComponentId;
  title: string;
  /** Debug key. BIRTH, TIME_PASSAGE and RETURN have none: use [ and ]. */
  debugKey?: string;
  lighting: readonly LightingKey[];
  shots: readonly ShotDef[];
  beats: readonly BeatDef[];
  audio: readonly AudioCueDef[];
  shlokas: readonly ShlokaCueDef[];
  titles: readonly TitleCueDef[];
  fade: readonly FadeKey[];
  world: readonly WorldKey[];
  transitionOut: TransitionId;
}

const shot = (
  id: string,
  kind: ShotKind,
  duration: number,
  intent: string,
  extra: Pick<ShotDef, "cut" | "from" | "to" | "ease"> = {}
): ShotDef => ({ id, kind, duration, intent, ...extra });

// ---------------------------------------------------------------------------------------------------------------
// STAGING. Camera poses are placed around the character's mark (worldLayout.ts), so shots stay framed on Krishna.
// ---------------------------------------------------------------------------------------------------------------
type Mark = { position: readonly [number, number, number]; facing: number };
const on = (mark: Mark, framing: Framing): CameraPose => aroundMark(mark, framing);
const k = (framing: Framing) => on(KRISHNA_MARK, framing);
const bal = (framing: Framing) => on(BAL_MARK, framing);

/** Kishore walks along the bank toward -X (the scene after the transformation), so he never walks into the river. */
export const KISHORE_WALK_MARK: Mark = { position: [2.5, bankHeight(2.5, 0.2), 0.2], facing: -Math.PI / 2 };
/** Where he has walked to after `metres` along that way. */
const walked = (metres: number): Mark => {
  const x = KISHORE_WALK_MARK.position[0] - metres;
  return { position: [x, bankHeight(x, 0.2), 0.2], facing: KISHORE_WALK_MARK.facing };
};

/** The open plain used for Kurukshetra, the teaching and the cosmic form until those worlds exist. */
export const PLAIN_MARK: Mark = { position: [0, 0, 0], facing: 0 };
const plain = (framing: Framing) => on(PLAIN_MARK, framing);

/** Act I, before Krishna: the moon on the water, seen low from beside the bank. */
const MOON_WATER_A: CameraPose = { position: [2.6, 0.45, -2.0], target: [-4.2, 1.6, -20.8], focal: 32, focus: 20 };
const MOON_WATER_B: CameraPose = { position: [2.05, 0.55, -2.9], target: [-4.7, 1.9, -21.4], focal: 32, focus: 20 };

export const SCENES: readonly SceneDef[] = [
  // -------------------------------------------------------------------------------------------------- INTRO
  {
    id: "INTRO",
    component: "IntroScene",
    title: "Yamuna, midnight",
    debugKey: "1",
    lighting: [{ at: 0, preset: "nightMoon", blend: 0 }],
    fade: [
      { at: 0, to: 1, duration: 0 },
      { at: 3.2, to: 0, duration: 2.8 },
      { at: 30, to: 1, duration: 0.04 }
    ],
    world: [
      { at: 0, duration: 0, timeScale: 1, muffle: 0, wind: 0.2 },
      { at: 13.2, duration: 0.6, timeScale: 0.04, muffle: 0.25 },
      { at: 17.5, duration: 2, timeScale: 1, muffle: 0 }
    ],
    shots: [
      shot("black", "black", 3.5, "Black. Only sound: the river, crickets, the night.", { from: MOON_WATER_A, to: MOON_WATER_A }),
      shot("moon_on_water", "dollyIn", 7.5, "The moon on the Yamuna. Midnight. Mist. The far bank a line of trees.", {
        from: MOON_WATER_A,
        to: MOON_WATER_B
      }),
      shot("reveal_krishna", "tracking", 7.5, "The camera drifts to find him: Krishna at the water's edge, against the moon's path. He raises the flute. One note. Everything pauses.", {
        from: MOON_WATER_B,
        to: k({ angle: 2.62, distance: 2.9, height: 1.22, look: 1.35, focal: 35, lead: 3.5 }),
        ease: "sine.inOut"
      }),
      shot("front_medium", "medium", 6, "From the river: Krishna playing, moonlit, the bank dark behind him.", {
        cut: true,
        from: k({ angle: 0.34, distance: 2.7, height: 1.34, look: 1.32, focal: 50 }),
        to: k({ angle: 0.26, distance: 2.25, height: 1.4, look: 1.36, focal: 50 })
      }),
      shot("close", "close", 6, "Close: face, flute, fingers. The melody.", {
        cut: true,
        from: k({ angle: -0.28, distance: 1.1, height: 1.6, look: 1.56, focal: 85, shake: 0.06 }),
        to: k({ angle: -0.2, distance: 0.95, height: 1.6, look: 1.57, focal: 85, shake: 0.06 })
      }),
      shot("title_cards", "black", 7, "Cut to black. KAAL. Then THE MANY FORMS OF KRISHNA.")
    ],
    beats: [
      { at: 0, actor: "kishore", action: "IDLE" },
      { at: 11.6, actor: "kishore", action: "FLUTE_RAISE" },
      { at: 12.8, actor: "kishore", action: "FLUTE_PLAY" }
    ],
    audio: [
      { at: 0, bus: "ambience", id: "ambience/yamuna-night", action: "start", note: "the river and crickets at midnight" },
      { at: 13.2, bus: "flute", id: "flute/first-note", action: "oneShot", note: "one note: everything pauses" },
      { at: 20.1, bus: "flute", id: "flute/kishore-theme", action: "start", note: "after the first note has rung out" },
      { at: 29.6, bus: "flute", id: "flute/kishore-theme", action: "stop" },
      { at: 30.2, bus: "ambience", id: "ambience/yamuna-night", action: "duck", note: "silence for the title" }
    ],
    shlokas: [],
    titles: [
      { at: 30.8, duration: 3.0, text: "KAAL", style: "title" },
      { at: 34.0, duration: 3.0, text: "THE MANY FORMS OF KRISHNA", style: "subtitle" }
    ],
    transitionOut: "blackToStorm"
  },

  // -------------------------------------------------------------------------------------------------- BIRTH
  {
    id: "BIRTH",
    component: "BirthScene",
    title: "Mathura, the storm",
    lighting: [
      { at: 0, preset: "stormNight", blend: 0 },
      { at: 17, preset: "divine", blend: 5 }
    ],
    fade: [
      { at: 0, to: 1, duration: 0 },
      { at: 0.6, to: 0, duration: 1.4 }
    ],
    world: [
      { at: 0, duration: 0, timeScale: 1, muffle: 0, wind: 0.75 },
      { at: 19, duration: 3, wind: 0.1 }
    ],
    shots: [
      shot("storm_clouds", "crane", 5, "Night. Storm. Clouds. Rain in the air. Lightning.", { from: { position: [-2, 1.2, -3.5], target: [-5, 7, -30], focal: 24, focus: 20 }, to: { position: [-2.4, 1.6, -4.6], target: [-5.6, 7.5, -30], focal: 24, focus: 20 } }),
      shot("prison_exterior", "establishing", 5, "The river in the storm, the night he is born. (The Mathura prison kit is pending: TODO.md.)", { from: { position: [6, 0.8, -3], target: [-10, 1.8, -25], focal: 28, focus: 20 }, to: { position: [5, 0.9, -4.2], target: [-10, 1.8, -25], focal: 28, focus: 20 } }),
      shot("door_chains", "close", 5, "The empty bank in the rain, waiting.", { from: k({ angle: 0.7, distance: 6, height: 1.1, look: 0.4, focal: 35 }), to: k({ angle: 0.55, distance: 5, height: 1.0, look: 0.4, focal: 35 }) }),
      shot("light_through_opening", "pushIn", 5, "The clouds open. Light on the water.", { from: { position: [0, 0.6, 1.5], target: [-2, 3, -25], focal: 30, focus: 25 }, to: { position: [0, 0.6, 1.2], target: [-3, 9, -25], focal: 30, focus: 25 } }),
      shot("divine_light", "pushIn", 5, "A divine light. Subtle. The birth is light, sound, silence, camera, emotion.", { from: { position: [0, 0.5, -1.4], target: [-3, 3.5, -30], focal: 32, focus: 25 }, to: { position: [0, 0.45, -2.6], target: [-3.4, 3.8, -30], focal: 32, focus: 25 } })
    ],
    beats: [],
    audio: [
      { at: 0, bus: "ambience", id: "ambience/storm-rain", action: "start" },
      { at: 3, bus: "environment", id: "effects/thunder", action: "oneShot" },
      { at: 9, bus: "environment", id: "effects/door-creak", action: "oneShot" },
      { at: 11, bus: "environment", id: "effects/thunder", action: "oneShot" },
      { at: 12.5, bus: "environment", id: "effects/chain-rattle", action: "oneShot" },
      { at: 19, bus: "ambience", id: "ambience/storm-rain", action: "duck", note: "near-silence for the birth" },
      { at: 19.5, bus: "cinematic", id: "score/divine-hum", action: "start" }
    ],
    shlokas: [],
    titles: [],
    transitionOut: "divineLightToDawn"
  },

  // ---------------------------------------------------------------------------------------------- BAL KRISHNA
  {
    id: "BAL_KRISHNA",
    component: "BalKrishnaScene",
    title: "Bal Krishna",
    debugKey: "2",
    lighting: [{ at: 0, preset: "dawn", blend: 6 }],
    fade: [],
    world: [
      { at: 0, duration: 0, wind: 0.25 },
      { at: 60.5, duration: 4, timeScale: 0.08, muffle: 0.6, wind: 0.9 }
    ],
    shots: [
      shot("vrindavan_dawn_wide", "establishing", 8, "Krishna is small inside a massive, golden, waking Vrindavan. Cows far away.", { from: bal({ angle: 0.75, distance: 9, height: 1.7, look: 0.6, focal: 28 }), to: bal({ angle: 0.6, distance: 7.5, height: 1.5, look: 0.6, focal: 28 }) }),
      shot("through_the_grove", "tracking", 8, "The camera moves through trees. Children laugh somewhere. Birds. Wind.", { from: bal({ angle: 1.35, distance: 6, height: 1.2, look: 0.6, focal: 35 }), to: bal({ angle: 0.95, distance: 4.4, height: 1.05, look: 0.62, focal: 35 }) }),
      shot("krishna_enters", "medium", 6, "The camera turns. Actual Bal Krishna runs in, stops, looks, smiles. This is where the viewer knows: this is Krishna.", { from: bal({ angle: 0.4, distance: 2.6, height: 0.95, look: 0.72, focal: 40 }), to: bal({ angle: 0.28, distance: 2.1, height: 0.92, look: 0.74, focal: 40 }) }),
      shot("butterfly_closeup", "close", 5, "A flower. A butterfly lands near him.", { from: bal({ angle: -0.32, distance: 1.05, height: 0.9, look: 0.84, focal: 70 }), to: bal({ angle: -0.26, distance: 0.95, height: 0.9, look: 0.85, focal: 70 }) }),
      shot("follow_to_yamuna", "tracking", 8, "He follows the butterfly, then runs toward the river.", { from: bal({ angle: 2.4, distance: 3, height: 1.1, look: 0.7, focal: 35, lead: 3 }), to: bal({ angle: 2.75, distance: 3.2, height: 1.15, look: 0.7, focal: 35, lead: 3 }) }),
      shot("yamuna_reflection", "medium", 7, "He stops. His reflection. He touches the water; it ripples. A flute-like sound. He looks to the forest.", { from: bal({ angle: -0.85, distance: 2.3, height: 0.7, look: 0.7, focal: 50 }), to: bal({ angle: -0.7, distance: 2.0, height: 0.72, look: 0.72, focal: 50 }) }),
      shot("cows_meadow", "medium", 5, "Krishna among the cows.", { from: bal({ angle: 0.95, distance: 6.5, height: 1.4, look: 0.6, focal: 30 }), to: bal({ angle: 0.8, distance: 6, height: 1.35, look: 0.6, focal: 30 }) }),
      shot("makhan_enter", "medium", 5, "A small home. He looks around. The butter pot.", { from: bal({ angle: 0.18, distance: 1.9, height: 0.8, look: 0.66, focal: 45 }), to: bal({ angle: 0.12, distance: 1.6, height: 0.8, look: 0.68, focal: 45 }) }),
      shot("makhan_close", "close", 8, "Checks the door. Smiles. Climbs. Takes butter. A little lands on his face. He laughs. Not slapstick.", { from: bal({ angle: 0.06, distance: 1.0, height: 0.88, look: 0.8, focal: 75 }), to: bal({ angle: 0.02, distance: 0.85, height: 0.9, look: 0.84, focal: 75 }) }),
      shot("face_pushin", "pushIn", 5, "Close to his face. He looks toward the camera. Wind rises. The feather moves.", { from: bal({ angle: 0, distance: 1.25, height: 0.92, look: 0.9, focal: 85 }), to: bal({ angle: 0, distance: 0.8, height: 0.93, look: 0.91, focal: 85 }) }),
      shot("time_freeze", "extremeClose", 10, "Time slows. Water, leaves, butterfly freeze. Krishna keeps moving. One particle leaves him. Then another.", { from: bal({ angle: 0.02, distance: 0.72, height: 0.93, look: 0.92, focal: 100 }), to: bal({ angle: 0.04, distance: 0.66, height: 0.93, look: 0.92, focal: 100 }) })
    ],
    beats: [
      { at: 16, actor: "bal", action: "RUN" },
      { at: 19, actor: "bal", action: "STOP" },
      { at: 19.8, actor: "bal", action: "LOOK" },
      { at: 21, actor: "bal", action: "SMILE" },
      { at: 21.5, actor: "bal", action: "PICK_FLOWER" },
      { at: 24, actor: "bal", action: "SMILE", note: "the butterfly lands" },
      { at: 27, actor: "bal", action: "FOLLOW_BUTTERFLY" },
      { at: 30, actor: "bal", action: "RUN", note: "toward the Yamuna" },
      { at: 35, actor: "bal", action: "STOP" },
      { at: 36, actor: "bal", action: "LOOK", note: "his reflection" },
      { at: 38, actor: "bal", action: "TOUCH_WATER" },
      { at: 41, actor: "bal", action: "LOOK", note: "toward the forest" },
      { at: 43, actor: "bal", action: "WALK", note: "with the cows" },
      { at: 45, actor: "bal", action: "GESTURE" },
      { at: 47, actor: "bal", action: "MAKHAN_ENTER" },
      { at: 50, actor: "bal", action: "MAKHAN_CHECK" },
      { at: 53, actor: "bal", action: "MAKHAN_CLIMB" },
      { at: 55.5, actor: "bal", action: "MAKHAN_TAKE" },
      { at: 57.5, actor: "bal", action: "MAKHAN_LAUGH" },
      { at: 60, actor: "bal", action: "IDLE" },
      { at: 62, actor: "bal", action: "LOOK", note: "into the camera" }
    ],
    audio: [
      { at: 0, bus: "ambience", id: "ambience/vrindavan-dawn", action: "start", note: "birds, wind, cows" },
      { at: 9, bus: "environment", id: "effects/children-laughter", action: "oneShot" },
      { at: 40, bus: "flute", id: "flute/call-hint", action: "oneShot", note: "the flute-like sound he hears" },
      { at: 53, bus: "environment", id: "effects/butter-pot", action: "oneShot" },
      { at: 60.5, bus: "cinematic", id: "effects/wind-rise", action: "start" }
    ],
    shlokas: [{ id: "BG-4-7", at: 65.5, padaGap: 1.7, meaningAt: 72.3, end: 75 }],
    titles: [],
    transitionOut: "frozenParticlesToGoldenDust"
  },

  // ------------------------------------------------------------------------------------------------ VRINDAVAN
  {
    id: "VRINDAVAN",
    component: "VrindavanScene",
    title: "Vrindavan, golden hour",
    debugKey: "3",
    lighting: [{ at: 0, preset: "goldenHour", blend: 4 }],
    fade: [],
    world: [{ at: 0, duration: 2, timeScale: 1, muffle: 0, wind: 0.3 }],
    shots: [
      shot("crane_golden_hour", "crane", 8, "Slow crane over a wide golden landscape: Yamuna, kadamba trees, cows, birds, distant temple.", { from: bal({ angle: 0.5, distance: 10, height: 4.5, look: 0.5, focal: 28 }), to: bal({ angle: 0.35, distance: 7.5, height: 2.2, look: 0.6, focal: 28 }) }),
      shot("village_life", "medium", 5, "Villagers, dust in the air, warm light. Life before the flute.", { from: bal({ angle: 1.6, distance: 5, height: 1.5, look: 0.7, focal: 35 }), to: bal({ angle: 1.4, distance: 4.4, height: 1.4, look: 0.7, focal: 35 }) }),
      shot("krishna_at_yamuna", "medium", 6, "Krishna at the water's edge. He sits.", { from: bal({ angle: 2.6, distance: 2.8, height: 1.0, look: 0.7, focal: 40, lead: 2 }), to: bal({ angle: 2.45, distance: 2.4, height: 0.95, look: 0.7, focal: 40, lead: 2 }) }),
      shot("krishna_closeup", "close", 5, "Close. He looks at the water.", { from: bal({ angle: -0.42, distance: 1.1, height: 0.86, look: 0.85, focal: 70 }), to: bal({ angle: -0.36, distance: 1.0, height: 0.87, look: 0.86, focal: 70 }) })
    ],
    beats: [
      { at: 13, actor: "bal", action: "WALK" },
      { at: 15.5, actor: "bal", action: "SIT" },
      { at: 19, actor: "bal", action: "LOOK", note: "at the water" }
    ],
    audio: [
      { at: 0, bus: "ambience", id: "ambience/vrindavan-evening", action: "start" },
      { at: 3, bus: "environment", id: "effects/temple-bell", action: "oneShot" }
    ],
    shlokas: [],
    titles: [],
    transitionOut: "cameraSettlesByWater"
  },

  // ---------------------------------------------------------------------------------------------------- FLUTE
  {
    id: "FLUTE",
    component: "FluteScene",
    title: "The flute",
    debugKey: "4",
    lighting: [
      { at: 0, preset: "sunset", blend: 3 },
      { at: 9, preset: "fluteMoon", blend: 12 }
    ],
    fade: [],
    world: [{ at: 0, duration: 0, timeScale: 1, muffle: 0, wind: 0.2 }],
    shots: [
      shot("approach_slow", "dollyIn", 7, "The camera slowly approaches. Silence gathers.", { from: bal({ angle: 0.42, distance: 4, height: 1.0, look: 0.7, focal: 40 }), to: bal({ angle: 0.3, distance: 2.6, height: 0.95, look: 0.72, focal: 40 }) }),
      shot("looks_at_water", "medium", 4, "He looks at the water.", { from: bal({ angle: 2.5, distance: 2.4, height: 0.9, look: 0.7, focal: 45, lead: 2 }), to: bal({ angle: 2.4, distance: 2.2, height: 0.9, look: 0.7, focal: 45, lead: 2 }) }),
      shot("hands_flute", "extremeClose", 5, "Hand. Flute. Fingers. He raises it.", { from: bal({ angle: 0.3, distance: 0.95, height: 0.72, look: 0.62, focal: 85 }), to: bal({ angle: 0.25, distance: 0.85, height: 0.72, look: 0.63, focal: 85 }) }),
      shot("face_eyes", "close", 4, "Eyes. The peacock feather.", { from: bal({ angle: -0.1, distance: 0.82, height: 0.92, look: 0.9, focal: 100 }), to: bal({ angle: -0.08, distance: 0.76, height: 0.92, look: 0.9, focal: 100 }) }),
      shot("one_note", "rackFocus", 3, "One note. Rack focus to the water.", { from: bal({ angle: 0.2, distance: 1.6, height: 0.9, look: 0.8, focal: 60 }), to: bal({ angle: 0.2, distance: 1.5, height: 0.9, look: 0.8, focal: 60 }) }),
      shot("world_responds", "wide", 5, "The world breathes with the flute: water, grass, fireflies, leaves, birds, light.", { from: bal({ angle: 0.8, distance: 6, height: 1.8, look: 0.5, focal: 30 }), to: bal({ angle: 0.75, distance: 7, height: 2.1, look: 0.5, focal: 30 }) })
    ],
    beats: [
      { at: 0, actor: "bal", action: "SIT" },
      { at: 7, actor: "bal", action: "LOOK" },
      { at: 9, actor: "bal", action: "GESTURE", note: "takes the flute" },
      { at: 11, actor: "bal", action: "FLUTE_RAISE" },
      { at: 20.5, actor: "bal", action: "FLUTE_PLAY" },
      { at: 27, actor: "bal", action: "FLUTE_LOWER" }
    ],
    audio: [
      { at: 0, bus: "ambience", id: "ambience/yamuna-evening", action: "start" },
      { at: 16, bus: "ambience", id: "ambience/yamuna-evening", action: "duck", note: "silence" },
      { at: 20.5, bus: "flute", id: "flute/first-note", action: "oneShot", note: "one note; analyser starts driving the world" },
      { at: 23, bus: "flute", id: "flute/bal-motif", action: "start" }
    ],
    shlokas: [],
    titles: [],
    transitionOut: "noteBecomesTime"
  },

  // --------------------------------------------------------------------------------------------- TIME PASSAGE
  {
    id: "TIME_PASSAGE",
    component: "TransformationScene",
    title: "The passage of time",
    lighting: [
      { at: 0, preset: "dawn", blend: 2 },
      { at: 5, preset: "goldenHour", blend: 3 },
      { at: 10, preset: "sunset", blend: 3 },
      { at: 14, preset: "dusk", blend: 3 },
      { at: 18, preset: "starNight", blend: 5 }
    ],
    fade: [],
    world: [
      { at: 0.5, duration: 2, timeScale: 8, muffle: 0.3 },
      { at: 20, duration: 3, timeScale: 1, muffle: 0 }
    ],
    shots: [
      shot("orbit_dusk", "orbit", 9, "Krishna stands by the Yamuna. The camera slowly circles. Days pass around him: clouds, light, shadows.", { from: bal({ angle: 0, distance: 3.2, height: 1.1, look: 0.62, focal: 35 }), to: bal({ angle: 1.7, distance: 3.2, height: 1.15, look: 0.62, focal: 35 }) }),
      shot("orbit_night", "orbit", 8, "Sunset. Night. Trees change subtly. He does not.", { from: bal({ angle: 1.7, distance: 3.2, height: 1.15, look: 0.62, focal: 35 }), to: bal({ angle: 3.4, distance: 3.4, height: 1.2, look: 0.62, focal: 35 }) }),
      shot("stars_moon", "crane", 7, "Up to the stars and the moon. Time has passed.", { from: bal({ angle: 3.4, distance: 3.4, height: 1.2, look: 1.5, focal: 28 }), to: bal({ angle: 3.5, distance: 3.6, height: 1.3, look: 7, focal: 28 }) })
    ],
    beats: [{ at: 0, actor: "bal", action: "IDLE", note: "Krishna's own clock keeps its pace while the world runs" }],
    audio: [
      { at: 0, bus: "cinematic", id: "effects/time-rush", action: "start" },
      { at: 18, bus: "ambience", id: "ambience/night-crickets", action: "start" }
    ],
    shlokas: [],
    titles: [],
    transitionOut: "nightSettles"
  },

  // ------------------------------------------------------------------------------------------- TRANSFORMATION
  {
    id: "TRANSFORMATION",
    component: "TransformationScene",
    title: "Bal to Kishore",
    debugKey: "5",
    lighting: [
      { at: 0, preset: "starNight", blend: 0 },
      { at: 34, preset: "fluteMoon", blend: 5 }
    ],
    fade: [],
    world: [{ at: 0, duration: 0, wind: 0.3 }, { at: 4, duration: 8, wind: 0.9 }],
    shots: [
      shot("stillness", "medium", 4, "Phase 1-2: Bal Krishna fully visible. The wind begins. The feather moves.", { from: k({ angle: 0.3, distance: 2.4, height: 0.9, look: 0.7, focal: 45 }), to: k({ angle: 0.26, distance: 2.2, height: 0.9, look: 0.7, focal: 45 }) }),
      shot("first_particle", "close", 5, "Phase 3-4: one particle leaves the feather. Then clothing.", { from: k({ angle: -0.2, distance: 1.0, height: 0.95, look: 0.9, focal: 85 }), to: k({ angle: -0.16, distance: 0.92, height: 0.95, look: 0.9, focal: 85 }) }),
      shot("particles_leave", "medium", 9, "Phase 5-7: jewelry, hair, arms and body give up their particles.", { from: k({ angle: 0.5, distance: 2.4, height: 1.0, look: 0.7, focal: 40 }), to: k({ angle: 0.9, distance: 2.5, height: 1.05, look: 0.7, focal: 40 }) }),
      shot("partial_particles", "orbit", 6, "Phase 8-9: partly matter, partly light. Particles orbit him.", { from: k({ angle: 0.9, distance: 2.5, height: 1.05, look: 0.7, focal: 40 }), to: k({ angle: 2.0, distance: 2.6, height: 1.1, look: 0.75, focal: 40 }) }),
      shot("through_particles", "tracking", 6, "Phase 10-11: the camera moves through the particles. They become stars.", { from: k({ angle: 2.0, distance: 2.6, height: 1.1, look: 0.75, focal: 40 }), to: k({ angle: 3.0, distance: 2.2, height: 1.2, look: 0.9, focal: 40 }) }),
      shot("converge", "wide", 4, "Phase 12-13: the stars converge. An older form begins.", { from: k({ angle: 3.4, distance: 5, height: 1.6, look: 1.0, focal: 32 }), to: k({ angle: 3.5, distance: 4.6, height: 1.5, look: 1.0, focal: 32 }) }),
      shot("reconstruct", "pushIn", 4, "Phase 14-18: face, body, clothing, feather, flute.", { from: k({ angle: 0.2, distance: 2.8, height: 1.4, look: 1.2, focal: 45 }), to: k({ angle: 0.16, distance: 2.2, height: 1.45, look: 1.3, focal: 45 }) }),
      shot("eyes_open", "extremeClose", 2, "Phase 19: Kishore Krishna opens his eyes. Silence.", { from: k({ angle: 0.05, distance: 0.78, height: 1.6, look: 1.58, focal: 100 }), to: k({ angle: 0.05, distance: 0.74, height: 1.6, look: 1.58, focal: 100 }) })
    ],
    beats: [
      { at: 0, actor: "bal", action: "IDLE" },
      { at: 34, actor: "kishore", action: "STAND_EYES_CLOSED" },
      { at: 38, actor: "kishore", action: "EYES_OPEN" }
    ],
    audio: [
      { at: 0, bus: "cinematic", id: "score/time-drone", action: "start" },
      { at: 5, bus: "cinematic", id: "effects/particle-shimmer", action: "start" },
      { at: 30, bus: "cinematic", id: "score/reform-swell", action: "start" },
      { at: 38, bus: "cinematic", id: "score/time-drone", action: "duck", note: "silence" }
    ],
    shlokas: [],
    titles: [],
    transitionOut: "eyesOpenFluteNote"
  },

  // --------------------------------------------------------------------------------------------------- KISHORE
  {
    id: "KISHORE",
    component: "KishoreKrishnaScene",
    title: "Kishore Krishna",
    debugKey: "6",
    lighting: [
      { at: 0, preset: "fluteMoon", blend: 0 },
      { at: 10, preset: "dawn", blend: 8 },
      { at: 22, preset: "dusty", blend: 6 }
    ],
    fade: [],
    world: [
      { at: 0, duration: 0, timeScale: 1, wind: 0.2 },
      { at: 10, duration: 8, wind: 0.5 },
      { at: 22, duration: 6, wind: 1 }
    ],
    shots: [
      shot("reveal", "dollyIn", 5, "Graceful, calm, timeless. He plays the flute.", { from: on(KISHORE_WALK_MARK, { angle: 0.45, distance: 3, height: 1.3, look: 1.3, focal: 45 }), to: on(KISHORE_WALK_MARK, { angle: 0.35, distance: 2.5, height: 1.35, look: 1.35, focal: 45 }) }),
      shot("horizon", "medium", 5, "He lowers the flute and looks toward the horizon. A subtle smile.", { from: on(KISHORE_WALK_MARK, { angle: 2.7, distance: 2.4, height: 1.5, look: 1.5, focal: 45, lead: 5 }), to: on(KISHORE_WALK_MARK, { angle: 2.8, distance: 2.3, height: 1.5, look: 1.5, focal: 45, lead: 5 }) }),
      shot("walk_behind", "tracking", 12, "Camera behind him. He walks toward the horizon through Vrindavan. The landscape begins to change.", { from: on(walked(0), { angle: Math.PI, distance: 3, height: 1.6, look: 1.4, focal: 40, lead: 6, shake: 0.15 }), to: on(walked(10.8), { angle: Math.PI, distance: 3, height: 1.6, look: 1.4, focal: 40, lead: 6, shake: 0.15 }) }),
      shot("pull_back_dust", "pullOut", 8, "Birds vanish. The flute stops. The camera moves backward. Trees become silhouettes.", { from: on(walked(10.8), { angle: 2.8, distance: 3.5, height: 1.8, look: 1.3, focal: 35 }), to: on(walked(10.8), { angle: 2.6, distance: 9, height: 3.5, look: 1.2, focal: 35 }) })
    ],
    beats: [
      { at: 0, actor: "kishore", action: "FLUTE_PLAY" },
      { at: 4.5, actor: "kishore", action: "FLUTE_LOWER" },
      { at: 5, actor: "kishore", action: "LOOK", note: "toward the horizon" },
      { at: 8, actor: "kishore", action: "TURN" },
      { at: 10, actor: "kishore", action: "WALK" },
      { at: 22, actor: "kishore", action: "STOP" }
    ],
    audio: [
      { at: 0.3, bus: "flute", id: "flute/kishore-theme", action: "start" },
      { at: 10, bus: "ambience", id: "ambience/vrindavan-dawn", action: "start" },
      { at: 22, bus: "flute", id: "flute/kishore-theme", action: "stop" },
      { at: 22, bus: "ambience", id: "ambience/vrindavan-dawn", action: "stop", note: "birds disappear" },
      { at: 22, bus: "ambience", id: "ambience/wind-harsh", action: "start" }
    ],
    shlokas: [{ id: "BG-2-47", at: 10.6, padaGap: 2.2, meaningAt: 19.6, end: 24 }],
    titles: [],
    transitionOut: "vrindavanToDust"
  },

  // ---------------------------------------------------------------------------------------------- KURUKSHETRA
  {
    id: "KURUKSHETRA",
    component: "KurukshetraScene",
    title: "Kurukshetra",
    debugKey: "7",
    lighting: [{ at: 0, preset: "dusty", blend: 3 }],
    fade: [],
    world: [
      { at: 0, duration: 0, timeScale: 1, muffle: 0, wind: 0.8 },
      { at: 38, duration: 2, timeScale: 0.5 }
    ],
    shots: [
      shot("army_reveal", "wide", 9, "Enormous. Dust, dark clouds, silhouettes to the horizon.", { from: plain({ angle: 0.6, distance: 14, height: 3, look: 1.2, focal: 28 }), to: plain({ angle: 0.5, distance: 11, height: 2.4, look: 1.2, focal: 28 }) }),
      shot("chariot_anchor", "medium", 5, "Krishna's chariot is the visual anchor.", { from: plain({ angle: 0.3, distance: 5, height: 1.6, look: 1.3, focal: 35 }), to: plain({ angle: 0.25, distance: 4.4, height: 1.6, look: 1.3, focal: 35 }) }),
      shot("arjuna_lowers_bow", "overTheShoulder", 7, "Arjuna, overwhelmed, lowers his weapon. Battle sound falls away.", { from: plain({ angle: 2.8, distance: 2, height: 1.7, look: 1.5, focal: 40, lead: 3 }), to: plain({ angle: 2.9, distance: 1.9, height: 1.7, look: 1.5, focal: 40, lead: 3 }) }),
      shot("krishna_calm_close", "close", 5, "Chaos around Krishna. Peace inside Krishna. No exaggerated acting.", { from: plain({ angle: 0.12, distance: 1.1, height: 1.6, look: 1.57, focal: 85 }), to: plain({ angle: 0.08, distance: 1.0, height: 1.6, look: 1.57, focal: 85 }) }),
      shot("weapon_strike", "close", 3, "2.23: weapons cannot cut the Self.", { cut: true, from: plain({ angle: -0.55, distance: 1.3, height: 1.5, look: 1.45, focal: 70 }), to: plain({ angle: -0.5, distance: 1.2, height: 1.5, look: 1.45, focal: 70 }) }),
      shot("fire", "close", 3, "Fire cannot burn it.", { cut: true, from: plain({ angle: 0.55, distance: 1.2, height: 1.45, look: 1.45, focal: 70 }), to: plain({ angle: 0.5, distance: 1.1, height: 1.45, look: 1.45, focal: 70 }) }),
      shot("water", "close", 3, "Water cannot wet it.", { cut: true, from: plain({ angle: -0.2, distance: 0.95, height: 1.6, look: 1.56, focal: 85 }), to: plain({ angle: -0.18, distance: 0.9, height: 1.6, look: 1.56, focal: 85 }) }),
      shot("wind", "close", 3, "Wind cannot dry it.", { cut: true, from: plain({ angle: 0.3, distance: 1.4, height: 1.55, look: 1.5, focal: 60 }), to: plain({ angle: 0.28, distance: 1.3, height: 1.55, look: 1.5, focal: 60 }) }),
      shot("self_remains", "medium", 4, "Arjuna remains. The battlefield continues. The Self is not destroyed.", { cut: true, from: plain({ angle: 0.2, distance: 3.5, height: 1.5, look: 1.2, focal: 40 }), to: plain({ angle: 0.2, distance: 3.2, height: 1.5, look: 1.2, focal: 40 }) })
    ],
    beats: [
      { at: 9, actor: "kishore", action: "IDLE", note: "charioteer, calm" },
      { at: 14, actor: "arjuna", action: "LOWER_BOW" },
      { at: 21, actor: "kishore", action: "LOOK", note: "at Arjuna" },
      { at: 24, actor: "kishore", action: "SPEAK", note: "calm, not theatrical" },
      { at: 38, actor: "arjuna", action: "IDLE" }
    ],
    audio: [
      { at: 0, bus: "ambience", id: "ambience/battlefield-wind", action: "start" },
      { at: 0, bus: "environment", id: "effects/army-distant", action: "start" },
      { at: 14, bus: "environment", id: "effects/army-distant", action: "duck", note: "battle becomes distant" }
    ],
    shlokas: [{ id: "BG-2-23", at: 26, padaGap: 3, meaningAt: 38.2, end: 42 }],
    titles: [],
    transitionOut: "battlefieldFreeze"
  },

  // ------------------------------------------------------------------------------------------------------ GITA
  {
    id: "GITA",
    component: "GitaScene",
    title: "The teaching",
    debugKey: "8",
    lighting: [{ at: 0, preset: "dramatic", blend: 3 }],
    fade: [],
    world: [{ at: 0, duration: 2, timeScale: 0.12, muffle: 0.4, wind: 0.05 }],
    shots: [
      shot("freeze_orbit", "orbit", 9, "The battlefield almost freezes. The camera slowly circles Krishna and Arjuna.", { from: plain({ angle: 0, distance: 3.2, height: 1.45, look: 1.3, focal: 40 }), to: plain({ angle: 1.2, distance: 3.2, height: 1.5, look: 1.3, focal: 40 }) }),
      shot("krishna_speaks", "close", 9, "A quiet philosophical moment.", { from: plain({ angle: 0.15, distance: 1.1, height: 1.6, look: 1.56, focal: 85 }), to: plain({ angle: 0.1, distance: 1.0, height: 1.6, look: 1.56, focal: 85 }) }),
      shot("human_silhouette", "medium", 7, "A human silhouette. Particles. Consciousness.", { from: plain({ angle: Math.PI, distance: 4, height: 1.4, look: 1.2, focal: 40 }), to: plain({ angle: 3.05, distance: 4.4, height: 1.5, look: 1.3, focal: 40 }) }),
      shot("scale_expand", "pullOut", 9, "Human scale begins to expand toward the cosmic.", { from: plain({ angle: 3.05, distance: 4.4, height: 1.5, look: 1.3, focal: 40 }), to: plain({ angle: 2.9, distance: 20, height: 8, look: 1.5, focal: 32 }) })
    ],
    beats: [
      { at: 0, actor: "arjuna", action: "IDLE", note: "listening" },
      { at: 9, actor: "kishore", action: "SPEAK" }
    ],
    audio: [
      { at: 0, bus: "cinematic", id: "score/gita-hush", action: "start" },
      { at: 0, bus: "ambience", id: "ambience/battlefield-wind", action: "duck" }
    ],
    shlokas: [
      { id: "BG-9-22", at: 9.5, padaGap: 2, meaningAt: 17.5, end: 22 },
      { id: "BG-15-7", at: 22.5, padaGap: 2.2, meaningAt: 31.3, end: 34 }
    ],
    titles: [],
    transitionOut: "silhouetteToUniverse"
  },

  // ------------------------------------------------------------------------------------------- VISHWAROOPA
  {
    id: "VISHWAROOPA",
    component: "VishwaroopaScene",
    title: "Vishwaroopa",
    debugKey: "9",
    lighting: [{ at: 0, preset: "cosmic", blend: 3 }],
    fade: [],
    world: [{ at: 0, duration: 2, timeScale: 1, muffle: 0, wind: 0.4 }],
    shots: [
      shot("eyes_luminous", "extremeClose", 5, "Krishna's eyes become luminous. The cosmos emerges from him, not behind him.", { from: plain({ angle: 0, distance: 0.62, height: 1.6, look: 1.6, focal: 100 }), to: plain({ angle: 0, distance: 0.58, height: 1.6, look: 1.6, focal: 100 }) }),
      shot("skin_to_stars", "close", 7, "Skin becomes stars.", { from: plain({ angle: 0.3, distance: 1.2, height: 1.5, look: 1.4, focal: 70 }), to: plain({ angle: 0.4, distance: 1.5, height: 1.5, look: 1.35, focal: 70 }) }),
      shot("body_to_galaxies", "pullOut", 9, "The body becomes galaxies.", { from: plain({ angle: 0.4, distance: 2, height: 1.4, look: 1.2, focal: 45 }), to: plain({ angle: 0.5, distance: 12, height: 3, look: 1.5, focal: 35 }) }),
      shot("multiple_forms", "orbit", 8, "Multiple forms. Planets. Stars.", { from: plain({ angle: 0.5, distance: 12, height: 3, look: 1.5, focal: 35 }), to: plain({ angle: 1.6, distance: 12, height: 3.5, look: 1.5, focal: 35 }) }),
      shot("creation_destruction", "wide", 9, "Creation. Destruction. Time. The darkest, most powerful moment: overwhelming, not horror.", { from: plain({ angle: 1.6, distance: 18, height: 5, look: 2, focal: 28 }), to: plain({ angle: 1.9, distance: 18, height: 5.5, look: 2, focal: 28 }) }),
      shot("time_infinity", "dollyOut", 8, "Infinite faces, eyes, forms. Everything exists inside Krishna.", { from: plain({ angle: 1.9, distance: 18, height: 5.5, look: 2, focal: 28 }), to: plain({ angle: 2.1, distance: 40, height: 12, look: 3, focal: 28 }) })
    ],
    beats: [{ at: 0, actor: "kishore", action: "IDLE" }],
    audio: [
      { at: 0, bus: "flute", id: "flute/kishore-theme", action: "stop", note: "the flute disappears" },
      { at: 1, bus: "cinematic", id: "score/cosmic-drone", action: "start" },
      { at: 6, bus: "ambience", id: "ambience/cosmic-wind", action: "start" },
      { at: 12, bus: "cinematic", id: "score/choir-pad", action: "start" },
      { at: 18, bus: "cinematic", id: "effects/metal-resonance", action: "start" },
      { at: 22, bus: "cinematic", id: "effects/heartbeat", action: "start" },
      { at: 27, bus: "cinematic", id: "*", action: "duck", note: "true silence before the line" },
      { at: 34, bus: "cinematic", id: "score/massive-swell", action: "start", note: "massive but controlled: low, choir, wind, metal, bells" }
    ],
    shlokas: [{ id: "BG-11-32", at: 30, speakerAt: 28.4, padaGap: 3.2, meaningAt: 42.8, end: 46 }],
    titles: [],
    transitionOut: "universeToPoint"
  },

  // ---------------------------------------------------------------------------------------------------- RETURN
  {
    id: "RETURN",
    component: "FinalScene",
    title: "Return",
    lighting: [
      { at: 0, preset: "void", blend: 6 },
      { at: 14, preset: "finalRim", blend: 3 }
    ],
    fade: [],
    world: [{ at: 0, duration: 0, timeScale: 1, muffle: 0, wind: 0 }],
    shots: [
      shot("collapse", "pullOut", 6, "Galaxies, stars, battlefield, Arjuna all collapse. The camera keeps moving backward.", { from: plain({ angle: 2.1, distance: 40, height: 12, look: 3, focal: 28 }), to: plain({ angle: 2.1, distance: 80, height: 20, look: 3, focal: 28 }) }),
      shot("single_point", "black", 4, "Everything is one point of light.", { from: plain({ angle: 0, distance: 0.5, height: 1.6, look: 1.6, focal: 120 }), to: plain({ angle: 0, distance: 0.5, height: 1.6, look: 1.6, focal: 120 }) }),
      shot("eye_reveal", "extremeClose", 5, "The point becomes Krishna's eye.", { from: plain({ angle: 0, distance: 0.5, height: 1.6, look: 1.6, focal: 120 }), to: plain({ angle: 0.05, distance: 0.7, height: 1.6, look: 1.6, focal: 100 }) }),
      shot("krishna_human", "medium", 12, "Krishna. Human-sized. Calm. Silent. No cosmic effect. The emotional climax.", { from: plain({ angle: 0.2, distance: 3, height: 1.5, look: 1.4, focal: 45 }), to: plain({ angle: 0.16, distance: 2.4, height: 1.52, look: 1.42, focal: 45 }) })
    ],
    beats: [
      { at: 10, actor: "kishore", action: "IDLE" },
      { at: 15.5, actor: "kishore", action: "SPEAK" }
    ],
    audio: [
      { at: 0, bus: "cinematic", id: "effects/collapse-sweep", action: "start" },
      { at: 6, bus: "cinematic", id: "*", action: "duck", note: "silence" }
    ],
    shlokas: [{ id: "BG-18-66", at: 15.6, padaGap: 2.2, meaningAt: 24.4, end: 27 }],
    titles: [],
    transitionOut: "humanScaleToYamuna"
  },

  // ---------------------------------------------------------------------------------------------------- FINAL
  {
    id: "FINAL",
    component: "FinalScene",
    title: "Yamuna, again",
    debugKey: "0",
    lighting: [
      { at: 0, preset: "nightMoon", blend: 2 },
      { at: 7, preset: "finalRim", blend: 5 }
    ],
    fade: [
      { at: 0, to: 1, duration: 0 },
      { at: 0.5, to: 0, duration: 2.5 },
      { at: 26.5, to: 1, duration: 3.5 }
    ],
    world: [{ at: 0, duration: 0, timeScale: 1, muffle: 0, wind: 0.2 }],
    shots: [
      shot("yamuna_night_return", "wide", 7, "Same place as the opening. Night. Everything feels different.", { from: k({ angle: 0.42, distance: 12, height: 2.2, look: 1.0, focal: 32 }), to: k({ angle: 0.36, distance: 10, height: 2.0, look: 1.0, focal: 32 }) }),
      shot("approach_krishna", "dollyIn", 10, "The camera slowly approaches Krishna by the water.", { from: k({ angle: 0.26, distance: 6, height: 1.5, look: 1.3, focal: 45 }), to: k({ angle: 0.2, distance: 2.6, height: 1.45, look: 1.38, focal: 45 }) }),
      shot("looks_at_viewer", "close", 7, "He does not speak. He looks at the viewer. A small smile.", { from: k({ angle: 0.05, distance: 1.5, height: 1.58, look: 1.55, focal: 75 }), to: k({ angle: 0.04, distance: 1.3, height: 1.58, look: 1.56, focal: 75 }) }),
      shot("final_note", "pushIn", 6, "He raises the flute. One final note. A ripple. The feather moves. Slowly to black.", { from: k({ angle: 0.16, distance: 2.2, height: 1.45, look: 1.4, focal: 55 }), to: k({ angle: 0.14, distance: 1.8, height: 1.48, look: 1.42, focal: 55 }) }),
      shot("end_titles", "black", 8, "शुभ जन्माष्टमी. Then KAAL. Let the film end.")
    ],
    beats: [
      { at: 0, actor: "kishore", action: "IDLE" },
      { at: 17, actor: "kishore", action: "LOOK", note: "at the viewer" },
      { at: 20, actor: "kishore", action: "SMILE" },
      { at: 23, actor: "kishore", action: "FLUTE_RAISE" },
      { at: 25, actor: "kishore", action: "FLUTE_PLAY" },
      { at: 29, actor: "kishore", action: "FLUTE_LOWER" }
    ],
    audio: [
      { at: 0, bus: "ambience", id: "ambience/yamuna-night", action: "start" },
      { at: 25, bus: "flute", id: "flute/final-note", action: "oneShot" },
      { at: 25.2, bus: "environment", id: "effects/water-ripple", action: "oneShot" },
      { at: 27, bus: "ambience", id: "ambience/yamuna-night", action: "duck", note: "back to silence" }
    ],
    shlokas: [],
    titles: [
      { at: 30.6, duration: 3.6, text: "शुभ जन्माष्टमी", style: "greeting" },
      { at: 34.4, duration: 3.6, text: "KAAL", style: "title" },
      { at: 35.0, duration: 3.0, text: "THE MANY FORMS OF KRISHNA", style: "subtitle" }
    ],
    transitionOut: "endTitles"
  }
];

/** Debug keys 1-9, 0 as specified. Derived from the scene list so the two can never disagree. */
export const DEBUG_KEY_SCENES = Object.fromEntries(
  SCENES.filter((scene) => scene.debugKey).map((scene) => [scene.debugKey as string, scene.id])
) as Record<string, SceneId>;
