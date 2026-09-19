import { AnimationClip, Quaternion, QuaternionKeyframeTrack, VectorKeyframeTrack } from "three";
import { RIG_PARENT, type AutoRig, type RigBone } from "./autoRig";

/** Rig-independent motion capture (scripts/extract-mocap.mjs). */
export interface MocapFile {
  format: "kaal-mocap-delta/1";
  fps: number;
  clips: Record<string, MocapClip>;
}
export interface MocapClip {
  duration: number;
  frames: number;
  /** Per bone: world rotation relative to the T-pose, [x, y, z, w] per frame. */
  bones: Partial<Record<RigBone, number[]>>;
  /** Hips travel per frame [x, y, z], as a fraction of hip height. */
  hips: number[];
}

export interface RetargetOptions {
  /** Keep the hips over their rest spot (in-place). Default true: scenes place the character. */
  inPlace?: boolean;
  /** Scale the whole motion toward the rest pose, 0..1 (1 = as captured). Calmer characters play it smaller. */
  intensity?: number;
}

const IDENTITY = new Quaternion();

/**
 * Retarget one mocap clip onto an auto-rigged character. Because the target's rest pose is a T-pose with identity
 * bone rotations, a bone's local rotation is simply  inverse(parent world delta) * (its own world delta).
 */
export function retargetClip(rig: AutoRig, file: MocapFile, name: string, options: RetargetOptions = {}): AnimationClip {
  const source = file.clips[name];
  if (!source) throw new Error(`mocap clip "${name}" not found`);
  const intensity = options.intensity ?? 1;
  const times = Array.from({ length: source.frames }, (_, frame) => Math.min(source.duration, frame / file.fps));
  const tracks = [];
  const delta = new Quaternion();
  const parentDelta = new Quaternion();
  const local = new Quaternion();

  const read = (bone: RigBone, frame: number, out: Quaternion) => {
    const data = source.bones[bone];
    if (!data) return out.identity();
    out.set(data[frame * 4], data[frame * 4 + 1], data[frame * 4 + 2], data[frame * 4 + 3]);
    // Scale the motion toward the rest pose. (Never slerpQuaternions(a, out, t) into `out` itself: three copies `a`
    // into it first, which would erase the target and return the identity.)
    if (intensity < 1) out.copy(IDENTITY.clone().slerp(out, intensity));
    return out;
  };

  for (const bone of Object.keys(source.bones) as RigBone[]) {
    if (!rig.bones[bone]) continue;
    const values = new Float32Array(source.frames * 4);
    const parent = RIG_PARENT[bone];
    for (let frame = 0; frame < source.frames; frame += 1) {
      read(bone, frame, delta);
      if (parent) {
        read(parent, frame, parentDelta);
        local.copy(parentDelta).invert().multiply(delta);
      } else {
        local.copy(delta);
      }
      local.normalize().toArray(values, frame * 4);
    }
    // Keep consecutive keys on the same hemisphere so interpolation never takes the long way round.
    for (let frame = 1; frame < source.frames; frame += 1) {
      const a = frame * 4 - 4;
      const b = frame * 4;
      if (values[a] * values[b] + values[a + 1] * values[b + 1] + values[a + 2] * values[b + 2] + values[a + 3] * values[b + 3] < 0) {
        for (let k = 0; k < 4; k += 1) values[b + k] = -values[b + k];
      }
    }
    tracks.push(new QuaternionKeyframeTrack(`${bone}.quaternion`, times, values));
  }

  const hipHeight = rig.rest.Hips.y;
  const rest = rig.bones.Hips.position;
  const positions = new Float32Array(source.frames * 3);
  for (let frame = 0; frame < source.frames; frame += 1) {
    const dx = options.inPlace === false ? source.hips[frame * 3] : 0;
    const dz = options.inPlace === false ? source.hips[frame * 3 + 2] : 0;
    positions[frame * 3] = rest.x + dx * hipHeight * intensity;
    positions[frame * 3 + 1] = rest.y + source.hips[frame * 3 + 1] * hipHeight * intensity;
    positions[frame * 3 + 2] = rest.z + dz * hipHeight * intensity;
  }
  tracks.push(new VectorKeyframeTrack("Hips.position", times, positions));

  return new AnimationClip(name, source.duration, tracks);
}
