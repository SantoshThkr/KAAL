import {
  Bone,
  BufferAttribute,
  BufferGeometry,
  Float32BufferAttribute,
  Material,
  Matrix4,
  Mesh,
  Object3D,
  Skeleton,
  SkinnedMesh,
  Uint16BufferAttribute,
  Vector3
} from "three";

/**
 * AUTO-RIG for an unrigged, T-posed humanoid (arms out along X, facing +Z, feet on y = 0, character's left at +X).
 *
 * Production characters should arrive rigged (docs/ASSET_SPEC.md). Until they do, this turns a real sculpted model
 * into an animatable one: it measures the body (arm span, shoulder line, neck, legs), places a skeleton with Mixamo
 * bone names (so motion capture can be retargeted onto it), and skins every vertex by distance to the bones, gated by
 * body region and smoothed across the surface so joints bend instead of tearing.
 *
 * Every bone's rest rotation is identity in model space: the rest pose IS the T-pose. That makes retargeting a pure
 * rotation delta (see retarget.ts).
 */

export const RIG_BONES = [
  "Hips",
  "Spine",
  "Spine1",
  "Spine2",
  "Neck",
  "Head",
  "HeadTop_End",
  "LeftShoulder",
  "LeftArm",
  "LeftForeArm",
  "LeftHand",
  "LeftHandEnd",
  "RightShoulder",
  "RightArm",
  "RightForeArm",
  "RightHand",
  "RightHandEnd",
  "LeftUpLeg",
  "LeftLeg",
  "LeftFoot",
  "LeftToeBase",
  "LeftToe_End",
  "RightUpLeg",
  "RightLeg",
  "RightFoot",
  "RightToeBase",
  "RightToe_End"
] as const;
export type RigBone = (typeof RIG_BONES)[number];

export const RIG_PARENT: Record<RigBone, RigBone | null> = {
  Hips: null,
  Spine: "Hips",
  Spine1: "Spine",
  Spine2: "Spine1",
  Neck: "Spine2",
  Head: "Neck",
  HeadTop_End: "Head",
  LeftShoulder: "Spine2",
  LeftArm: "LeftShoulder",
  LeftForeArm: "LeftArm",
  LeftHand: "LeftForeArm",
  LeftHandEnd: "LeftHand",
  RightShoulder: "Spine2",
  RightArm: "RightShoulder",
  RightForeArm: "RightArm",
  RightHand: "RightForeArm",
  RightHandEnd: "RightHand",
  LeftUpLeg: "Hips",
  LeftLeg: "LeftUpLeg",
  LeftFoot: "LeftLeg",
  LeftToeBase: "LeftFoot",
  LeftToe_End: "LeftToeBase",
  RightUpLeg: "Hips",
  RightLeg: "RightUpLeg",
  RightFoot: "RightLeg",
  RightToeBase: "RightFoot",
  RightToe_End: "RightToeBase"
};

/** Where each deforming bone's segment ends (its continuation along the body). */
const SEGMENT_END: Record<string, RigBone> = {
  Hips: "Spine",
  Spine: "Spine1",
  Spine1: "Spine2",
  Spine2: "Neck",
  Neck: "Head",
  Head: "HeadTop_End",
  LeftShoulder: "LeftArm",
  LeftArm: "LeftForeArm",
  LeftForeArm: "LeftHand",
  LeftHand: "LeftHandEnd",
  RightShoulder: "RightArm",
  RightArm: "RightForeArm",
  RightForeArm: "RightHand",
  RightHand: "RightHandEnd",
  LeftUpLeg: "LeftLeg",
  LeftLeg: "LeftFoot",
  LeftFoot: "LeftToeBase",
  LeftToeBase: "LeftToe_End",
  RightUpLeg: "RightLeg",
  RightLeg: "RightFoot",
  RightFoot: "RightToeBase",
  RightToeBase: "RightToe_End"
};

/** Bones that carry skin. End bones only mark where the last segment stops. */
const DEFORM: RigBone[] = RIG_BONES.filter((name) => !name.endsWith("_End") && !name.endsWith("HandEnd"));

