import {
  AnimationAction,
  AnimationMixer,
  Bone,
  Euler,
  LoopOnce,
  LoopRepeat,
  Matrix4,
  Object3D,
  Quaternion,
  Vector3,
  type Camera
} from "three";
import type { CharacterAction } from "@/data/cinematicTimeline";
import { damp } from "@/lib/math";
import { solveTwoBone } from "@/lib/rig/ik";
import type { AutoRig } from "@/lib/rig/autoRig";
import type { PosedRig } from "@/lib/rig/posedRig";
import { BANSURI, createBansuri } from "./Bansuri";
import type { LoadedCharacter } from "./characterLoader";

/** What each timeline action asks of the body. */
interface Intent {
  clip: "idle" | "walk" | "run" | "agree" | "headShake";
  flute: number;
  look: number;
  once?: boolean;
}

const INTENT: Record<CharacterAction, Intent> = {
  IDLE: { clip: "idle", flute: 0, look: 0 },
  LOOK: { clip: "idle", flute: 0, look: 1 },
  WALK: { clip: "walk", flute: 0, look: 0 },
  RUN: { clip: "run", flute: 0, look: 0 },
  STOP: { clip: "idle", flute: 0, look: 0 },
  SIT: { clip: "idle", flute: 0, look: 0 },
  STAND: { clip: "idle", flute: 0, look: 0 },
  TURN: { clip: "idle", flute: 0, look: 0.6 },
  GESTURE: { clip: "agree", flute: 0, look: 0.3, once: true },
  SMILE: { clip: "idle", flute: 0, look: 1 },
  LAUGH: { clip: "idle", flute: 0, look: 0.5 },
  PICK_FLOWER: { clip: "idle", flute: 0, look: 0 },
  FOLLOW_BUTTERFLY: { clip: "walk", flute: 0, look: 0 },
  TOUCH_WATER: { clip: "idle", flute: 0, look: 0 },
  MAKHAN_ENTER: { clip: "walk", flute: 0, look: 0 },
  MAKHAN_CHECK: { clip: "headShake", flute: 0, look: 0, once: true },
  MAKHAN_CLIMB: { clip: "idle", flute: 0, look: 0 },
  MAKHAN_TAKE: { clip: "idle", flute: 0, look: 0 },
  MAKHAN_LAUGH: { clip: "idle", flute: 0, look: 0.6 },
  FLUTE_RAISE: { clip: "idle", flute: 1, look: 0 },
  FLUTE_PLAY: { clip: "idle", flute: 1, look: 0 },
  FLUTE_LOWER: { clip: "idle", flute: 0, look: 0 },
  STAND_EYES_CLOSED: { clip: "idle", flute: 0, look: 0 },
  EYES_OPEN: { clip: "idle", flute: 0, look: 1 },
  SPEAK: { clip: "idle", flute: 0, look: 0.4 },
  LOWER_BOW: { clip: "idle", flute: 0, look: 0 }
};

/** Seconds for the body to crossfade between clips, and for the flute to come up or go down. */
const CROSSFADE = 0.6;
const FLUTE_TIME = 1.1;
const LOOK_TIME = 0.8;

const smooth = (x: number) => x * x * (3 - 2 * x);

const q = new Quaternion();
const q2 = new Quaternion();
const v = new Vector3();
const v2 = new Vector3();
const m = new Matrix4();
const euler = new Euler();

/** Add a rotation expressed in the character's own frame (model space: +Z forward, +X its left) to a bone. */
const IDENTITY = new Quaternion();
const weighted = new Quaternion();

