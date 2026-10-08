import { Vector3, type Camera } from "three";
import { clamp, damp } from "@/lib/math";
import { seeded } from "@/lib/random";
import type { BoneName, Puppet } from "./puppet";

/**
 * What Krishna is doing. The story (data/story.ts) picks the action; the animator makes it look alive: a pose per
 * action, cyclic motion on top (walking, swaying, dancing), and layers that never stop (breath, blinks, the gaze
 * that follows the viewer's pointer).
 */
export type KrishnaAction =
  | "idle"
  | "walk"
  | "run"
  | "flute"
  | "dance"
  | "sit"
  | "peek"
  | "reach"
  | "wave"
  | "wonder"
  | "bless";

export type Expression = "smile" | "open" | "soft" | "flute";

/** One channel per thing that can move. Everything is damped toward its target, so poses never snap. */
type Channel =
  | BoneName
  | "hipsX"
  | "hipsY"
  | "hipsRot"
  | "torsoRot"
  | "headRot"
  | "headX"
  | "lidOpen"
  | "browLift"
  | "fluteUp"
  | "handGrip";

const REST: Partial<Record<Channel, number>> = {
  armNearUpper: 0.16,
  armNearFore: 0.12,
  handNear: 0,
  armFarUpper: -0.16,
  armFarFore: -0.12,
  handFar: 0,
  legNearThigh: 0.02,
  legNearShin: -0.03,
  footNear: 0,
  legFarThigh: -0.04,
  legFarShin: -0.05,
  footFar: 0,
  hipsX: 0,
  hipsY: 0,
  hipsRot: 0,
  torsoRot: 0,
  headRot: 0,
  headX: 0,
  lidOpen: 1,
  browLift: 0,
  fluteUp: 0,
  handGrip: 0
};

/** Pose per action: the shape the body settles into, before the cyclic motion is added. */
const POSES: Record<KrishnaAction, Partial<Record<Channel, number>>> = {
  idle: {},
  walk: {},
  run: { torsoRot: 0.12 },
  flute: { fluteUp: 1, handGrip: 1, headRot: -0.1, torsoRot: -0.03, lidOpen: 0.22 },
  dance: { legNearThigh: 0.2, legNearShin: -0.25, legFarThigh: -0.14, armNearUpper: -1.9, armNearFore: -0.5, armFarUpper: 0.9, armFarFore: 0.7, handGrip: 0 },
  sit: { hipsY: -0.42, legNearThigh: 1.35, legNearShin: -1.5, legFarThigh: 1.15, legFarShin: -1.7, armNearUpper: 0.5, armNearFore: 0.55, armFarUpper: -0.45, armFarFore: -0.5, torsoRot: 0.04 },
  peek: { torsoRot: 0.22, headRot: -0.16, armNearUpper: -1.1, armNearFore: -1.3, armFarUpper: -0.35, armFarFore: -0.2, legNearThigh: 0.3, legNearShin: -0.35, browLift: 1, lidOpen: 1.25 },
  reach: { armNearUpper: -2.5, armNearFore: -0.35, armFarUpper: -0.7, armFarFore: -0.9, torsoRot: -0.08, headRot: -0.18, hipsY: 0.05, legNearThigh: -0.12, footNear: 0.3, browLift: 0.6 },
  wave: { armNearUpper: -2.3, armNearFore: -0.6, armFarUpper: -0.2, headRot: 0.06 },
  wonder: { armNearUpper: 0.5, armNearFore: 0.9, armFarUpper: -0.5, armFarFore: -0.9, headRot: 0.16, browLift: 0.8 },
  bless: { armNearUpper: -1.75, armNearFore: -0.25, armFarUpper: 0.2, armFarFore: 0.35, torsoRot: -0.02, headRot: 0.04 }
};

/** How fast each action settles. Quick actions snap; calm ones ease. */
const SETTLE: Record<KrishnaAction, number> = {
  idle: 6,
  walk: 9,
  run: 11,
  flute: 5,
  dance: 9,
  sit: 5,
  peek: 8,
  reach: 8,
  wave: 9,
  wonder: 5,
  bless: 4
};

export interface AnimatorContext {
  /** Seconds, real time: keeps breath and blinks alive even when the story pauses. */
  dt: number;
  /** Where he should look, in world space (usually the viewer's pointer). Null lets him look ahead. */
  lookAt: Vector3 | null;
  /** 0..1 flute loudness, for the breath of the body while playing. */
  audio: number;
  camera: Camera;
}