type Region = "center" | "armL" | "armR" | "legL" | "legR";
const REGION: Partial<Record<RigBone, Region>> = {
  LeftArm: "armL",
  LeftForeArm: "armL",
  LeftHand: "armL",
  RightArm: "armR",
  RightForeArm: "armR",
  RightHand: "armR",
  LeftUpLeg: "legL",
  LeftLeg: "legL",
  LeftFoot: "legL",
  LeftToeBase: "legL",
  RightUpLeg: "legR",
  RightLeg: "legR",
  RightFoot: "legR",
  RightToeBase: "legR"
};

export interface RigLandmarks {
  height: number;
  /** Estimated height of the body without headdress (from the arm span and shoulder line). */
  bodyHeight: number;
  shoulderY: number;
  neckY: number;
  hipY: number;
  kneeY: number;
  ankleY: number;
  shoulderX: number;
  fingertipL: number;
  fingertipR: number;
  torsoZ: number;
}

export interface AutoRig {
  kind: "tpose";
  root: Bone;
  bones: Record<RigBone, Bone>;
  skeleton: Skeleton;
  meshes: SkinnedMesh[];
  landmarks: RigLandmarks;
  /** Rest (T-pose) world position of every bone, model space. */
  rest: Record<RigBone, Vector3>;
}

export interface AutoRigOptions {
  /** Smoothing passes over the surface. More = softer joints. */
  smoothing?: number;
  /** Ignore these meshes' vertices when measuring the body (e.g. a hanging scarf), but still skin them. */
  excludeFromMeasure?: (mesh: Mesh) => boolean;
}

// ------------------------------------------------------------------------------------------------ measuring

const percentile = (values: number[], p: number) => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor(p * (sorted.length - 1))))];
};

