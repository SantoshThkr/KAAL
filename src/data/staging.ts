import type { ActorId, SceneId } from "./cinematicTimeline";
import { KISHORE_WALK_MARK, PLAIN_MARK } from "./cinematicTimeline";
import type { CharacterId } from "./characters";
import { BAL_MARK, KRISHNA_MARK } from "./worldLayout";

export type WorldId = "yamuna" | "plain";

export interface CastMember {
  character: CharacterId;
  actor: ActorId;
  mark: { position: readonly [number, number, number]; facing: number };
}

/**
 * Which world each scene happens in, and who stands where. The Yamuna bank is the film's home: the opening, the
 * childhood, the flute, the passage of time and the ending all happen there. The open plain stands in for
 * Kurukshetra, the teaching and the cosmic form until those worlds are built.
 */
export const STAGING: Record<SceneId, { world: WorldId | null; cast: CastMember[] }> = {
  INTRO: { world: "yamuna", cast: [{ character: "kishore", actor: "kishore", mark: KRISHNA_MARK }] },
  BIRTH: { world: "yamuna", cast: [] },
  BAL_KRISHNA: { world: "yamuna", cast: [{ character: "bal", actor: "bal", mark: BAL_MARK }] },
  VRINDAVAN: { world: "yamuna", cast: [{ character: "bal", actor: "bal", mark: BAL_MARK }] },
  FLUTE: { world: "yamuna", cast: [{ character: "bal", actor: "bal", mark: BAL_MARK }] },
  TIME_PASSAGE: { world: "yamuna", cast: [{ character: "bal", actor: "bal", mark: BAL_MARK }] },
  TRANSFORMATION: {
    world: "yamuna",
    cast: [
      { character: "bal", actor: "bal", mark: KRISHNA_MARK },
      { character: "kishore", actor: "kishore", mark: KRISHNA_MARK }
    ]
  },
  KISHORE: { world: "yamuna", cast: [{ character: "kishore", actor: "kishore", mark: KISHORE_WALK_MARK }] },
  KURUKSHETRA: { world: "plain", cast: [{ character: "kishore", actor: "kishore", mark: PLAIN_MARK }] },
  GITA: { world: "plain", cast: [{ character: "kishore", actor: "kishore", mark: PLAIN_MARK }] },
  VISHWAROOPA: { world: "plain", cast: [{ character: "kishore", actor: "kishore", mark: PLAIN_MARK }] },
  RETURN: { world: "plain", cast: [{ character: "kishore", actor: "kishore", mark: PLAIN_MARK }] },
  FINAL: { world: "yamuna", cast: [{ character: "kishore", actor: "kishore", mark: KRISHNA_MARK }] }
};