const TAU = Math.PI * 2;

export class KrishnaAnimator {
  action: KrishnaAction = "idle";
  expression: Expression = "smile";
  /** Metres per second along +X while walking or running; the story moves the root. */
  speed = 0;

  private readonly current = new Map<Channel, number>();
  private readonly target = new Map<Channel, number>();
  private readonly random = seeded(9176);
  private phase = 0;
  private blinkIn = 1.5;
  private blink = 0;
  private settle = 6;
  private readonly gaze = { x: 0, y: 0 };
  private readonly world = new Vector3();
  private readonly local = new Vector3();

  constructor(
    private readonly puppet: Puppet,
    private readonly personality: "child" | "youth" = "youth"
  ) {
    for (const [key, value] of Object.entries(REST)) {
      this.current.set(key as Channel, value as number);
      this.target.set(key as Channel, value as number);
    }
    this.setAction("idle", true);
  }

  setAction(action: KrishnaAction, snap = false) {
    this.action = action;
    this.settle = SETTLE[action];
    const pose = { ...REST, ...POSES[action] };
    for (const [key, value] of Object.entries(pose)) {
      this.target.set(key as Channel, value as number);
      if (snap) this.current.set(key as Channel, value as number);
    }
    this.setExpression(action === "flute" ? "flute" : action === "peek" ? "soft" : action === "dance" || action === "run" ? "open" : this.expression === "flute" ? "smile" : this.expression);
  }

  setExpression(expression: Expression) {
    if (expression === this.expression) return;
    this.expression = expression;
    const mouth = this.puppet.parts.get("mouth");
    if (mouth) {
      const material = mouth.material as unknown as { map: unknown; needsUpdate: boolean };
      material.map = this.puppet.mouths[expression];
      material.needsUpdate = true;
    }
  }

