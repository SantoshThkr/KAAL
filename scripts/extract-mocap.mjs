// Extracts motion-capture clips from a Mixamo-rigged GLB into a rig-independent form: for every bone and frame, the
// bone's WORLD rotation relative to its T-pose (a "delta"), plus the hips' travel normalised by hip height.
// Any rig whose rest pose is a T-pose with identity bone rotations (lib/rig/autoRig.ts) can play these directly.
//
//   node scripts/extract-mocap.mjs <mixamo.glb> <out.json> [clipName=newName ...]
import { readFileSync, writeFileSync } from "node:fs";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { AnimationMixer, Quaternion, Vector3 } from "three";

const [input, output, ...renames] = process.argv.slice(2);
if (!input || !output) {
  console.error("usage: node scripts/extract-mocap.mjs <mixamo.glb> <out.json> [clip=name ...]");
  process.exit(1);
}
const FPS = 30;
const BONES = ["Hips", "Spine", "Spine1", "Spine2", "Neck", "Head", "LeftShoulder", "LeftArm", "LeftForeArm", "LeftHand", "RightShoulder", "RightArm", "RightForeArm", "RightHand", "LeftUpLeg", "LeftLeg", "LeftFoot", "LeftToeBase", "RightUpLeg", "RightLeg", "RightFoot", "RightToeBase"];
const wanted = new Map(renames.map((pair) => pair.split("=")));

const buffer = readFileSync(input);
const gltf = await new Promise((resolve, reject) =>
  new GLTFLoader().parse(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength), "", resolve, reject)
);
const scene = gltf.scene;
scene.updateMatrixWorld(true);

const byName = new Map();
scene.traverse((object) => {
  if (!object.isBone) return;
  const name = object.name.replace(/^mixamorig:?/, "");
  if (BONES.includes(name)) byName.set(name, object);
});
const missing = BONES.filter((name) => !byName.has(name));
if (missing.length) {
  console.error("source rig is missing bones:", missing.join(", "));
  process.exit(1);
}

const worldQuat = (bone) => bone.getWorldQuaternion(new Quaternion());
const restInverse = new Map(BONES.map((name) => [name, worldQuat(byName.get(name)).invert()]));
const restHips = byName.get("Hips").getWorldPosition(new Vector3());
const hipHeight = restHips.y;

const mixer = new AnimationMixer(scene);
const clips = {};
for (const clip of gltf.animations) {
  const name = wanted.size ? wanted.get(clip.name) : clip.name;
  if (!name) continue;
  mixer.stopAllAction();
  const action = mixer.clipAction(clip);
  action.play();
  const frames = Math.max(2, Math.round(clip.duration * FPS) + 1);
  const bones = Object.fromEntries(BONES.map((b) => [b, []]));
  const hips = [];
  const q = new Quaternion();
  const p = new Vector3();
  for (let f = 0; f < frames; f += 1) {
    mixer.setTime(Math.min(clip.duration, f / FPS));
    scene.updateMatrixWorld(true);
    for (const b of BONES) {
      q.copy(worldQuat(byName.get(b))).multiply(restInverse.get(b)).normalize();
      bones[b].push(+q.x.toFixed(4), +q.y.toFixed(4), +q.z.toFixed(4), +q.w.toFixed(4));
    }
    byName.get("Hips").getWorldPosition(p).sub(restHips).divideScalar(hipHeight);
    hips.push(+p.x.toFixed(4), +p.y.toFixed(4), +p.z.toFixed(4));
  }
  clips[name] = { duration: +clip.duration.toFixed(4), frames, bones, hips };
  mixer.uncacheAction(clip);
  console.log(`${clip.name} -> ${name}: ${clip.duration.toFixed(2)}s, ${frames} frames`);
}

writeFileSync(
  output,
  JSON.stringify({
    format: "kaal-mocap-delta/1",
    fps: FPS,
    note: "Per-bone world rotation relative to T-pose (x,y,z,w per frame); hips travel as a fraction of hip height.",
    source: input.split("/").pop(),
    clips
  })
);
console.log(`wrote ${output}`);
