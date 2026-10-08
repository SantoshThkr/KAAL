import type { MoodId } from "./moods";
import type { ShlokaId } from "./shlokas";

/**
 * THE FILM, declaratively: eight animated scenes from the first point of light to silence. Nothing here imports
 * React or three; `lib/timelineBuilder.ts` compiles it into one GSAP master timeline (everything continuous) plus a
 * cue list (everything discrete). All times are seconds from the start of their own scene.
 *
 * The world runs along X (the Vrindavan bank), the river lies behind it (negative Z), and the camera looks at it from
 * the front (positive Z). Krishna walks along X; the camera follows.
 */

export const SCENE_IDS = ["OPENING", "BAL", "VRINDAVAN", "FLUTE", "TRANSFORMATION", "KISHORE", "DIVINE", "SILENCE"] as const;
export type SceneId = (typeof SCENE_IDS)[number];

export type ActorId = "bal" | "kishore";

/** What Krishna is doing: the animator turns each into a pose plus its own motion. */
export type ActorAction = "idle" | "walk" | "run" | "flute" | "dance" | "sit" | "peek" | "reach" | "wave" | "wonder" | "bless";

export type Vec3 = readonly [number, number, number];

export interface CameraPose {
  position: Vec3;
  target: Vec3;
  focal: number;
  focus: number;
  roll?: number;
  shake?: number;
}

export type ShotKind = "black" | "wide" | "establishing" | "medium" | "close" | "extremeClose" | "tracking" | "crane" | "push" | "pull" | "orbit" | "tilt";

export interface ShotDef {
  id: string;
  kind: ShotKind;
  duration: number;
  /** What this shot is for. A shot that cannot answer this does not belong. */
  intent: string;
  cut?: boolean;
  from?: CameraPose;
  to?: CameraPose;
  ease?: string;
}

/** A discrete change of what an actor is doing. */
export interface BeatDef {
  at: number;
  who: ActorId;
  action: ActorAction;
  note?: string;
}

/** A tween of an actor's place in the world (position, size, presence). */
export interface ActorKey {
  who: ActorId;
  at: number;
  duration?: number;
  set?: Partial<{ x: number; y: number; z: number; scale: number; facing: number; opacity: number; lookAtPointer: number }>;
  to?: Partial<{ x: number; y: number; z: number; scale: number; facing: number; opacity: number; lookAtPointer: number }>;
  ease?: string;
}

export type AudioBus = "ambience" | "flute" | "voice" | "environment" | "cinematic";

export interface AudioCueDef {
  at: number;
  bus: AudioBus;
  id: string;
  action: "start" | "stop" | "oneShot" | "duck";
  note?: string;
}

export interface ShlokaCueDef {
  id: ShlokaId;
  at: number;
  /** Seconds between the four quarter-lines: the verse arrives a line at a time. */
  padaGap: number;
  speakerAt?: number;
  meaningAt: number;
  end: number;
}

export interface TitleCueDef {
  at: number;
  duration: number;
  text: string;
  style: "title" | "subtitle" | "greeting" | "whisper";
}

export interface MoodKey {
  at: number;
  mood: MoodId;
  /** Seconds to blend from the previous mood. */
  blend: number;
}

export interface FadeKey {
  at: number;
  to: number;
  duration: number;
}

export interface FxKey {
  at: number;
  duration: number;
  magic?: number;
  cosmos?: number;
  bokeh?: number;
}

export interface WorldKey {
  at: number;
  duration: number;
  timeScale?: number;
  muffle?: number;
  wind?: number;
}

export interface SceneDef {
  id: SceneId;
  title: string;
  /** 1-8: jump to this scene in engineering mode. */
  key: string;
  mood: readonly MoodKey[];
  shots: readonly ShotDef[];
  beats: readonly BeatDef[];
  actors: readonly ActorKey[];
  audio: readonly AudioCueDef[];
  shlokas: readonly ShlokaCueDef[];
  titles: readonly TitleCueDef[];
  fade: readonly FadeKey[];
  fx: readonly FxKey[];
  world: readonly WorldKey[];
}