  update(ctx: AnimatorContext) {
    const dt = Math.min(ctx.dt, 0.1);
    this.phase += dt;
    const t = this.phase;
    const b = this.puppet.bones;
    const child = this.personality === "child";

    // ---------------------------------------------------------------- cyclic motion on top of the pose
    const extra = new Map<Channel, number>();
    const add = (channel: Channel, value: number) => extra.set(channel, (extra.get(channel) ?? 0) + value);

    if (this.action === "walk" || this.action === "run") {
      const running = this.action === "run";
      const rate = running ? 3.4 : 2.1;
      const swing = running ? 0.85 : 0.5;
      const step = t * TAU * rate;
      add("legNearThigh", Math.sin(step) * swing);
      add("legFarThigh", Math.sin(step + Math.PI) * swing);
      add("legNearShin", -Math.abs(Math.sin(step - 0.6)) * (running ? 1.1 : 0.7));
      add("legFarShin", -Math.abs(Math.sin(step + Math.PI - 0.6)) * (running ? 1.1 : 0.7));
      add("footNear", Math.sin(step + 0.8) * 0.25);
      add("footFar", Math.sin(step + Math.PI + 0.8) * 0.25);
      add("armNearUpper", Math.sin(step + Math.PI) * swing * 0.8);
      add("armFarUpper", Math.sin(step) * swing * 0.8);
      add("armNearFore", -Math.abs(Math.sin(step)) * 0.25 - 0.1);
      add("armFarFore", -Math.abs(Math.sin(step + Math.PI)) * 0.25 - 0.1);
      add("hipsY", Math.abs(Math.sin(step)) * (running ? 0.05 : 0.022));
      add("hipsRot", Math.sin(step) * 0.05);
      add("torsoRot", Math.sin(step * 2) * 0.02);
    } else if (this.action === "dance") {
      const beat = t * TAU * 0.9;
      add("hipsX", Math.sin(beat) * 0.07);
      add("hipsRot", Math.sin(beat) * 0.12);
      add("torsoRot", -Math.sin(beat) * 0.1);
      add("headRot", Math.sin(beat + 0.4) * 0.12);
      add("armNearUpper", Math.sin(beat * 2) * 0.22);
      add("armFarUpper", Math.sin(beat * 2 + 1) * 0.3);
      add("legNearShin", Math.abs(Math.sin(beat * 2)) * -0.25);
      add("hipsY", Math.abs(Math.sin(beat * 2)) * 0.035);
    } else {
      // Standing: a slow weight shift, so he is never statue-still.
      const sway = Math.sin(t * 0.42) * 0.6 + Math.sin(t * 0.27 + 1.3) * 0.4;
      add("hipsX", sway * (child ? 0.016 : 0.012));
      add("hipsRot", sway * 0.03);
      add("torsoRot", -sway * 0.02);
      add("headRot", Math.sin(t * 0.33 + 0.7) * 0.05);
      if (this.action === "wave") add("armNearFore", Math.sin(t * TAU * 1.6) * 0.5);
      if (this.action === "flute") {
        add("torsoRot", Math.sin(t * 0.8) * 0.012 + ctx.audio * 0.012);
        add("headRot", Math.sin(t * 0.55) * 0.02);
      }
    }

    // Breathing, always.
    const breath = Math.sin(t * TAU * (child ? 0.34 : 0.26));
    add("torsoRot", breath * 0.012);

    // ---------------------------------------------------------------- settle every channel
    for (const [channel, goal] of this.target) {
      const want = goal + (extra.get(channel) ?? 0);
      this.current.set(channel, damp(this.current.get(channel) ?? want, want, this.settle, dt));
    }

    // ---------------------------------------------------------------- write the pose onto the puppet
    const get = (channel: Channel) => this.current.get(channel) ?? 0;
    const p = this.puppet.proportions;
    b.hips.position.x = get("hipsX");
    b.hips.position.y = this.puppet.hipHeight + get("hipsY");
    b.hips.rotation.z = get("hipsRot");
    b.torso.rotation.z = get("torsoRot");
    for (const bone of ["armNearUpper", "armNearFore", "handNear", "armFarUpper", "armFarFore", "handFar", "legNearThigh", "legNearShin", "footNear", "legFarThigh", "legFarShin", "footFar"] as BoneName[]) {
      b[bone].rotation.z = get(bone as Channel);
    }

    // Head: the pose, plus the gaze.
    this.updateGaze(ctx, dt);
    b.head.rotation.z = get("headRot") + this.gaze.x * 0.12;
    b.head.position.x = get("headX") + this.gaze.x * p.headHeight * 0.03;
    b.head.position.y = this.gaze.y * p.headHeight * 0.02;

    // Eyes: irises follow the gaze, lids blink and half-close while he plays.
    const irisRange = p.headHeight * 0.035;
    for (const side of ["L", "R"] as const) {
      const iris = b[`iris${side}` as BoneName];
      iris.position.x = this.gaze.x * irisRange;
      iris.position.y = this.gaze.y * irisRange * 0.7;
    }
    this.blinkIn -= dt;
    if (this.blinkIn <= 0) {
      this.blink = 1;
      // Children blink more often, and sometimes twice.
      this.blinkIn = (child ? 1.6 : 2.4) + this.random() * (child ? 2.4 : 3.6);
    }
    if (this.blink > 0) this.blink = Math.max(0, this.blink - dt * 7.5);
    const shut = Math.sin(clamp(this.blink, 0, 1) * Math.PI);
    const lidOpen = clamp(get("lidOpen"), 0, 1.4);
    const lid = clamp(Math.max(shut, 1 - lidOpen), 0.001, 1);
    b.lidL.scale.y = lid;
    b.lidR.scale.y = lid;

    // Brows lift with surprise and with the gaze.
    const brow = get("browLift") * p.headHeight * 0.03 + this.gaze.y * p.headHeight * 0.012;
    b.browL.position.y = brow;
    b.browR.position.y = brow;

    // ---------------------------------------------------------------- the flute: tucked, or at his lips
    this.updateFlute(get("fluteUp"), get("handGrip"));
  }

  /** Eyes (and a little of the head) follow the viewer's pointer. */
  private updateGaze(ctx: AnimatorContext, dt: number) {
    let x = 0;
    let y = 0;
    if (ctx.lookAt) {
      this.puppet.bones.head.getWorldPosition(this.world);
      this.local.copy(ctx.lookAt).sub(this.world);
      const distance = Math.max(0.4, this.local.length());
      x = clamp(this.local.x / distance, -1, 1);
      y = clamp(this.local.y / distance, -0.8, 0.8);
    }
    this.gaze.x = damp(this.gaze.x, x, 6, dt);
    this.gaze.y = damp(this.gaze.y, y, 6, dt);
  }

