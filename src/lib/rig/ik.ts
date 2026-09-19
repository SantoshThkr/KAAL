import { Object3D, Quaternion, Vector3 } from "three";

const boneWorld = new Vector3();
const childWorld = new Vector3();
const current = new Vector3();
const wanted = new Vector3();
const delta = new Quaternion();
const worldQuat = new Quaternion();
const parentQuat = new Quaternion();

/** Rotate `bone` (in world space, minimal arc) so that `child`, which it carries, points at `target`. */
export function aimBone(bone: Object3D, child: Object3D, target: Vector3) {
  bone.getWorldPosition(boneWorld);
  child.getWorldPosition(childWorld);
  current.subVectors(childWorld, boneWorld);
  wanted.subVectors(target, boneWorld);
  if (current.lengthSq() < 1e-10 || wanted.lengthSq() < 1e-10) return;
  delta.setFromUnitVectors(current.normalize(), wanted.normalize());
  bone.getWorldQuaternion(worldQuat);
  worldQuat.premultiply(delta);
  if (bone.parent) {
    bone.parent.getWorldQuaternion(parentQuat).invert();
    bone.quaternion.copy(parentQuat.multiply(worldQuat));
  } else {
    bone.quaternion.copy(worldQuat);
  }
  bone.updateMatrixWorld(true);
}

const a = new Vector3();
const t = new Vector3();
const toTarget = new Vector3();
const toPole = new Vector3();
const elbow = new Vector3();

/**
 * Analytic two-bone IK (shoulder -> elbow -> wrist). Puts `end` on `target` if it can reach, bending the middle joint
 * toward `pole`. Lengths come from the current pose, so it works at any character scale.
 */
export function solveTwoBone(upper: Object3D, lower: Object3D, end: Object3D, target: Vector3, pole: Vector3) {
  upper.getWorldPosition(a);
  const lenA = a.distanceTo(lower.getWorldPosition(elbow));
  const lenB = elbow.distanceTo(end.getWorldPosition(t));
  toTarget.subVectors(target, a);
  const distance = Math.min(Math.max(toTarget.length(), 1e-4), (lenA + lenB) * 0.999);
  toTarget.normalize();
  const cosAngle = Math.min(1, Math.max(-1, (lenA * lenA + distance * distance - lenB * lenB) / (2 * lenA * distance)));
  const sinAngle = Math.sqrt(1 - cosAngle * cosAngle);
  toPole.subVectors(pole, a);
  toPole.addScaledVector(toTarget, -toPole.dot(toTarget));
  if (toPole.lengthSq() < 1e-10) toPole.set(0, -1, 0).addScaledVector(toTarget, -toTarget.y);
  toPole.normalize();
  elbow.copy(a).addScaledVector(toTarget, lenA * cosAngle).addScaledVector(toPole, lenA * sinAngle);
  aimBone(upper, lower, elbow);
  aimBone(lower, end, t.copy(a).addScaledVector(toTarget, distance));
}