// ---------------------------------------------------------------------------------------------------------------
// Camera helpers. `on(x)` frames a character standing at x on the bank; `wide` pulls back for the landscape.
// ---------------------------------------------------------------------------------------------------------------

const shot = (id: string, kind: ShotKind, duration: number, intent: string, extra: Partial<ShotDef> = {}): ShotDef => ({ id, kind, duration, intent, ...extra });

/** Where things happen along the bank. Camera framings and actor positions both use these, so a shot can never
 *  drift off its subject. */
export const MARK = { village: -12.6, grove: -7.2, grove2: -3, bend: 2.6, opening: -4.2 } as const;

/** A camera looking at the bank from the front, at `distance`, framing someone `height` tall standing at x. */
const on = (x: number, options: { distance?: number; height?: number; eye?: number; focal?: number; side?: number; shake?: number } = {}): CameraPose => {
  const distance = options.distance ?? 5;
  const eye = options.eye ?? 1.2;
  const height = options.height ?? 0.95;
  const side = options.side ?? 0;
  return {
    position: [x + side, eye, distance],
    target: [x, height, 0],
    focal: options.focal ?? 40,
    focus: Math.hypot(distance, eye - height),
    shake: options.shake ?? 0
  };
};

/** The wide landscape: back off and look across the whole bank. */
const wide = (x: number, distance: number, eye: number, focal = 28): CameraPose => ({
  position: [x, eye, distance],
  target: [x - 1, eye * 0.55, -4],
  focal,
  focus: distance
});

// ---------------------------------------------------------------------------------------------------------------

