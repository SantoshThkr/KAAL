import { Color, DoubleSide, Group, Mesh, MeshBasicMaterial, Object3D, PlaneGeometry, type Texture } from "three";
import { FACE, KRISHNA_PARTS, anchor, type PartArt } from "@/art/krishnaArt";
import * as art from "@/art/krishnaArt";

/**
 * Krishna as a jointed puppet: every drawing hangs on a joint, and the joints form a body. The rig is 2.5D — flat
 * parts at slightly different depths inside the 3D world — which is what gives the film its animated-cartoon look
 * while still letting the camera dolly, push in and parallax through the scene.
 */

export type BoneName =
  | "root"
  | "hips"
  | "torso"
  | "head"
  | "neck"
  | "eyeL"
  | "eyeR"
  | "irisL"
  | "irisR"
  | "lidL"
  | "lidR"
  | "browL"
  | "browR"
  | "mouth"
  | "crown"
  | "armNearUpper"
  | "armNearFore"
  | "handNear"
  | "armFarUpper"
  | "armFarFore"
  | "handFar"
  | "legNearThigh"
  | "legNearShin"
  | "footNear"
  | "legFarThigh"
  | "legFarShin"
  | "footFar"
  | "flute";

/** Body proportions, in metres. "Near" limbs are on the viewer's side of the body. */
export interface PuppetProportions {
  height: number;
  headHeight: number;
  torsoHeight: number;
  thigh: number;
  shin: number;
  foot: number;
  armUpper: number;
  armFore: number;
  hand: number;
  fluteLength: number;
  /** How wide the body is drawn, relative to the art's natural aspect. */
  girth: number;
}

export const BAL: PuppetProportions = {
  height: 1.06,
  headHeight: 0.33,
  torsoHeight: 0.33,
  thigh: 0.17,
  shin: 0.15,
  foot: 0.07,
  armUpper: 0.15,
  armFore: 0.13,
  hand: 0.095,
  fluteLength: 0.34,
  girth: 1.12
};

export const KISHORE: PuppetProportions = {
  height: 1.66,
  headHeight: 0.36,
  torsoHeight: 0.52,
  thigh: 0.34,
  shin: 0.32,
  foot: 0.09,
  armUpper: 0.29,
  armFore: 0.26,
  hand: 0.13,
  fluteLength: 0.52,
  girth: 0.76
};

export interface Puppet {
  root: Group;
  bones: Record<BoneName, Object3D>;
  parts: Map<string, Mesh>;
  proportions: PuppetProportions;
  /** Height of the hips above the ground, where the leg chains hang from. */
  hipHeight: number;
  mouths: Record<"smile" | "open" | "flute" | "soft", Texture>;
  hands: Record<"open" | "grip", Texture>;
  /** Tint every drawing by the scene's light. */
  setTint(color: Color, shade: number): void;
  dispose(): void;
}

const DEPTH = {
  hairBack: -0.05,
  armFar: -0.04,
  legFar: -0.03,
  legNear: -0.008,
  dhoti: 0.004,
  torso: 0.01,
  head: 0.02,
  face: 0.022,
  hairFront: 0.026,
  crown: 0.03,
  armNear: 0.04,
  flute: 0.05
};

function makeMesh(part: PartArt, texture: Texture, worldHeight: number, widthScale = 1) {
  const height = worldHeight;
  const width = (part.w / part.h) * worldHeight * widthScale;
  const geometry = new PlaneGeometry(width, height);
  // Move the pivot to the mesh's origin, so rotating the object rotates the drawing about its joint.
  geometry.translate(-((part.pivot[0] / part.w) - 0.5) * width, ((part.pivot[1] / part.h) - 0.5) * height, 0);
  const material = new MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, side: DoubleSide, toneMapped: true });
  const mesh = new Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.userData.unitsPerMetre = part.h / worldHeight;
  return mesh;
}

/**
 * A limb drawing hangs from its pivot, which sits a little above the top of the drawn shape so the joint tucks under
 * its parent. This returns the height to draw it at so that the span from the pivot to the END of the drawing is
 * exactly the bone length — without it every joint lands short and the chain comes apart on an extended arm.
 */