function measure(points: Float32Array): RigLandmarks & { joints: Record<RigBone, Vector3> } {
  const n = points.length / 3;
  let top = 0;
  let tipL = 0;
  let tipR = 0;
  for (let i = 0; i < n; i += 1) {
    top = Math.max(top, points[i * 3 + 1]);
    tipL = Math.max(tipL, points[i * 3]);
    tipR = Math.min(tipR, points[i * 3]);
  }
  const reach = Math.min(tipL, -tipR);

  // The arm line: the median height of everything far out along X (forearms, hands).
  const armYs: number[] = [];
  const armZs: number[] = [];
  for (let i = 0; i < n; i += 1) {
    if (Math.abs(points[i * 3]) > reach * 0.62) {
      armYs.push(points[i * 3 + 1]);
      armZs.push(points[i * 3 + 2]);
    }
  }
  const armY = percentile(armYs, 0.5);
  const armZ = percentile(armZs, 0.5);

  // The shoulder line sits at the arms' height. From it, standard proportions place the rest of the body.
  const bodyHeight = Math.min(top, Math.max(armY / 0.818, (reach * 2) / 1.02));
  const shoulderY = armY;

  // Torso half-width just below the armpits: arms are out of the way there in a T-pose.
  const band: number[] = [];
  const bandZ: number[] = [];
  for (let i = 0; i < n; i += 1) {
    const y = points[i * 3 + 1];
    if (y > shoulderY - 0.13 * bodyHeight && y < shoulderY - 0.07 * bodyHeight && Math.abs(points[i * 3]) < reach * 0.5) {
      band.push(Math.abs(points[i * 3]));
      bandZ.push(points[i * 3 + 2]);
    }
  }
  const torsoHalf = Math.max(percentile(band, 0.9), 0.08 * bodyHeight);
  const torsoZ = percentile(bandZ, 0.5);
  const shoulderX = torsoHalf * 0.92;

  // Neck: the narrowest central slice above the shoulders.
  let neckY = shoulderY + 0.05 * bodyHeight;
  let narrowest = Infinity;
  for (let k = 0; k <= 24; k += 1) {
    const y = shoulderY + (0.02 + (0.14 * k) / 24) * bodyHeight;
    const slice: number[] = [];
    for (let i = 0; i < n; i += 1) {
      if (Math.abs(points[i * 3 + 1] - y) < 0.006 * bodyHeight && Math.abs(points[i * 3]) < torsoHalf * 1.1) slice.push(Math.abs(points[i * 3]));
    }
    if (slice.length < 12) continue;
    const width = percentile(slice, 0.92);
    if (width < narrowest) {
      narrowest = width;
      neckY = y;
    }
  }

  const hipY = 0.5 * bodyHeight;
  const kneeY = 0.285 * bodyHeight;
  const ankleY = 0.045 * bodyHeight;

  // Legs: median x and z per side at knee and ankle height.
  const legAt = (y: number, side: 1 | -1, band = 0.02) => {
    const xs: number[] = [];
    const zs: number[] = [];
    for (let i = 0; i < n; i += 1) {
      const x = points[i * 3];
      if (Math.abs(points[i * 3 + 1] - y) < band * bodyHeight && x * side > 0.01 * bodyHeight && Math.abs(x) < torsoHalf * 1.3) {
        xs.push(x);
        zs.push(points[i * 3 + 2]);
      }
    }
    return { x: xs.length ? percentile(xs, 0.5) : side * 0.1 * bodyHeight, z: zs.length ? percentile(zs, 0.5) : torsoZ, zs };
  };

  const joints = {} as Record<RigBone, Vector3>;
  const v = (x: number, y: number, z: number) => new Vector3(x, y, z);
  const centerAt = (y: number) => {
    const zs: number[] = [];
    for (let i = 0; i < n; i += 1) if (Math.abs(points[i * 3 + 1] - y) < 0.015 * bodyHeight && Math.abs(points[i * 3]) < torsoHalf) zs.push(points[i * 3 + 2]);
    return zs.length ? percentile(zs, 0.5) - 0.012 * bodyHeight : torsoZ;
  };

  joints.Hips = v(0, hipY + 0.03 * bodyHeight, centerAt(hipY + 0.03 * bodyHeight));
  joints.Spine = v(0, 0.59 * bodyHeight, centerAt(0.59 * bodyHeight));
  joints.Spine1 = v(0, 0.67 * bodyHeight, centerAt(0.67 * bodyHeight));
  joints.Spine2 = v(0, 0.745 * bodyHeight, centerAt(0.745 * bodyHeight));
  joints.Neck = v(0, Math.max(shoulderY + 0.015 * bodyHeight, neckY - 0.03 * bodyHeight), centerAt(neckY));
  joints.Head = v(0, neckY + 0.035 * bodyHeight, centerAt(neckY + 0.035 * bodyHeight) + 0.01 * bodyHeight);
  joints.HeadTop_End = v(0, Math.min(top, neckY + 0.17 * bodyHeight), joints.Head.z);

  for (const [side, prefix, tip] of [
    [1, "Left", tipL],
    [-1, "Right", tipR]
  ] as const) {
    const s = side;
    const reachSide = Math.abs(tip) - shoulderX;
    const armAt = (x: number) => {
      const ys: number[] = [];
      const zs: number[] = [];
      for (let i = 0; i < n; i += 1) {
        // Only the arm itself: a slice across X, but within the arm's height band (not the torso or hips below it).
        if (Math.abs(points[i * 3] - s * x) < 0.012 * bodyHeight && Math.abs(points[i * 3 + 1] - armY) < 0.09 * bodyHeight) {
          ys.push(points[i * 3 + 1]);
          zs.push(points[i * 3 + 2]);
        }
      }
      return { y: ys.length ? percentile(ys, 0.5) : armY, z: zs.length ? percentile(zs, 0.5) : armZ };
    };
    const at = (fraction: number) => {
      const x = shoulderX + reachSide * fraction;
      const { y, z } = armAt(x);
      return v(s * x, y, z);
    };
    const shoulder = at(0);
    joints[`${prefix}Shoulder` as RigBone] = v(s * 0.02 * bodyHeight, shoulder.y - 0.005 * bodyHeight, shoulder.z);
    joints[`${prefix}Arm` as RigBone] = shoulder;
    joints[`${prefix}ForeArm` as RigBone] = at(0.43);
    joints[`${prefix}Hand` as RigBone] = at(0.76);
    joints[`${prefix}HandEnd` as RigBone] = v(tip * 0.995, at(0.97).y, at(0.97).z);

    const knee = legAt(kneeY, s);
    const ankle = legAt(ankleY + 0.02 * bodyHeight, s, 0.025);
    const foot = legAt(0.015 * bodyHeight, s, 0.015);
    const hipX = (knee.x + s * 0.09 * bodyHeight) / 2;
    joints[`${prefix}UpLeg` as RigBone] = v(hipX, hipY, joints.Hips.z);
    joints[`${prefix}Leg` as RigBone] = v(knee.x, kneeY, knee.z + 0.008 * bodyHeight);
    joints[`${prefix}Foot` as RigBone] = v(ankle.x, ankleY, percentile(ankle.zs, 0.35));
    const toeZ = foot.zs.length ? percentile(foot.zs, 0.9) : ankle.z + 0.1 * bodyHeight;
    joints[`${prefix}ToeBase` as RigBone] = v(foot.x, 0.02 * bodyHeight, ankle.z + (toeZ - ankle.z) * 0.7);
    joints[`${prefix}Toe_End` as RigBone] = v(foot.x, 0.015 * bodyHeight, toeZ);
  }

  return {
    height: top,
    bodyHeight,
    shoulderY,
    neckY,
    hipY,
    kneeY,
    ankleY,
    shoulderX,
    fingertipL: tipL,
    fingertipR: tipR,
    torsoZ,
    joints
  };
}