function rotateInModelSpace(bone: Bone, root: Object3D, rotation: Quaternion, weight: number) {
  if (weight <= 0) return;
  root.getWorldQuaternion(q2);
  // The caller may pass a shared temporary, so blend into a separate one: slerping a quaternion toward itself after
  // overwriting it would silently yield the identity.
  weighted.copy(rotation);
  if (weight < 1) weighted.slerpQuaternions(IDENTITY, rotation.clone(), weight);
  // world-space version of the model-space rotation: R_w = root * R * root^-1
  const worldRotation = q2.clone().multiply(weighted).multiply(q2.clone().invert());
  const boneWorld = bone.getWorldQuaternion(new Quaternion());
  boneWorld.premultiply(worldRotation);
  const parentWorld = (bone.parent as Object3D).getWorldQuaternion(new Quaternion()).invert();
  bone.quaternion.copy(parentWorld.multiply(boneWorld));
  bone.updateMatrixWorld(true);
}

/**
 * Drives one Krishna. The timeline says WHAT he is doing (a beat, found by time, so seeking lands correctly);
 * the performer makes it look alive: motion capture for the body, then procedural layers for the flute and the gaze.
 */
export interface Performer {
  readonly character: LoadedCharacter;
  /** The clip or layer currently leading, for engineering mode. */
  readonly label: string;
  setIntent(action: CharacterAction | null, snap: boolean): void;
  update(dt: number, time: number, camera: Camera): void;
  dispose(): void;
}

export function createPerformer(character: LoadedCharacter): Performer {
  return character.rig.kind === "tpose" ? new TposePerformer(character, character.rig) : new PosedPerformer(character, character.rig);
}

// ================================================================================================= full humanoid

class TposePerformer implements Performer {
  readonly mixer: AnimationMixer;
  private readonly actions = new Map<string, AnimationAction>();
  private current: AnimationAction | null = null;
  private currentClip = "";
  private flute = 0;
  private fluteTarget = 0;
  private look = 0;
  private lookTarget = 0;
  private readonly bansuri = createBansuri();
  private readonly mouth: Vector3;
  private readonly unit: number;
  private readonly saved = new Map<Bone, Quaternion>();

  constructor(
    readonly character: LoadedCharacter,
    private readonly rig: AutoRig
  ) {
    this.mixer = new AnimationMixer(rig.root);
    for (const [name, clip] of Object.entries(character.clips)) this.actions.set(name, this.mixer.clipAction(clip));
    this.unit = character.root.scale.x;
    this.mouth = findMouth(rig);
    // The flute lives in true metres in the character's parent space; scale undoes the root's scale.
    character.root.add(this.bansuri);
    this.bansuri.scale.setScalar(1 / this.unit);
    this.play("idle", true);
  }

  get label() {
    return this.flute > 0.5 ? `${this.currentClip} + flute` : this.currentClip || "rest pose";
  }

  setIntent(action: CharacterAction | null, snap: boolean) {
    const intent = INTENT[action ?? "IDLE"];
    this.play(intent.clip, snap, intent.once);
    this.fluteTarget = intent.flute;
    this.lookTarget = intent.look;
    if (snap) {
      this.flute = this.fluteTarget;
      this.look = this.lookTarget;
    }
  }

  private play(name: string, snap: boolean, once = false) {
    const next = this.actions.get(name) ?? this.actions.get("idle");
    if (!next || next === this.current) return;
    next.reset();
    next.setLoop(once ? LoopOnce : LoopRepeat, once ? 1 : Infinity);
    next.clampWhenFinished = once;
    next.enabled = true;
    next.setEffectiveWeight(1);
    next.play();
    if (this.current && !snap) this.current.crossFadeTo(next, CROSSFADE, true);
    else if (this.current) this.current.stop();
    this.current = next;
    this.currentClip = next.getClip().name;
    if (once) {
      const back = (event: { action: AnimationAction }) => {
        if (event.action !== next) return;
        this.mixer.removeEventListener("finished", back);
        if (this.current === next) this.play("idle", false);
      };
      this.mixer.addEventListener("finished", back);
    }
  }

