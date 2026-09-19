/**
 * The characters the film loads, and how to prepare each one. The models are real sculpted Krishnas (CC BY, credited
 * in public/models/krishna/CREDITS.md). They arrive UNRIGGED, so the loader rigs them (lib/rig/autoRig.ts); a
 * production rigged GLB with the same filename simply replaces them, and the loader then uses its own skeleton.
 */
export type CharacterId = "kishore" | "bal";

export interface CharacterDef {
  id: CharacterId;
  url: string;
  /** Height of the body (feet to crown of the head, not the headdress), metres. */
  bodyHeight: number;
  /** Radians about Y applied before rigging, so the character faces +Z. */
  facingFix: number;
  /**
   * tpose: arms out, auto-rigged with a full humanoid skeleton and driven by retargeted motion capture.
   * posed: sculpted in a pose; rigged along the spine and head only, for breathing, sway and looking.
   */
  rig: "tpose" | "posed";
}

export const CHARACTERS: Record<CharacterId, CharacterDef> = {
  kishore: { id: "kishore", url: "/models/krishna/kishore-krishna.glb", bodyHeight: 1.72, facingFix: 0, rig: "tpose" },
  bal: { id: "bal", url: "/models/krishna/bal-krishna.glb", bodyHeight: 1.05, facingFix: 0, rig: "posed" }
};

export const MOCAP_URL = "/animation/mocap-basic.json";