// ------------------------------------------------------------------------------------------------ skinning

function regionOf(p: Vector3, lm: RigLandmarks): Region {
  const bh = lm.bodyHeight;
  const ax = Math.abs(p.x);
  if (ax > lm.shoulderX * 1.08 && p.y > lm.shoulderY - 0.16 * bh) return p.x > 0 ? "armL" : "armR";
  if (p.y < lm.hipY - 0.02 * bh && ax > 0.012 * bh) return p.x > 0 ? "legL" : "legR";
  return "center";
}

/** Which bones may influence a vertex in a region. Neighbouring regions share their junction bones. */
function allowed(bone: RigBone, region: Region, p: Vector3, lm: RigLandmarks) {
  const bh = lm.bodyHeight;
  if (region === "center") {
    // Head, crown, earrings: rigid on the Head. The neck blends Spine2 -> Neck -> Head over a short span.
    if (p.y > lm.neckY + 0.04 * bh) return bone === "Head";
    if (p.y > lm.neckY - 0.03 * bh) return bone === "Head" || bone === "Neck" || bone === "Spine2" || bone === "LeftShoulder" || bone === "RightShoulder";
    if (bone === "Head") return false;
  }
  const boneRegion = REGION[bone] ?? "center";
  if (boneRegion === region) return true;
  // Junctions: the upper arm reaches into the shoulder/chest, the thigh into the pelvis, and vice versa.
  if (region === "center") {
    if ((bone === "LeftArm" && p.x > lm.shoulderX * 0.7) || (bone === "RightArm" && p.x < -lm.shoulderX * 0.7)) return p.y > lm.shoulderY - 0.12 * bh;
    if ((bone === "LeftUpLeg" && p.x > 0) || (bone === "RightUpLeg" && p.x < 0)) return p.y < lm.hipY + 0.06 * bh;
    return false;
  }
  if (region === "armL") return bone === "LeftShoulder" || bone === "Spine2";
  if (region === "armR") return bone === "RightShoulder" || bone === "Spine2";
  if (region === "legL" || region === "legR") return bone === "Hips";
  return false;
}


// ------------------------------------------------------------------------------------------------ skinning (shared)