const segment = (part: PartArt, boneLength: number) => (boneLength * part.h) / (part.h - part.pivot[1]);

/** Offset (metres) of a point in a part's art from that part's pivot. */
const at = (part: PartArt, worldHeight: number, x: number, y: number, widthScale = 1): [number, number] => {
  const [ax, ay] = anchor(part, x, y);
  const perUnit = worldHeight / part.h;
  return [ax * perUnit * widthScale, ay * perUnit];
};

export function buildPuppet(proportions: PuppetProportions, textures: Map<string, Texture>): Puppet {
  const bones = {} as Record<BoneName, Object3D>;
  const parts = new Map<string, Mesh>();
  const materials: MeshBasicMaterial[] = [];
  const texture = (id: string) => textures.get(id) as Texture;

  const joint = (name: BoneName, parent: Object3D | null, x = 0, y = 0, z = 0) => {
    const group = new Group();
    group.name = name;
    group.position.set(x, y, z);
    bones[name] = group;
    (parent ?? new Group()).add(group);
    return group;
  };

  /** Hang a drawing on a joint. `key` names this instance (both hands use the same art, but are separate meshes). */
  const attach = (bone: Object3D, part: PartArt, worldHeight: number, z: number, key = part.id, widthScale = 1) => {
    const mesh = makeMesh(part, texture(part.id), worldHeight, widthScale);
    mesh.position.z = z;
    mesh.renderOrder = Math.round((z + 1) * 1000);
    mesh.name = key;
    bone.add(mesh);
    parts.set(key, mesh);
    materials.push(mesh.material as MeshBasicMaterial);
    return mesh;
  };

  const p = proportions;
  const root = new Group();
  root.name = "krishna";
  bones.root = root;

  const hipHeight = p.foot * 0.35 + p.shin + p.thigh;
  const hips = joint("hips", root, 0, hipHeight, 0);

  // ---- legs (hang from the hips; the far leg sits behind the dhoti)
  const leg = (side: "Near" | "Far", dir: number) => {
    const depth = side === "Near" ? DEPTH.legNear : DEPTH.legFar;
    const thigh = joint(`leg${side}Thigh` as BoneName, hips, dir * p.thigh * 0.22, 0, depth);
    attach(thigh, art.legThigh, segment(art.legThigh, p.thigh), 0, `leg${side}Thigh`).scale.x = dir;
    const shin = joint(`leg${side}Shin` as BoneName, thigh, 0, -p.thigh, 0.001);
    attach(shin, art.legShin, segment(art.legShin, p.shin), 0, `leg${side}Shin`).scale.x = dir;
    const foot = joint(`foot${side}` as BoneName, shin, 0, -p.shin, 0.002);
    attach(foot, art.foot, p.foot, 0, `foot${side}`).scale.x = dir;
  };
  leg("Far", -1);
  leg("Near", 1);

  // ---- body
  attach(hips, art.dhoti, p.torsoHeight * 0.78, DEPTH.dhoti, "dhoti", p.girth * 1.06);
  const torso = joint("torso", hips, 0, 0, DEPTH.torso);
  attach(torso, art.torso, p.torsoHeight, 0, "torso", p.girth);

  // Shoulders and neck, read from the torso art.
  const shoulderL = at(art.torso, p.torsoHeight, 52, 40, p.girth);
  const shoulderR = at(art.torso, p.torsoHeight, 168, 40, p.girth);
  const neckPoint = at(art.torso, p.torsoHeight, 110, 14, p.girth);

  // Mirroring is applied to the DRAWINGS, never to the joints, so both arms share one set of rotation maths.
  const arm = (side: "Near" | "Far", shoulder: [number, number], dir: number) => {
    const depth = side === "Near" ? DEPTH.armNear : DEPTH.armFar;
    const upper = joint(`arm${side}Upper` as BoneName, torso, shoulder[0], shoulder[1], depth);
    attach(upper, art.armUpper, segment(art.armUpper, p.armUpper), 0, `arm${side}Upper`).scale.x = dir;
    const fore = joint(`arm${side}Fore` as BoneName, upper, 0, -p.armUpper, 0.001);
    attach(fore, art.armFore, segment(art.armFore, p.armFore), 0, `arm${side}Fore`).scale.x = dir;
    const hand = joint(`hand${side}` as BoneName, fore, 0, -p.armFore, 0.002);
    attach(hand, art.hand, p.hand, 0, `hand${side}`).scale.x = dir;
  };
  arm("Far", shoulderR, -1);
  arm("Near", shoulderL, 1);

  // ---- head
  const neck = joint("neck", torso, neckPoint[0], neckPoint[1], DEPTH.head);
  const head = joint("head", neck, 0, 0, 0);
  attach(head, art.hairBack, p.headHeight * 1.04, DEPTH.hairBack, "hairBack");
  attach(head, art.head, p.headHeight, 0, "face");

  const eye = (side: "L" | "R", point: readonly [number, number]) => {
    const offset = at(art.head, p.headHeight, point[0], point[1]);
    const socket = joint(`eye${side}` as BoneName, head, offset[0], offset[1], DEPTH.face);
    attach(socket, art.eyeWhite, p.headHeight * (art.eyeWhite.h / art.head.h) * 0.98, 0, `eyeWhite${side}`);
    const irisBone = joint(`iris${side}` as BoneName, socket, 0, 0, 0.001);
    attach(irisBone, art.iris, p.headHeight * (art.iris.h / art.head.h) * 0.98, 0, `iris${side}`);
    const lid = joint(`lid${side}` as BoneName, socket, 0, p.headHeight * 0.062, 0.002);
    attach(lid, art.eyelid, p.headHeight * (art.eyelid.h / art.head.h) * 1.06, 0, `lid${side}`);
    lid.scale.y = 0.001;
  };
  eye("L", FACE.eyeLeft);
  eye("R", FACE.eyeRight);

  const browBone = (side: "L" | "R", point: readonly [number, number]) => {
    const offset = at(art.head, p.headHeight, point[0], point[1]);
    const bone = joint(`brow${side}` as BoneName, head, offset[0], offset[1], DEPTH.face);
    const mesh = attach(bone, art.brow, p.headHeight * (art.brow.h / art.head.h) * 0.72, 0, `brow${side}`);
    if (side === "R") mesh.scale.x = -1;
  };
  browBone("L", FACE.browLeft);
  browBone("R", FACE.browRight);

  const mouthOffset = at(art.head, p.headHeight, FACE.mouth[0], FACE.mouth[1]);
  const mouth = joint("mouth", head, mouthOffset[0], mouthOffset[1], DEPTH.face);
  attach(mouth, art.mouthSmile, p.headHeight * (art.mouthSmile.h / art.head.h) * 0.95, 0, "mouth");

  attach(head, art.hairFront, p.headHeight, DEPTH.hairFront, "hairFront");

  const crownOffset = at(art.head, p.headHeight, FACE.crown[0], FACE.crown[1]);
  const crown = joint("crown", head, crownOffset[0], crownOffset[1], DEPTH.crown);
  attach(crown, art.crown, p.headHeight * (art.crown.h / art.head.h), 0, "crown");

  // ---- the flute, carried by the near hand until a scene lifts it to his lips
  const flute = joint("flute", bones.handNear, 0, -p.hand * 0.55, DEPTH.flute);
  attach(flute, art.flute, (p.fluteLength * art.flute.h) / art.flute.w, 0, "flute");

  const tint = new Color();
  return {
    root,
    bones,
    parts,
    proportions: p,
    hipHeight,
    mouths: {
      smile: texture(art.mouthSmile.id),
      open: texture(art.mouthOpen.id),
      flute: texture(art.mouthFlute.id),
      soft: texture(art.mouthSoft.id)
    },
    hands: { open: texture(art.hand.id), grip: texture(art.handGrip.id) },
    setTint(color: Color, shade: number) {
      tint.copy(color).multiplyScalar(shade);
      for (const material of materials) material.color.copy(tint);
    },
    dispose() {
      for (const mesh of parts.values()) {
        mesh.geometry.dispose();
        (mesh.material as MeshBasicMaterial).dispose();
      }
      root.removeFromParent();
    }
  };
}

export const KRISHNA_ART_PARTS = KRISHNA_PARTS;