  update(dt: number, _time: number, camera: Camera) {
    const b = this.rig.bones;
    const root = this.character.root;
    this.mixer.update(dt);
    this.flute = damp(this.flute, this.fluteTarget, 1 / (FLUTE_TIME * 0.35), dt);
    this.look = damp(this.look, this.lookTarget * (1 - this.flute), 1 / (LOOK_TIME * 0.35), dt);
    root.updateMatrixWorld(true);

    // 1. Flute posture: head inclines toward the flute, shoulders turn a touch, the whole figure settles into it.
    const w = smooth(Math.min(1, this.flute));
    if (w > 0.001) {
      rotateInModelSpace(b.Spine1, root, q.setFromEuler(euler.set(0.02, -0.08, -0.03)), w);
      rotateInModelSpace(b.Neck, root, q.setFromEuler(euler.set(0.06, -0.1, 0.05)), w);
      rotateInModelSpace(b.Head, root, q.setFromEuler(euler.set(0.1, -0.12, 0.16)), w);
    }

    // 2. Gaze: turn head and neck toward the camera (the viewer), within human limits.
    if (this.look > 0.001) this.aimHead(camera.getWorldPosition(v), this.look);

    // 3. The bansuri: tucked in the sash at rest, at the lips when playing, carried between the two.
    this.placeFlute(w);

    // 4. Hands to the flute.
    if (w > 0.001) this.handsToFlute(w);
  }

  private aimHead(target: Vector3, weight: number) {
    const root = this.character.root;
    const head = this.rig.bones.Head.getWorldPosition(v2);
    const local = root.worldToLocal(target.clone()).sub(root.worldToLocal(head.clone()));
    const yaw = Math.max(-1, Math.min(1, Math.atan2(local.x, local.z)));
    const pitch = Math.max(-0.45, Math.min(0.35, Math.atan2(-local.y, Math.hypot(local.x, local.z))));
    rotateInModelSpace(this.rig.bones.Neck, root, q.setFromEuler(euler.set(pitch * 0.35, yaw * 0.4, 0)), weight);
    rotateInModelSpace(this.rig.bones.Head, root, q.setFromEuler(euler.set(pitch * 0.55, yaw * 0.6, 0)), weight);
  }

  /** Flute pose relative to the head (playing) and to the hips (tucked in the sash), blended by w. */
  private placeFlute(w: number) {
    const root = this.character.root;
    const b = this.rig.bones;
    const unit = this.unit;
    // Playing: embouchure at the lips, flute running to his right (-X), a little down and forward.
    const along = new Vector3(-1, -0.2, 0.32).normalize();
    const lips = this.mouth.clone().sub(this.rig.rest.Head).add(new Vector3(0, -0.004 / unit, 0.014 / unit));
    const playLocal = new Matrix4().compose(
      lips.sub(along.clone().multiplyScalar(BANSURI.embouchure / unit)),
      new Quaternion().setFromUnitVectors(new Vector3(1, 0, 0), along),
      new Vector3(1 / unit, 1 / unit, 1 / unit)
    );
    const play = b.Head.matrixWorld.clone().multiply(playLocal);

    // Tucked: in the sash at his right front, pointing up across the body.
    const sashDir = new Vector3(0.55, 0.8, 0.15).normalize();
    const bh = this.rig.landmarks.bodyHeight;
    const sashAnchor = new Vector3(-0.09 * bh, -0.01 * bh, 0.085 * bh);
    const tuckLocal = new Matrix4().compose(
      sashAnchor.sub(sashDir.clone().multiplyScalar(0.18 / unit)),
      new Quaternion().setFromUnitVectors(new Vector3(1, 0, 0), sashDir),
      new Vector3(1 / unit, 1 / unit, 1 / unit)
    );
    const tuck = b.Hips.matrixWorld.clone().multiply(tuckLocal);

    const pA = new Vector3();
    const qA = new Quaternion();
    const sA = new Vector3();
    const pB = new Vector3();
    const qB = new Quaternion();
    tuck.decompose(pA, qA, sA);
    play.decompose(pB, qB, sA);
    pA.lerp(pB, w);
    qA.slerp(qB, w);
    m.compose(pA, qA, sA);
    // Into the root's space.
    root.updateMatrixWorld(true);
    m.premultiply(root.matrixWorld.clone().invert());
    m.decompose(this.bansuri.position, this.bansuri.quaternion, this.bansuri.scale);
    this.bansuri.updateMatrixWorld(true);
  }