export interface Segment {
  name: string;
  /** Index of the bone in the skeleton's bone list. */
  index: number;
  a: Vector3;
  b: Vector3;
  ab: Vector3;
  lenSq: number;
}

export function makeSegment(name: string, index: number, a: Vector3, b: Vector3): Segment {
  const ab = b.clone().sub(a);
  return { name, index, a: a.clone(), b: b.clone(), ab, lenSq: ab.lengthSq() };
}

export interface SkinOptions {
  /** May this bone influence this point at all? */
  gate?: (point: Vector3, bone: string) => boolean;
  /** Distances are measured relative to this length (the body height). */
  scale: number;
  /** Anisotropic distance: multiply the horizontal (x, z) components by this. <1 makes weights follow height. */
  horizontal?: number;
  passes: number;
}

/**
 * Skin model-space meshes to bone segments: inverse-distance weights (gated), welded across UV seams, smoothed over
 * the surface, reduced to the four strongest influences. Returns SkinnedMeshes ready to bind.
 */
export function skinParts(parts: { mesh: Mesh; geometry: BufferGeometry }[], segments: Segment[], options: SkinOptions): SkinnedMesh[] {
  const meshes: SkinnedMesh[] = [];
  const p = new Vector3();
  const bh = options.scale;
  const horizontal = options.horizontal ?? 1;
  const B = segments.length;
  const closest = new Vector3();

  for (const { mesh, geometry } of parts) {
    const position = geometry.getAttribute("position");
    const count = position.count;

    // Weld duplicate positions (UV seams) so smoothing cannot tear a seam apart.
    const weldKey = new Map<string, number>();
    const welded = new Int32Array(count);
    let unique = 0;
    const quant = 1e5;
    for (let i = 0; i < count; i += 1) {
      const key = `${Math.round(position.getX(i) * quant)},${Math.round(position.getY(i) * quant)},${Math.round(position.getZ(i) * quant)}`;
      let id = weldKey.get(key);
      if (id === undefined) {
        id = unique++;
        weldKey.set(key, id);
      }
      welded[i] = id;
    }

    const weights = new Float32Array(unique * B);
    const seen = new Uint8Array(unique);
    for (let i = 0; i < count; i += 1) {
      const id = welded[i];
      if (seen[id]) continue;
      seen[id] = 1;
      p.fromBufferAttribute(position, i);
      let sum = 0;
      for (let s = 0; s < B; s += 1) {
        const seg = segments[s];
        if (options.gate && !options.gate(p, seg.name)) continue;
        const t = seg.lenSq > 0 ? Math.min(1, Math.max(0, ((p.x - seg.a.x) * seg.ab.x + (p.y - seg.a.y) * seg.ab.y + (p.z - seg.a.z) * seg.ab.z) / seg.lenSq)) : 0;
        closest.copy(seg.a).addScaledVector(seg.ab, t).sub(p);
        const d2 = (closest.x * closest.x * horizontal + closest.y * closest.y + closest.z * closest.z * horizontal) / (bh * bh);
        const w = 1 / Math.pow(d2 + 0.0004, 2);
        weights[id * B + s] = w;
        sum += w;
      }
      if (sum > 0) for (let s = 0; s < B; s += 1) weights[id * B + s] /= sum;
    }

    // Surface adjacency on welded ids.
    const index = geometry.getIndex();
    const triangles = index ? index.count / 3 : count / 3;
    const degree = new Int32Array(unique);
    const pairs: number[] = [];
    for (let t = 0; t < triangles; t += 1) {
      const a = welded[index ? index.getX(t * 3) : t * 3];
      const b = welded[index ? index.getX(t * 3 + 1) : t * 3 + 1];
      const c = welded[index ? index.getX(t * 3 + 2) : t * 3 + 2];
      pairs.push(a, b, b, c, c, a);
    }
    for (let k = 0; k < pairs.length; k += 2) {
      degree[pairs[k]] += 1;
      degree[pairs[k + 1]] += 1;
    }
    const offsets = new Int32Array(unique + 1);
    for (let id = 0; id < unique; id += 1) offsets[id + 1] = offsets[id] + degree[id];
    const adjacency = new Int32Array(offsets[unique]);
    const fill = offsets.slice(0, unique);
    for (let k = 0; k < pairs.length; k += 2) {
      adjacency[fill[pairs[k]]++] = pairs[k + 1];
      adjacency[fill[pairs[k + 1]]++] = pairs[k];
    }

    // Laplacian smoothing: joints bend smoothly instead of creasing.
    let current = weights;
    let next = new Float32Array(current.length);
    for (let pass = 0; pass < options.passes; pass += 1) {
      for (let id = 0; id < unique; id += 1) {
        const from = offsets[id];
        const to = offsets[id + 1];
        const base = id * B;
        if (to === from) {
          for (let s = 0; s < B; s += 1) next[base + s] = current[base + s];
          continue;
        }
        const inv = 0.5 / (to - from);
        for (let s = 0; s < B; s += 1) {
          let sum = 0;
          for (let k = from; k < to; k += 1) sum += current[adjacency[k] * B + s];
          next[base + s] = current[base + s] * 0.5 + sum * inv;
        }
      }
      [current, next] = [next, current];
    }

    // Smoothing diffuses influence a few rings past the gates; put it back where it belongs.
    if (options.gate) {
      const seenGate = new Uint8Array(unique);
      for (let i = 0; i < count; i += 1) {
        const id = welded[i];
        if (seenGate[id]) continue;
        seenGate[id] = 1;
        p.fromBufferAttribute(position, i);
        const base = id * B;
        let sum = 0;
        for (let s = 0; s < B; s += 1) {
          if (!options.gate(p, segments[s].name)) current[base + s] = 0;
          sum += current[base + s];
        }
        if (sum > 0) for (let s = 0; s < B; s += 1) current[base + s] /= sum;
      }
    }

    // Top four influences per vertex.
    const skinIndex = new Uint16Array(count * 4);
    const skinWeight = new Float32Array(count * 4);
    const top = new Int32Array(4);
    const topW = new Float32Array(4);
    for (let i = 0; i < count; i += 1) {
      const base = welded[i] * B;
      top.fill(0);
      topW.fill(-1);
      for (let s = 0; s < B; s += 1) {
        const w = current[base + s];
        if (w <= topW[3]) continue;
        let k = 3;
        while (k > 0 && w > topW[k - 1]) {
          topW[k] = topW[k - 1];
          top[k] = top[k - 1];
          k -= 1;
        }
        topW[k] = w;
        top[k] = s;
      }
      let sum = 0;
      for (let k = 0; k < 4; k += 1) sum += Math.max(0, topW[k]);
      for (let k = 0; k < 4; k += 1) {
        skinIndex[i * 4 + k] = segments[top[k]].index;
        skinWeight[i * 4 + k] = sum > 0 ? Math.max(0, topW[k]) / sum : k === 0 ? 1 : 0;
      }
    }
    geometry.setAttribute("skinIndex", new Uint16BufferAttribute(skinIndex, 4));
    geometry.setAttribute("skinWeight", new Float32BufferAttribute(skinWeight, 4));
    if (!geometry.getAttribute("normal")) geometry.computeVertexNormals();

    const material = Array.isArray(mesh.material) ? mesh.material.map((m: Material) => m.clone()) : (mesh.material as Material).clone();
    const skinned = new SkinnedMesh(geometry, material);
    skinned.name = mesh.name;
    skinned.castShadow = true;
    skinned.receiveShadow = true;
    skinned.frustumCulled = false;
    meshes.push(skinned);
  }
  return meshes;
}