export const SCENES: readonly SceneDef[] = [
  // ============================================================================================ 1. OPENING
  {
    id: "OPENING",
    title: "A light on the Yamuna",
    key: "1",
    mood: [
      { at: 0, mood: "nightDeep", blend: 0 },
      { at: 12, mood: "moonlit", blend: 10 }
    ],
    fade: [
      { at: 0, to: 1, duration: 0 },
      { at: 2.5, to: 0, duration: 3.5 },
      { at: 34, to: 1, duration: 2 }
    ],
    fx: [
      { at: 0, duration: 0, magic: 0.35, cosmos: 0 },
      { at: 16, duration: 6, magic: 0.15 }
    ],
    world: [{ at: 0, duration: 0, timeScale: 1, muffle: 0.25, wind: 0.15 }, { at: 12, duration: 6, muffle: 0 }],
    shots: [
      shot("dark", "black", 4, "Darkness. A flute, far off. The first motes of light drift up.", { from: wide(2, 7, 1.4, 34), to: wide(2, 6.4, 1.5, 34) }),
      shot("motes", "push", 7, "Points of light gather over the water; the moon finds the river.", {
        from: wide(2, 6.4, 1.5, 34),
        to: wide(0, 5, 1.8, 32)
      }),
      shot("through_trees", "tracking", 8, "The camera drifts through the kadamba trees: Vrindavan at night, awake and breathing.", {
        from: wide(0, 5, 1.8, 32),
        to: wide(-4, 4.4, 1.6, 32)
      }),
      shot("feather", "close", 5, "A peacock feather turns down through the air and settles.", {
        from: { position: [-4.4, 1.9, 2.2], target: [-4.4, 1.5, 0], focal: 58, focus: 2.4 },
        to: { position: [-4.4, 1.2, 1.9], target: [-4.4, 0.75, 0], focal: 58, focus: 2.2 }
      }),
      shot("he_enters", "medium", 8, "Krishna steps into the moonlight and looks straight at us.", {
        cut: true,
        from: on(-4.2, { distance: 4.6, eye: 1.25, height: 0.95, focal: 45 }),
        to: on(-4.2, { distance: 3.4, eye: 1.15, height: 0.92, focal: 45 })
      }),
      shot("title", "black", 11, "KAAL, and the night behind it.")
    ],
    beats: [
      { at: 15.5, who: "bal", action: "wonder" },
      { at: 19, who: "bal", action: "wave", note: "he notices the viewer" },
      { at: 24, who: "bal", action: "idle" }
    ],
    actors: [
      { who: "bal", at: 0, set: { x: -4.2, y: 0, z: 0, scale: 1, facing: 0, opacity: 0, lookAtPointer: 1 } },
      { who: "bal", at: 15, duration: 2.5, to: { opacity: 1 } },
      { who: "bal", at: 30, duration: 3, to: { opacity: 0 } },
      { who: "kishore", at: 0, set: { x: 2, y: 0, z: 0, scale: 1, facing: 0, opacity: 0, lookAtPointer: 1 } }
    ],
    audio: [
      { at: 0, bus: "ambience", id: "ambience/yamuna-night", action: "start" },
      { at: 1.5, bus: "flute", id: "flute/call-hint", action: "oneShot", note: "a flute, far away" },
      { at: 12, bus: "flute", id: "flute/first-note", action: "oneShot", note: "the moon finds the water" },
      { at: 22, bus: "flute", id: "flute/kishore-theme", action: "start" },
      { at: 33, bus: "flute", id: "flute/kishore-theme", action: "stop" },
      { at: 35.5, bus: "ambience", id: "ambience/yamuna-night", action: "duck" }
    ],
    shlokas: [],
    titles: [
      { at: 34.8, duration: 3.6, text: "KAAL", style: "title" },
      { at: 38, duration: 4.4, text: "the many forms of Krishna", style: "subtitle" }
    ]
  },

  // ============================================================================================ 2. BAL KRISHNA
  {
    id: "BAL",
    title: "The butter thief",
    key: "2",
    mood: [{ at: 0, mood: "morning", blend: 6 }],
    fade: [{ at: 0, to: 1, duration: 0 }, { at: 0.5, to: 0, duration: 2.5 }],
    fx: [{ at: 0, duration: 2, magic: 0.1 }],
    world: [{ at: 0, duration: 2, timeScale: 1, muffle: 0, wind: 0.3 }],
    shots: [
      shot("village_wide", "establishing", 8, "Morning in the village: huts, cows, the smell of butter.", {
        from: wide(MARK.village + 0.6, 7.5, 2.4, 30),
        to: wide(MARK.village + 1.4, 6.4, 2.1, 30)
      }),
      shot("peek", "medium", 7, "Krishna peers round a hut, checking nobody is watching.", {
        cut: true,
        from: on(MARK.village, { distance: 3.0, eye: 1.0, height: 0.78, focal: 50 }),
        to: on(MARK.village, { distance: 2.6, eye: 0.98, height: 0.76, focal: 50 })
      }),
      shot("reach", "close", 7, "He stretches up for the butter pot, on tiptoe.", {
        from: on(MARK.village, { distance: 2.3, eye: 1.12, height: 0.9, focal: 55 }),
        to: on(MARK.village, { distance: 2.0, eye: 1.16, height: 0.95, focal: 55 })
      }),
      shot("caught_smile", "extremeClose", 6, "Butter on his face. He laughs, delighted with himself.", {
        cut: true,
        from: on(MARK.village, { distance: 2.0, eye: 0.95, height: 0.86, focal: 62, shake: 0.05 }),
        to: on(MARK.village, { distance: 1.8, eye: 0.94, height: 0.86, focal: 62, shake: 0.05 })
      }),
      shot("run_away", "tracking", 10, "He bolts along the bank, the cows ambling after him.", {
        cut: true,
        from: on(MARK.village + 0.4, { distance: 4.0, eye: 1.05, height: 0.68, focal: 40 }),
        to: on(MARK.grove, { distance: 4.0, eye: 1.05, height: 0.68, focal: 40 })
      }),
      shot("dance", "medium", 8, "He stops where the grass is soft, and dances for the pleasure of it.", {
        from: on(MARK.grove, { distance: 3.2, eye: 1.0, height: 0.68, focal: 45 }),
        to: on(MARK.grove, { distance: 2.8, eye: 0.96, height: 0.66, focal: 45 })
      }),
      shot("verse_rest", "close", 15, "He sits, and the verse arrives with the morning.", {
        from: on(MARK.grove, { distance: 2.3, eye: 0.82, height: 0.55, focal: 55 }),
        to: on(MARK.grove, { distance: 2.1, eye: 0.8, height: 0.54, focal: 55 })
      })
    ],
    beats: [
      { at: 8, who: "bal", action: "peek" },
      { at: 15, who: "bal", action: "reach" },
      { at: 22, who: "bal", action: "idle", note: "caught, laughing" },
      { at: 28, who: "bal", action: "run" },
      { at: 38, who: "bal", action: "dance" },
      { at: 46, who: "bal", action: "sit" }
    ],
    actors: [
      { who: "bal", at: 0, set: { x: MARK.village, y: 0, z: 0.2, scale: 1, facing: 0, opacity: 1, lookAtPointer: 1 } },
      { who: "bal", at: 28, duration: 10, to: { x: MARK.grove }, ease: "sine.inOut" }
    ],
    audio: [
      { at: 0, bus: "ambience", id: "ambience/vrindavan-dawn", action: "start" },
      { at: 22, bus: "flute", id: "flute/bal-motif", action: "oneShot", note: "his mischief has its own tune" },
      { at: 44, bus: "flute", id: "flute/kishore-theme", action: "start" }
    ],
    shlokas: [{ id: "BG-4-7", at: 47, padaGap: 2.2, meaningAt: 56, end: 60.5 }],
    titles: []
  },

  // ============================================================================================ 3. VRINDAVAN
  {
    id: "VRINDAVAN",
    title: "Vrindavan",
    key: "3",
    mood: [{ at: 0, mood: "vrindavan", blend: 5 }],
    fade: [],
    fx: [{ at: 0, duration: 3, magic: 0.12 }],
    world: [{ at: 0, duration: 3, wind: 0.5 }],
    shots: [
      shot("land_wide", "crane", 9, "All of Vrindavan: the river, the trees, the green of it.", {
        from: wide(MARK.grove2 - 3, 9, 4.5, 28),
        to: wide(MARK.grove2, 7, 2.4, 28)
      }),
      shot("walk_with", "tracking", 12, "He walks, and the world leans toward him: butterflies, blossom, the peacock turning.", {
        from: on(MARK.grove2, { distance: 4.0, eye: 1.05, height: 0.7, focal: 40 }),
        to: on(1.4, { distance: 4.0, eye: 1.05, height: 0.7, focal: 40 })
      }),
      shot("low_flowers", "close", 7, "Low among the flowers as he passes.", {
        cut: true,
        from: { position: [1.8, 0.35, 2.6], target: [1.6, 0.6, 0], focal: 55, focus: 2.6, shake: 0.06 },
        to: { position: [2.4, 0.4, 2.4], target: [2.2, 0.65, 0], focal: 55, focus: 2.4, shake: 0.06 }
      }),
      shot("arrive_river", "medium", 9, "He reaches the water's edge and stops.", {
        from: on(MARK.bend, { distance: 3.6, eye: 1.1, height: 0.72, focal: 45 }),
        to: on(MARK.bend, { distance: 3.0, eye: 1.02, height: 0.7, focal: 45 })
      })
    ],
    beats: [
      { at: 7, who: "bal", action: "walk" },
      { at: 26, who: "bal", action: "idle" },
      { at: 31, who: "bal", action: "wonder" }
    ],
    actors: [
      { who: "bal", at: 0, set: { x: MARK.grove2, y: 0, z: 0, scale: 1, facing: 0, opacity: 1, lookAtPointer: 1 } },
      { who: "bal", at: 7, duration: 19, to: { x: MARK.bend }, ease: "none" }
    ],
    audio: [
      { at: 0, bus: "ambience", id: "ambience/vrindavan-dawn", action: "start" },
      { at: 26, bus: "flute", id: "flute/kishore-theme", action: "stop" }
    ],
    shlokas: [],
    titles: []
  },

  // ============================================================================================ 4. FLUTE
  {
    id: "FLUTE",
    title: "The flute",
    key: "4",
    mood: [
      { at: 0, mood: "golden", blend: 8 },
      { at: 22, mood: "magicDusk", blend: 16 }
    ],
    fade: [],
    fx: [
      { at: 0, duration: 4, magic: 0.2 },
      { at: 18, duration: 10, magic: 1 }
    ],
    world: [
      { at: 0, duration: 4, wind: 0.2 },
      { at: 14, duration: 4, muffle: 0.35, timeScale: 0.6, note: "the world holds its breath" } as WorldKey,
      { at: 20, duration: 6, muffle: 0, timeScale: 1 }
    ],
    shots: [
      shot("sit_by_water", "medium", 8, "He sits at the water's edge. Everything quietens.", {
        from: on(MARK.bend, { distance: 3.0, eye: 0.95, height: 0.6, focal: 45 }),
        to: on(MARK.bend, { distance: 2.5, eye: 0.85, height: 0.55, focal: 45 })
      }),
      shot("raise_flute", "close", 6, "He lifts the bansuri to his lips.", {
        from: on(MARK.bend, { distance: 2.0, eye: 0.88, height: 0.79, focal: 60 }),
        to: on(MARK.bend, { distance: 1.8, eye: 0.87, height: 0.79, focal: 60 })
      }),
      shot("first_note", "extremeClose", 6, "One note. The river answers it.", {
        cut: true,
        from: { position: [3.05, 0.9, 1.7], target: [2.62, 0.81, 0], focal: 62, focus: 1.8 },
        to: { position: [3.0, 0.89, 1.55], target: [2.62, 0.81, 0], focal: 62, focus: 1.7 }
      }),
      shot("world_listens", "wide", 12, "Fireflies rise, blossom drifts, the water rings outward: the world listening.", {
        cut: true,
        from: wide(2, 6.5, 2.2, 32),
        to: wide(2.4, 5.4, 1.9, 32)
      }),
      shot("close_play", "close", 10, "Close on him playing, eyes almost shut.", {
        from: on(MARK.bend, { distance: 2.2, eye: 0.9, height: 0.8, focal: 60 }),
        to: on(MARK.bend, { distance: 2.0, eye: 0.89, height: 0.79, focal: 60 })
      }),
      shot("verse_flute", "medium", 17, "The verse comes while he plays.", {
        from: on(MARK.bend, { distance: 3.2, eye: 1.0, height: 0.7, focal: 45 }),
        to: on(MARK.bend, { distance: 2.9, eye: 0.98, height: 0.7, focal: 45 })
      })
    ],
    beats: [
      { at: 0, who: "bal", action: "sit" },
      { at: 9, who: "bal", action: "flute" }
    ],
    actors: [{ who: "bal", at: 0, set: { x: 2.6, y: 0, z: 0, scale: 1, facing: 0, opacity: 1, lookAtPointer: 0 } }],
    audio: [
      { at: 0, bus: "ambience", id: "ambience/yamuna-evening", action: "start" },
      { at: 12, bus: "ambience", id: "ambience/vrindavan-evening", action: "duck" },
      { at: 15.5, bus: "flute", id: "flute/first-note", action: "oneShot" },
      { at: 23, bus: "flute", id: "flute/bal-motif", action: "start" },
      { at: 36, bus: "ambience", id: "ambience/night-crickets", action: "start" }
    ],
    shlokas: [{ id: "BG-2-47", at: 44, padaGap: 2.2, meaningAt: 53, end: 58 }],
    titles: []
  },

  // ============================================================================================ 5. TRANSFORMATION
  {
    id: "TRANSFORMATION",
    title: "Time turns",
    key: "5",
    mood: [{ at: 0, mood: "timeTurn", blend: 7 }],
    fade: [],
    fx: [
      { at: 0, duration: 3, magic: 0.8 },
      { at: 6, duration: 8, magic: 1 },
      { at: 24, duration: 6, magic: 0.35 }
    ],
    world: [
      { at: 2, duration: 6, timeScale: 0.25, muffle: 0.4, wind: 0.9 },
      { at: 22, duration: 6, timeScale: 1, muffle: 0 }
    ],
    shots: [
      shot("stillness", "medium", 6, "He lowers the flute. The wind rises. Everything begins to move except him.", {
        from: on(MARK.bend, { distance: 2.8, eye: 0.95, height: 0.62, focal: 50 }),
        to: on(MARK.bend, { distance: 2.7, eye: 1.0, height: 0.68, focal: 50 })
      }),
      shot("dissolve", "close", 10, "He comes apart into light: the child becoming what he always was.", {
        from: on(MARK.bend, { distance: 2.2, eye: 1.0, height: 0.7, focal: 55 }),
        to: on(MARK.bend, { distance: 2.8, eye: 1.3, height: 1.0, focal: 50 })
      }),
      shot("reform", "medium", 10, "The light gathers again, taller.", {
        from: on(MARK.bend, { distance: 3.2, eye: 1.4, height: 1.1, focal: 45 }),
        to: on(MARK.bend, { distance: 3.6, eye: 1.5, height: 1.2, focal: 45 })
      }),
      shot("eyes_open", "extremeClose", 6, "Kishore Krishna opens his eyes.", {
        cut: true,
        from: { position: [3.0, 1.42, 2.1], target: [2.62, 1.3, 0], focal: 68, focus: 2.2 },
        to: { position: [2.95, 1.4, 1.9], target: [2.62, 1.3, 0], focal: 68, focus: 2.0 }
      })
    ],
    beats: [
      { at: 0, who: "bal", action: "idle" },
      { at: 16, who: "kishore", action: "idle" },
      { at: 26, who: "kishore", action: "wonder" }
    ],
    actors: [
      { who: "bal", at: 0, set: { x: 2.6, y: 0, z: 0, scale: 1, facing: 0, opacity: 1, lookAtPointer: 0 } },
      { who: "bal", at: 8, duration: 7, to: { opacity: 0, scale: 1.12 }, ease: "sine.in" },
      { who: "kishore", at: 0, set: { x: 2.6, y: 0, z: 0, scale: 0.94, facing: 0, opacity: 0, lookAtPointer: 0 } },
      { who: "kishore", at: 12, duration: 8, to: { opacity: 1, scale: 1 }, ease: "sine.out" },
      { who: "kishore", at: 26, duration: 2, to: { lookAtPointer: 1 } }
    ],
    audio: [
      { at: 0, bus: "flute", id: "flute/bal-motif", action: "stop" },
      { at: 1, bus: "cinematic", id: "ambience/wind-harsh", action: "start" },
      { at: 22, bus: "cinematic", id: "ambience/wind-harsh", action: "stop" },
      { at: 24, bus: "flute", id: "flute/first-note", action: "oneShot", note: "the older breath, the same tune" }
    ],
    shlokas: [],
    titles: []
  },

  // ============================================================================================ 6. KISHORE
  {
    id: "KISHORE",
    title: "Kishore Krishna",
    key: "6",
    mood: [{ at: 0, mood: "riverNight", blend: 8 }],
    fade: [],
    fx: [{ at: 0, duration: 5, magic: 0.45 }],
    world: [{ at: 0, duration: 4, wind: 0.25 }],
    shots: [
      shot("stand_river", "wide", 10, "He stands by the Yamuna under the moon, taller now, quiet.", {
        from: wide(MARK.bend, 7, 3.0, 32),
        to: wide(MARK.bend, 5.8, 2.6, 32)
      }),
      shot("reflection", "medium", 9, "The river holds his reflection and will not let it go.", {
        cut: true,
        from: { position: [3.9, 1.5, 3.8], target: [2.6, 1.0, 0], focal: 45, focus: 4.0 },
        to: { position: [3.5, 1.3, 3.4], target: [2.6, 0.9, 0], focal: 45, focus: 3.6 }
      }),
      shot("play_night", "close", 10, "He plays again. The same note, older.", {
        from: on(MARK.bend, { distance: 3.0, eye: 1.55, height: 1.3, focal: 55 }),
        to: on(MARK.bend, { distance: 2.7, eye: 1.54, height: 1.3, focal: 55 })
      }),
      shot("verse_soul", "medium", 18, "The verse about what cannot be cut, burned, wetted or dried.", {
        from: on(MARK.bend, { distance: 4.2, eye: 1.7, height: 1.15, focal: 45 }),
        to: on(MARK.bend, { distance: 3.9, eye: 1.66, height: 1.15, focal: 45 })
      })
    ],
    beats: [
      { at: 0, who: "kishore", action: "idle" },
      { at: 20, who: "kishore", action: "flute" }
    ],
    actors: [
      { who: "bal", at: 0, set: { opacity: 0 } },
      { who: "kishore", at: 0, set: { x: 2.6, y: 0, z: 0, scale: 1, facing: 0, opacity: 1, lookAtPointer: 1 } }
    ],
    audio: [
      { at: 0, bus: "ambience", id: "ambience/yamuna-night", action: "start" },
      { at: 1, bus: "ambience", id: "ambience/night-crickets", action: "start" },
      { at: 20, bus: "flute", id: "flute/kishore-theme", action: "start" }
    ],
    shlokas: [{ id: "BG-2-23", at: 31, padaGap: 2.4, meaningAt: 41, end: 46 }],
    titles: []
  },

  // ============================================================================================ 7. DIVINE
  {
    id: "DIVINE",
    title: "Kālo'smi",
    key: "7",
    mood: [{ at: 0, mood: "cosmic", blend: 12 }],
    fade: [],
    fx: [
      { at: 0, duration: 10, cosmos: 0.6, magic: 0.8 },
      { at: 18, duration: 14, cosmos: 1 }
    ],
    world: [{ at: 0, duration: 8, timeScale: 0.7, wind: 0.5 }],
    shots: [
      shot("light_rises", "medium", 9, "The light inside him stops staying inside him.", {
        from: on(MARK.bend, { distance: 4.2, eye: 1.7, height: 1.2, focal: 45 }),
        to: on(MARK.bend, { distance: 5.4, eye: 2.1, height: 1.4, focal: 42 })
      }),
      shot("sky_opens", "pull", 12, "Stars come through the sky, through the water, through the trees.", {
        from: wide(MARK.bend, 6.5, 2.8, 34),
        to: wide(MARK.bend, 14, 6, 30)
      }),
      shot("he_contains", "pull", 14, "The world grows small against him; he is the size of the sky.", {
        from: wide(MARK.bend, 14, 6, 30),
        to: wide(MARK.bend, 40, 16, 26)
      }),
      shot("kalosmi", "wide", 14, "Kālo'smi: I am Time. The verse fills the dark.", {
        from: wide(MARK.bend, 40, 16, 26),
        to: wide(MARK.bend, 48, 19, 26)
      }),
      shot("single_point", "push", 11, "Everything falls back toward one point of light.", {
        from: wide(MARK.bend, 48, 19, 26),
        to: wide(MARK.bend, 7, 2.6, 34)
      })
    ],
    beats: [
      { at: 0, who: "kishore", action: "idle" },
      { at: 8, who: "kishore", action: "bless" },
      { at: 46, who: "kishore", action: "idle" }
    ],
    actors: [
      { who: "kishore", at: 0, set: { x: 2.6, y: 0, z: 0, scale: 1, facing: 0, opacity: 1, lookAtPointer: 0 } },
      { who: "kishore", at: 10, duration: 26, to: { scale: 7.5, y: 3.2 }, ease: "sine.inOut" },
      { who: "kishore", at: 46, duration: 13, to: { scale: 1, y: 0 }, ease: "sine.inOut" }
    ],
    audio: [
      { at: 0, bus: "flute", id: "flute/kishore-theme", action: "stop" },
      { at: 1, bus: "cinematic", id: "ambience/cosmic-wind", action: "start" },
      { at: 30, bus: "cinematic", id: "ambience/cosmic-wind", action: "duck", note: "silence before the line" },
      { at: 34, bus: "cinematic", id: "ambience/wind-harsh", action: "start" }
    ],
    shlokas: [{ id: "BG-11-32", at: 36, speakerAt: 34, padaGap: 3, meaningAt: 49, end: 55 }],
    titles: []
  },

  // ============================================================================================ 8. SILENCE
  {
    id: "SILENCE",
    title: "Silence",
    key: "8",
    mood: [{ at: 0, mood: "silence", blend: 8 }],
    fade: [{ at: 30, to: 1, duration: 4 }],
    fx: [{ at: 0, duration: 6, cosmos: 0, magic: 0.3 }],
    world: [{ at: 0, duration: 4, timeScale: 1, muffle: 0, wind: 0.15 }],
    shots: [
      shot("back_to_river", "medium", 10, "The river again, as it was at the beginning. He is just himself.", {
        from: on(MARK.bend, { distance: 4.6, eye: 1.75, height: 1.15, focal: 45 }),
        to: on(MARK.bend, { distance: 3.8, eye: 1.65, height: 1.15, focal: 45 })
      }),
      shot("last_look", "close", 9, "He looks at us once more, and smiles.", {
        from: on(MARK.bend, { distance: 2.8, eye: 1.6, height: 1.38, focal: 62 }),
        to: on(MARK.bend, { distance: 2.5, eye: 1.58, height: 1.38, focal: 62 })
      }),
      shot("one_note", "medium", 8, "One last note over the water.", {
        from: on(MARK.bend, { distance: 3.8, eye: 1.62, height: 1.15, focal: 50 }),
        to: on(MARK.bend, { distance: 4.3, eye: 1.7, height: 1.15, focal: 50 })
      }),
      shot("fade", "black", 11, "Black. शुभ जन्माष्टमी.")
    ],
    beats: [
      { at: 0, who: "kishore", action: "idle" },
      { at: 10, who: "kishore", action: "wave" },
      { at: 19, who: "kishore", action: "flute" }
    ],
    actors: [{ who: "kishore", at: 0, set: { x: 2.6, y: 0, z: 0, scale: 1, facing: 0, opacity: 1, lookAtPointer: 1 } }],
    audio: [
      { at: 0, bus: "ambience", id: "ambience/yamuna-night", action: "start" },
      { at: 19.5, bus: "flute", id: "flute/final-note", action: "oneShot" },
      { at: 30, bus: "ambience", id: "ambience/yamuna-night", action: "duck" }
    ],
    shlokas: [{ id: "BG-18-66", at: 2, padaGap: 2.2, meaningAt: 11, end: 16 }],
    titles: [{ at: 31, duration: 5, text: "शुभ जन्माष्टमी", style: "greeting" }]
  }
];

/** Engineering-mode scene keys, derived from the scenes so the two can never disagree. */
export const SCENE_KEYS = Object.fromEntries(SCENES.map((scene) => [scene.key, scene.id])) as Record<string, SceneId>;