  private handsToFlute(w: number) {
    const b = this.rig.bones;
    const arms: Bone[] = [b.LeftArm, b.LeftForeArm, b.LeftHand, b.RightArm, b.RightForeArm, b.RightHand];
    for (const bone of arms) {
      let saved = this.saved.get(bone);
      if (!saved) this.saved.set(bone, (saved = new Quaternion()));
      saved.copy(bone.quaternion);
    }
    const flute = this.bansuri;
    const grip = (metres: number, below: number, toward: number) => {
      const point = new Vector3(BANSURI.embouchure + metres, -below, toward);
      return flute.localToWorld(point);
    };
    const rootQuat = this.character.root.getWorldQuaternion(new Quaternion());
    const pole = (shoulder: Bone, x: number) => shoulder.getWorldPosition(new Vector3()).add(new Vector3(x, -1, 0.35).applyQuaternion(rootQuat));
    // Wrists sit just below and behind the grip so the palm wraps up around the bamboo.
    solveTwoBone(b.LeftArm, b.LeftForeArm, b.LeftHand, grip(BANSURI.gripLeft - BANSURI.embouchure, 0.045, -0.03), pole(b.LeftArm, 0.6));
    solveTwoBone(b.RightArm, b.RightForeArm, b.RightHand, grip(BANSURI.gripRight - BANSURI.embouchure, 0.05, -0.025), pole(b.RightArm, -0.8));
    if (w < 1) {
      for (const bone of arms) {
        const saved = this.saved.get(bone) as Quaternion;
        bone.quaternion.copy(saved.clone().slerp(bone.quaternion, w));
      }
    }
    this.rig.root.updateMatrixWorld(true);
  }

  dispose() {
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.rig.root);
    this.bansuri.removeFromParent();
  }
}

/**
 * The lips, found from the face's profile (model space, rig units): the nose is the front-most point of the face
 * between the chin and the brow; the lips sit just below it. Searching only a thin vertical strip at the centre line,
 * below the forehead, keeps earrings, the crown and the necklace out of the measurement.
 */
function findMouth(rig: AutoRig): Vector3 {
  const bh = rig.landmarks.bodyHeight;
  const neck = rig.landmarks.neckY;
  const low = neck + 0.03 * bh;
  const high = neck + 0.12 * bh;
  const bins = 36;
  const front = new Array<number>(bins).fill(-Infinity);
  for (const mesh of rig.meshes) {
    const position = mesh.geometry.getAttribute("position");
    for (let i = 0; i < position.count; i += 1) {
      const y = position.getY(i);
      if (y < low || y > high || Math.abs(position.getX(i)) > 0.012 * bh) continue;
      const bin = Math.min(bins - 1, Math.floor(((y - low) / (high - low)) * bins));
      front[bin] = Math.max(front[bin], position.getZ(i));
    }
  }
  let nose = -1;
  for (let bin = 0; bin < bins; bin += 1) if (front[bin] > -Infinity && (nose < 0 || front[bin] > front[nose])) nose = bin;
  if (nose < 0) return new Vector3(0, rig.rest.Head.y + 0.02 * bh, rig.rest.Head.z + 0.06 * bh);
  const noseY = low + ((nose + 0.5) / bins) * (high - low);
  const mouthY = noseY - 0.022 * bh;
  const mouthBin = Math.max(0, Math.min(bins - 1, Math.floor(((mouthY - low) / (high - low)) * bins)));
  const mouthZ = front[mouthBin] > -Infinity ? front[mouthBin] : front[nose] - 0.01 * bh;
  return new Vector3(0, mouthY, mouthZ);
}

// ================================================================================================= posed (Bal)