/** World-space (model-space) copies of every mesh under `source`, with skinning stripped. */
export function collectParts(source: Object3D) {
  source.updateMatrixWorld(true);
  const parts: { mesh: Mesh; geometry: BufferGeometry }[] = [];
  const vertex = new Vector3();
  source.traverse((object) => {
    const mesh = object as Mesh;
    if (!mesh.isMesh) return;
    const geometry = mesh.geometry.clone();
    // A mesh that is already skinned is drawn where its bones put it, not where its raw vertices say. Bake the pose
    // it is actually shown in, exactly as the renderer (and Box3) see it.
    if ((mesh as SkinnedMesh).isSkinnedMesh) {
      const skinned = mesh as SkinnedMesh;
      const position = geometry.getAttribute("position");
      for (let i = 0; i < position.count; i += 1) {
        skinned.getVertexPosition(i, vertex);
        position.setXYZ(i, vertex.x, vertex.y, vertex.z);
      }
      geometry.deleteAttribute("normal");
      geometry.computeVertexNormals();
    }
    geometry.deleteAttribute("skinIndex");
    geometry.deleteAttribute("skinWeight");
    geometry.applyMatrix4(mesh.matrixWorld);
    parts.push({ mesh, geometry });
  });
  return parts;
}

// ------------------------------------------------------------------------------------------------ main