  /**
   * The bansuri rides in the near hand at rest and rises to his lips to play. Both hands then reach for it with
   * two-bone IK, so the arms always meet the flute wherever the body has moved.
   */
  private updateFlute(up: number, grip: number) {
    const b = this.puppet.bones;
    const p = this.puppet.proportions;
    const flute = b.flute;
    const playing = up > 0.02;

    // Hands: open, or curled round the bamboo.
    const handTexture = grip > 0.5 ? this.puppet.hands.grip : this.puppet.hands.open;
    for (const key of ["handNear", "handFar"] as const) {
      const mesh = this.puppet.parts.get(key);
      if (!mesh) continue;
      const material = mesh.material as unknown as { map: unknown; needsUpdate: boolean };
      if (material.map !== handTexture) {
        material.map = handTexture;
        material.needsUpdate = true;
      }
    }

    if (!playing) {
      // Tucked through the sash at his waist, the way he carries it between tunes.
      if (flute.parent !== b.hips) b.hips.add(flute);
      flute.position.set(-p.fluteLength * 0.1, p.torsoHeight * 0.06, 0.06);
      flute.rotation.z = 0.42;
      return;
    }

    // Playing: the flute sits at the lips, running to his right and a little down.
    if (flute.parent !== b.head) b.head.add(flute);
    const lips = this.puppet.bones.mouth.position;
    flute.position.set(lips.x - p.headHeight * 0.02, lips.y - p.headHeight * 0.02, 0.06);
    flute.rotation.z = -0.28;

    // Both hands reach for their grips along the flute.
    const length = p.fluteLength;
    this.reachFor("Near", flute, length * 0.62, up);
    this.reachFor("Far", flute, length * 0.3, up);
  }

  private readonly targetWorld = new Vector3();
  private readonly shoulderWorld = new Vector3();

  /** Two-bone IK in the puppet's plane: put the hand at `distance` along the flute. */
  private reachFor(side: "Near" | "Far", flute: import("three").Object3D, distance: number, weight: number) {
    const b = this.puppet.bones;
    const p = this.puppet.proportions;
    const upper = b[`arm${side}Upper` as BoneName];
    const fore = b[`arm${side}Fore` as BoneName];
    this.targetWorld.set(distance, -p.hand * 0.22, 0);
    flute.localToWorld(this.targetWorld);
    this.puppet.root.worldToLocal(this.targetWorld);
    upper.getWorldPosition(this.shoulderWorld);
    this.puppet.root.worldToLocal(this.shoulderWorld);

    const dx = this.targetWorld.x - this.shoulderWorld.x;
    const dy = this.targetWorld.y - this.shoulderWorld.y;
    const l1 = p.armUpper;
    const l2 = p.armFore + p.hand * 0.35;
    const reach = clamp(Math.hypot(dx, dy), Math.abs(l1 - l2) + 1e-3, l1 + l2 - 1e-3);
    const toTarget = Math.atan2(dy, dx);
    const inner = Math.acos(clamp((l1 * l1 + reach * reach - l2 * l2) / (2 * l1 * reach), -1, 1));
    // Elbows bend away from the body: the near arm (viewer's left) bends left, the far arm right.
    const bend = side === "Near" ? -1 : 1;
    const upperAngle = toTarget + inner * bend;
    const elbowX = this.shoulderWorld.x + Math.cos(upperAngle) * l1;
    const elbowY = this.shoulderWorld.y + Math.sin(upperAngle) * l1;
    const foreAngle = Math.atan2(this.targetWorld.y - elbowY, this.targetWorld.x - elbowX);
    // A bone with rotation 0 hangs straight down, so a direction of angle a needs rotation a + 90 degrees.
    const torsoRotation = b.torso.rotation.z + b.hips.rotation.z;
    const upperTarget = upperAngle + Math.PI / 2 - torsoRotation;
    const foreTarget = foreAngle - upperAngle;
    upper.rotation.z = upper.rotation.z * (1 - weight) + upperTarget * weight;
    fore.rotation.z = fore.rotation.z * (1 - weight) + foreTarget * weight;
    b[`hand${side}` as BoneName].rotation.z = 0.15 * weight;
  }
}