class PosedPerformer implements Performer {
  private look = 0;
  private lookTarget = 0;
  private laugh = 0;
  private laughTarget = 0;
  private readonly base = new Map<Bone, Quaternion>();
  private phase = Math.random() * 10;

  constructor(
    readonly character: LoadedCharacter,
    private readonly rig: PosedRig
  ) {
    for (const bone of Object.values(rig.bones)) this.base.set(bone, bone.quaternion.clone());
  }

  get label() {
    return this.laugh > 0.5 ? "laugh (procedural)" : this.look > 0.5 ? "look (procedural)" : "breathe (procedural)";
  }

  setIntent(action: CharacterAction | null, snap: boolean) {
    const a = action ?? "IDLE";
    this.lookTarget = a === "LOOK" || a === "SMILE" || a === "MAKHAN_CHECK" || a === "EYES_OPEN" ? 1 : 0.25;
    this.laughTarget = a === "LAUGH" || a === "MAKHAN_LAUGH" ? 1 : 0;
    if (snap) {
      this.look = this.lookTarget;
      this.laugh = this.laughTarget;
    }
  }

  update(dt: number, _time: number, camera: Camera) {
    const b = this.rig.bones;
    const root = this.character.root;
    this.phase += dt;
    const t = this.phase;
    this.look = damp(this.look, this.lookTarget, 2.5, dt);
    this.laugh = damp(this.laugh, this.laughTarget, 3, dt);
    for (const [bone, rest] of this.base) bone.quaternion.copy(rest);
    root.updateMatrixWorld(true);

    // Breathing and a child's restless sway.
    const breathe = Math.sin(t * 2 * Math.PI * 0.3);
    const sway = Math.sin(t * 0.55) * 0.6 + Math.sin(t * 1.3 + 1) * 0.4;
    rotateInModelSpace(b.Spine, root, q.setFromEuler(euler.set(0, sway * 0.03, sway * 0.025)), 1);
    rotateInModelSpace(b.Spine1, root, q.setFromEuler(euler.set(breathe * 0.012, 0, 0)), 1);
    rotateInModelSpace(b.Spine2, root, q.setFromEuler(euler.set(breathe * 0.01, sway * 0.02, 0)), 1);
    // Laughter: quick shoulders, a tipped-back head.
    if (this.laugh > 0.01) {
      const bob = Math.abs(Math.sin(t * 9)) * this.laugh;
      rotateInModelSpace(b.Spine2, root, q.setFromEuler(euler.set(-bob * 0.04, 0, 0)), 1);
      rotateInModelSpace(b.Head, root, q.setFromEuler(euler.set(-0.12 * this.laugh - bob * 0.05, 0, 0.05 * this.laugh)), 1);
    }
    // Curiosity: the head wanders, and turns to the viewer when he looks.
    const wander = q.setFromEuler(euler.set(Math.sin(t * 0.37) * 0.05, Math.sin(t * 0.23 + 2) * 0.12, Math.sin(t * 0.31) * 0.04));
    rotateInModelSpace(b.Neck, root, wander, 1 - this.look * 0.7);
    if (this.look > 0.01) {
      const head = b.Head.getWorldPosition(v2);
      const target = camera.getWorldPosition(v);
      const local = root.worldToLocal(target.clone()).sub(root.worldToLocal(head.clone()));
      const yaw = Math.max(-0.9, Math.min(0.9, Math.atan2(local.x, local.z)));
      const pitch = Math.max(-0.4, Math.min(0.4, Math.atan2(-local.y, Math.hypot(local.x, local.z))));
      rotateInModelSpace(b.Neck, root, q.setFromEuler(euler.set(pitch * 0.4, yaw * 0.4, 0)), this.look);
      rotateInModelSpace(b.Head, root, q.setFromEuler(euler.set(pitch * 0.6, yaw * 0.6, Math.sin(t * 0.8) * 0.06)), this.look);
    }
  }

  dispose() {}
}
