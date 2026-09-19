import { AnimationClip, Box3, Group, Mesh, Vector3, type Material, type WebGLRenderer } from "three";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { CHARACTERS, MOCAP_URL, type CharacterDef, type CharacterId } from "@/data/characters";
import { DECODER_PATHS } from "@/lib/assetLoader";
import { autoRig, type AutoRig } from "@/lib/rig/autoRig";
import { posedRig, type PosedRig } from "@/lib/rig/posedRig";
import { retargetClip, type MocapFile } from "@/lib/rig/retarget";
import { configureKrishnaMaterials } from "./KrishnaMaterials";

export interface LoadedCharacter {
  def: CharacterDef;
  /** Add this to the scene. Real-world size, feet at its origin, facing its local +Z. */
  root: Group;
  rig: AutoRig | PosedRig;
  clips: Record<string, AnimationClip>;
  triangles: number;
  /** Milliseconds spent rigging, for the engineering panel. */
  rigMs: number;
}

let loader: GLTFLoader | null = null;
function gltfLoader(renderer: WebGLRenderer) {
  if (loader) return loader;
  const draco = new DRACOLoader().setDecoderPath(DECODER_PATHS.draco);
  const ktx2 = new KTX2Loader().setTranscoderPath(DECODER_PATHS.basis).detectSupport(renderer);
  loader = new GLTFLoader().setDRACOLoader(draco).setKTX2Loader(ktx2).setMeshoptDecoder(MeshoptDecoder);
  return loader;
}

let mocap: Promise<MocapFile | null> | null = null;
const loadMocap = () =>
  (mocap ??= fetch(MOCAP_URL)
    .then((response) => (response.ok ? (response.json() as Promise<MocapFile>) : null))
    .catch(() => null));

/** The clips each rig kind plays, and how strongly (Krishna is calm: the captured idle plays a little smaller). */
const CLIP_SET: Record<string, { intensity: number }> = {
  idle: { intensity: 0.85 },
  walk: { intensity: 1 },
  run: { intensity: 1 },
  agree: { intensity: 0.7 },
  headShake: { intensity: 0.6 }
};

const cache = new Map<CharacterId, Promise<LoadedCharacter>>();

export function loadCharacter(id: CharacterId, renderer: WebGLRenderer): Promise<LoadedCharacter> {
  let job = cache.get(id);
  if (!job) {
    job = build(CHARACTERS[id], renderer);
    cache.set(id, job);
  }
  return job;
}

async function build(def: CharacterDef, renderer: WebGLRenderer): Promise<LoadedCharacter> {
  const gltf = await gltfLoader(renderer).loadAsync(def.url);

  // Normalise: face +Z, feet on the ground, centred.
  const wrapper = new Group();
  wrapper.add(gltf.scene);
  wrapper.rotation.y = def.facingFix;
  wrapper.updateMatrixWorld(true);
  const box = new Box3().setFromObject(wrapper);
  const center = box.getCenter(new Vector3());
  wrapper.position.set(-center.x, -box.min.y, -center.z);
  wrapper.updateMatrixWorld(true);

  const started = performance.now();
  const rig = def.rig === "tpose" ? autoRig(wrapper) : posedRig(wrapper);
  const rigMs = performance.now() - started;

  const root = new Group();
  root.name = `Krishna_${def.id}`;
  root.add(rig.root);
  let triangles = 0;
  for (const mesh of rig.meshes) {
    root.add(mesh);
    const index = mesh.geometry.getIndex();
    triangles += (index ? index.count : mesh.geometry.getAttribute("position").count) / 3;
    configureKrishnaMaterials(mesh.material as Material | Material[]);
  }
  root.scale.setScalar(def.bodyHeight / rig.landmarks.bodyHeight);

  const clips: Record<string, AnimationClip> = {};
  if (rig.kind === "tpose") {
    const file = await loadMocap();
    if (file) {
      for (const [name, { intensity }] of Object.entries(CLIP_SET)) {
        if (file.clips[name]) clips[name] = retargetClip(rig, file, name, { intensity });
      }
    }
  }

  // Dispose the source meshes: the rig made its own copies.
  gltf.scene.traverse((object) => {
    if ((object as Mesh).isMesh) (object as Mesh).geometry.dispose();
  });

  return { def, root, rig, clips, triangles: Math.round(triangles), rigMs };
}