export function autoRig(source: Object3D, options: AutoRigOptions = {}): AutoRig {
  const parts = collectParts(source);

  // Measure on everything except excluded meshes.
  const measured = parts.filter(({ mesh }) => !options.excludeFromMeasure?.(mesh));
  const total = measured.reduce((sum, { geometry }) => sum + geometry.getAttribute("position").count, 0);
  const points = new Float32Array(total * 3);
  let offset = 0;
  for (const { geometry } of measured) {
    const position = geometry.getAttribute("position");
    for (let i = 0; i < position.count; i += 1) {
      points[offset++] = position.getX(i);
      points[offset++] = position.getY(i);
      points[offset++] = position.getZ(i);
    }
  }
  const { joints, ...landmarks } = measure(points);

  // Skeleton: identity rest rotations; each bone offset from its parent.
  const bones = {} as Record<RigBone, Bone>;
  for (const name of RIG_BONES) {
    const bone = new Bone();
    bone.name = name;
    bones[name] = bone;
  }
  for (const name of RIG_BONES) {
    const parent = RIG_PARENT[name];
    const world = joints[name];
    if (parent) {
      bones[parent].add(bones[name]);
      bones[name].position.copy(world).sub(joints[parent]);
    } else {
      bones[name].position.copy(world);
    }
  }
  const root = bones.Hips;
  const boneList = RIG_BONES.map((name) => bones[name]);
  const skeleton = new Skeleton(boneList);
  const indexOf = new Map(RIG_BONES.map((name, index) => [name, index]));

  // Segments for every deforming bone: from its joint to the joint where it ends.
  const segments = DEFORM.map((name) => makeSegment(name, indexOf.get(name) as number, joints[name], joints[SEGMENT_END[name] ?? name]));

  const meshes = skinParts(parts, segments, {
    gate: (point, bone) => allowed(bone as RigBone, regionOf(point, landmarks), point, landmarks),
    scale: landmarks.bodyHeight,
    passes: options.smoothing ?? 10
  });

  // Bind every mesh to the one skeleton, in rest pose, with vertices already in model space. The inverse bind
  // matrices must be taken from the bones' up-to-date world matrices.
  root.updateMatrixWorld(true);
  skeleton.calculateInverses();
  for (const skinned of meshes) skinned.bind(skeleton, new Matrix4());

  const rest = {} as Record<RigBone, Vector3>;
  for (const name of RIG_BONES) rest[name] = joints[name].clone();
  return { kind: "tpose", root, bones, skeleton, meshes, landmarks, rest };
}

/** Count of vertices whose strongest influence is each bone: a quick sanity check of the skinning. */
export function skinReport(rig: AutoRig) {
  const counts = new Map<string, number>();
  for (const mesh of rig.meshes) {
    const index = mesh.geometry.getAttribute("skinIndex") as BufferAttribute;
    for (let i = 0; i < index.count; i += 1) {
      const name = rig.skeleton.bones[index.getX(i)].name;
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
  }
  return Object.fromEntries([...counts].sort((a, b) => b[1] - a[1]));
}
