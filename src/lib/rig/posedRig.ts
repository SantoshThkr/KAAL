import { Bone, Matrix4, Skeleton, Vector3, type Object3D, type SkinnedMesh } from "three";
import { collectParts, makeSegment, skinParts, type RigBone } from "./autoRig";

/**
 * A light rig for a character sculpted IN A POSE (not a T-pose): a spine-to-head chain only. The lower body stays
 * planted, and the torso, arms and whatever they hold move with the spine. Enough for breathing, sway, laughter and
 * looking around; not enough for walking, which needs a production rig (docs/ASSET_SPEC.md).
 */
export const POSED_BONES = ["Hips", "Spine", "Spine1", "Spine2", "Neck", "Head", "HeadTop_End"] as const satisfies readonly RigBone[];
export type PosedBone = (typeof POSED_BONES)[number];

export interface PosedRig {
  kind: "posed";
  root: Bone;
  bones: Record<PosedBone, Bone>;
  skeleton: Skeleton;
  meshes: SkinnedMesh[];
  landmarks: { height: number; bodyHeight: number; neckY: number };
  rest: Record<PosedBone, Vector3>;
}

const percentile = (values: number[], p: number) => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor(p * (sorted.length - 1))))];
};

export function posedRig(source: Object3D, options: { headdress?: number } = {}): PosedRig {
  const parts = collectParts(source);
  const xs: number[] = [];
  const ys: number[] = [];
  const zs: number[] = [];
  for (const { geometry } of parts) {
    const position = geometry.getAttribute("position");
    const step = Math.max(1, Math.floor(position.count / 60000));
    for (let i = 0; i < position.count; i += step) {
      xs.push(position.getX(i));
      ys.push(position.getY(i));
      zs.push(position.getZ(i));
    }
  }
  const n = ys.length;
  let height = 0;
  for (const y of ys) height = Math.max(height, y);
  // A feather or crown rises above the head; the body stops below it.
  const bodyHeight = height * (1 - (options.headdress ?? 0.12));

  const sliceWidth = (y: number, band: number) => {
    const w: number[] = [];
    for (let i = 0; i < n; i += 1) if (Math.abs(ys[i] - y) < band && Math.abs(xs[i]) < bodyHeight * 0.3) w.push(Math.abs(xs[i]));
    return w.length > 8 ? percentile(w, 0.9) : Infinity;
  };
  const centerZ = (y: number) => {
    const z: number[] = [];
    for (let i = 0; i < n; i += 1) if (Math.abs(ys[i] - y) < bodyHeight * 0.02 && Math.abs(xs[i]) < bodyHeight * 0.12) z.push(zs[i]);
    return z.length ? percentile(z, 0.5) : 0;
  };

  // Neck: the narrowest slice in the upper third (a child's head is large, so the neck sits low).
  let neckY = bodyHeight * 0.74;
  let narrowest = Infinity;
  for (let k = 0; k <= 30; k += 1) {
    const y = bodyHeight * (0.62 + (0.22 * k) / 30);
    const width = sliceWidth(y, bodyHeight * 0.006);
    if (width < narrowest) {
      narrowest = width;
      neckY = y;
    }
  }
  const hipsY = neckY * 0.6;
  const at = (y: number, dz = 0) => new Vector3(0, y, centerZ(y) + dz);
  const joints: Record<PosedBone, Vector3> = {
    Hips: at(hipsY),
    Spine: at(hipsY + (neckY - hipsY) * 0.3),
    Spine1: at(hipsY + (neckY - hipsY) * 0.55),
    Spine2: at(hipsY + (neckY - hipsY) * 0.8),
    Neck: at(neckY - bodyHeight * 0.015),
    Head: at(neckY + bodyHeight * 0.03),
    HeadTop_End: at(height * 0.98)
  };

  const bones = {} as Record<PosedBone, Bone>;
  POSED_BONES.forEach((name, index) => {
    const bone = new Bone();
    bone.name = name;
    bones[name] = bone;
    if (index > 0) {
      const parent = POSED_BONES[index - 1];
      bones[parent].add(bone);
      bone.position.copy(joints[name]).sub(joints[parent]);
    } else {
      bone.position.copy(joints[name]);
    }
  });
  const root = bones.Hips;
  root.updateMatrixWorld(true);
  const skeleton = new Skeleton(POSED_BONES.map((name) => bones[name]));
  skeleton.calculateInverses();

  const segments = POSED_BONES.slice(0, -1).map((name, index) => makeSegment(name, index, joints[name], joints[POSED_BONES[index + 1]]));
  // Below the hips everything belongs to the hips: the feet stay planted.
  segments[0] = makeSegment("Hips", 0, new Vector3(0, -bodyHeight, joints.Hips.z), joints.Spine);
  const meshes = skinParts(parts, segments, { scale: bodyHeight, horizontal: 0.04, passes: 8 });
  for (const mesh of meshes) mesh.bind(skeleton, new Matrix4());

  const rest = {} as Record<PosedBone, Vector3>;
  for (const name of POSED_BONES) rest[name] = joints[name].clone();
  return { kind: "posed", root, bones, skeleton, meshes, landmarks: { height, bodyHeight, neckY }, rest };
}
