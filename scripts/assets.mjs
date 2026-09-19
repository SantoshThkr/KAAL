// Production asset checker. Reads src/data/assetSpec.json, looks at public/, validates any GLB that exists against
// the spec (bones, meshes, morph targets, clips, triangle budget, compression), and regenerates TODO.md.
//
//   npm run assets:check            report + rewrite TODO.md
//   npm run assets:check -- --strict   also exit 1 if anything required is missing or invalid (for CI / release)
//
// GLB validation reads only the JSON chunk, so it works on Meshopt/Draco/KTX2-compressed files without decoding them.
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const spec = JSON.parse(readFileSync(join(root, "src/data/assetSpec.json"), "utf8"));
// The timeline is erasable TypeScript (type-only imports), so Node can load it directly.
const { SCENES } = await import(pathToFileURL(join(root, "src/data/cinematicTimeline.ts")).href);
const strict = process.argv.includes("--strict");
const publicPath = (file) => join(root, "public", file);
const fmt = (n) => n.toLocaleString("en-US");

/** The JSON chunk of a .glb, or throws. */
function readGlbJson(path) {
  const buffer = readFileSync(path);
  if (buffer.length < 20 || buffer.readUInt32LE(0) !== 0x46546c67) throw new Error("not a GLB (bad magic number)");
  if (buffer.readUInt32LE(16) !== 0x4e4f534a) throw new Error("first GLB chunk is not JSON");
  return JSON.parse(buffer.toString("utf8", 20, 20 + buffer.readUInt32LE(12)));
}

function inspectGlb(json) {
  const nodes = json.nodes ?? [];
  const meshes = json.meshes ?? [];
  const accessors = json.accessors ?? [];
  const meshTriangles = meshes.map((mesh) =>
    (mesh.primitives ?? []).reduce((total, primitive) => {
      if (primitive.mode !== undefined && primitive.mode !== 4) return total;
      const count = primitive.indices !== undefined ? accessors[primitive.indices]?.count : accessors[primitive.attributes?.POSITION]?.count;
      return total + Math.floor((count ?? 0) / 3);
    }, 0)
  );
  const names = new Set(nodes.map((node) => node.name).filter(Boolean));
  for (const mesh of meshes) if (mesh.name) names.add(mesh.name);
  const morphs = new Set();
  for (const mesh of meshes) {
    for (const name of mesh.extras?.targetNames ?? []) morphs.add(name);
    for (const primitive of mesh.primitives ?? []) for (const name of primitive.extras?.targetNames ?? []) morphs.add(name);
  }
  let triangles = 0;
  for (const node of nodes) if (node.mesh !== undefined) triangles += meshTriangles[node.mesh] ?? 0;
  const extensions = new Set(json.extensionsUsed ?? []);
  return {
    names,
    morphs,
    clips: new Set((json.animations ?? []).map((animation) => animation.name).filter(Boolean)),
    triangles,
    skins: (json.skins ?? []).length,
    compressed: extensions.has("EXT_meshopt_compression") || extensions.has("KHR_draco_mesh_compression"),
    ktx2: extensions.has("KHR_texture_basisu"),
    images: (json.images ?? []).length
  };
}

/** Everything a character GLB must contain, resolved from its template. */
function requirementsFor(character) {
  const template = character.template ? spec.templates[character.template] : {};
  return {
    bones: character.requiredBones ?? template.requiredBones ?? [],
    chains: character.secondaryBoneChains ?? template.secondaryBoneChains ?? {},
    meshes: character.requiredMeshes ?? template.requiredMeshes ?? [],
    morphs: character.requiredMorphTargets ?? template.requiredMorphTargets ?? [],
    preferredMorphs: template.preferredMorphTargets ?? [],
    clips: character.requiredClips ?? []
  };
}

function validateCharacter(character, info, budget) {
  const req = requirementsFor(character);
  const problems = [];
  const missingBones = req.bones.filter((name) => !info.names.has(name));
  if (missingBones.length) problems.push(`missing bones: ${missingBones.join(", ")}`);
  for (const [prefix, minimum] of Object.entries(req.chains)) {
    const found = [...info.names].filter((name) => name.startsWith(prefix)).length;
    if (found < minimum) problems.push(`secondary chain ${prefix}* needs >= ${minimum} bones, found ${found}`);
  }
  const missingMeshes = req.meshes.filter((name) => !info.names.has(name));
  if (missingMeshes.length) problems.push(`missing named meshes: ${missingMeshes.join(", ")}`);
  const missingMorphs = req.morphs.filter((name) => !info.morphs.has(name));
  if (missingMorphs.length) problems.push(`missing morph targets: ${missingMorphs.join(", ")}`);
  const lowerClips = new Set([...info.clips].map((name) => name.toLowerCase()));
  const missingClips = req.clips.filter((name) => !lowerClips.has(name.toLowerCase()));
  if (missingClips.length) problems.push(`missing clips: ${missingClips.join(", ")}`);
  if (info.skins === 0) problems.push("no skin: the character is not rigged");
  const [min, max] = Array.isArray(budget) ? budget : [0, budget];
  if (info.triangles > max) problems.push(`over budget: ${fmt(info.triangles)} triangles (max ${fmt(max)})`);
  if (info.triangles < min) problems.push(`suspiciously low: ${fmt(info.triangles)} triangles (expected ${fmt(min)}+)`);
  if (!info.compressed) problems.push("not compressed: run Meshopt (characters) or Draco (static meshes)");
  const notes = [];
  const missingPreferred = req.preferredMorphs.filter((name) => !info.morphs.has(name));
  if (missingPreferred.length) notes.push(`preferred morph targets absent (needed for speech): ${missingPreferred.join(", ")}`);
  if (info.images > 0 && !info.ktx2) notes.push("textures are not KTX2");
  return { problems, notes };
}

// ---------------------------------------------------------------------------------------------------------------
const scenesWithActor = (actor) => SCENES.filter((scene) => scene.beats.some((beat) => beat.actor === actor)).map((scene) => scene.id);
const scenesWithAudio = (id) => SCENES.filter((scene) => scene.audio.some((cue) => cue.id === id)).map((scene) => scene.id);
const specifiedAudio = new Set(Object.keys(spec.audio));
const unspecified = [...new Set(SCENES.flatMap((scene) => scene.audio.map((cue) => cue.id)))].filter((id) => id !== "*" && !specifiedAudio.has(id));

const entries = [];

for (const [key, character] of Object.entries(spec.characters)) {
  const req = requirementsFor(character);
  const detail = [
    `${character.label}: rigged GLB, ${spec.conventions.transforms}, ${spec.conventions.axes}, origin ${spec.conventions.origin}`,
    `bones (${req.bones.length}): ${req.bones.join(", ")}`,
    ...Object.entries(req.chains).map(([prefix, n]) => `secondary chain ${prefix}*: at least ${n} bones`),
    `named meshes: ${req.meshes.join(", ") || "n/a"}`,
    `morph targets (required): ${req.morphs.join(", ")}`,
    ...(req.preferredMorphs.length ? [`morph targets (preferred, needed for speech): ${req.preferredMorphs.join(", ")}`] : []),
    `height: ${character.heightMetres[0]}-${character.heightMetres[1]} m`
  ];
  entries.push({
    id: key,
    kind: "Character",
    file: character.file,
    budgetLabel: `${fmt(character.triangles.lod0[0])}-${fmt(character.triangles.lod0[1])} triangles (LOD0)`,
    budget: character.triangles.lod0,
    textures: `PBR (base colour, normal, occlusion-roughness-metal). ${spec.conventions.textures}`,
    animation: `${req.clips.length} clips, exact names: ${req.clips.join(", ")}`,
    detail,
    character,
    scenes: scenesWithActor(key)
  });
  entries.push({
    id: `${key}-lod1`,
    kind: "Character (mobile LOD1)",
    file: character.mobileFile,
    budgetLabel: `up to ${fmt(character.triangles.lod1)} triangles`,
    budget: character.triangles.lod1,
    textures: "1K variants of the same material set",
    animation: "Identical rig, bone names, morph targets and clips to LOD0. Krishna is never removed on any device; the low tier swaps to this file",
    detail: [],
    character,
    scenes: ["all"]
  });
}
for (const asset of spec.assets) {
  entries.push({ id: asset.id, kind: asset.type, file: asset.file, budgetLabel: asset.budget, textures: asset.textures, animation: asset.animation, detail: [], scenes: asset.scenes });
}
for (const [id, note] of Object.entries(spec.audio)) {
  entries.push({ id, kind: "Audio", file: `audio/${id}.m4a`, budgetLabel: "n/a", textures: "n/a", animation: note, detail: [], scenes: scenesWithAudio(id) });
}
for (const [id, note] of Object.entries(spec.voice)) {
  entries.push({ id: `voice/${id}`, kind: "Voice", file: `audio/voice/${id}.m4a (+ ${id}.timings.json)`, budgetLabel: "n/a", textures: "n/a", animation: note, detail: [], scenes: [] });
}

const present = [];
const missing = [];
const invalid = [];

for (const entry of entries) {
  const primary = entry.file.split(" ")[0];
  const path = publicPath(primary);
  if (!existsSync(path)) {
    missing.push(entry);
    continue;
  }
  const size = statSync(path).size;
  let problems = [];
  let notes = [];
  if (entry.character && primary.endsWith(".glb")) {
    try {
      const info = inspectGlb(readGlbJson(path));
      ({ problems, notes } = validateCharacter(entry.character, info, entry.budget));
    } catch (error) {
      problems = [`unreadable: ${error.message}`];
    }
  }
  (problems.length ? invalid : present).push({ entry, size, problems, notes });
}

// ---------------------------------------------------------------------------------------------------------------
const lines = [];
lines.push("# TODO: production assets", "");
lines.push("> Generated by `npm run assets:check` from `src/data/assetSpec.json`. Do not edit by hand: change the spec, or add the file.", "");
lines.push(`**${present.length} of ${entries.length} assets present and valid. ${invalid.length} present but invalid. ${missing.length} missing.**`, "");
const characterMissing = missing.filter((entry) => entry.kind === "Character");
if (characterMissing.length > 0) {
  lines.push("## BLOCKER: no Krishna exists yet", "");
  lines.push("The film is **not complete** and Phase 2 (the hard gate) cannot pass until `bal-krishna.glb` and `kishore-krishna.glb` are supplied. No stand-in has been built and none will be: a primitive Krishna is rejected by the brief. Everything else in the repository (clock, timeline, camera, lighting, audio graph, loaders) is built around these two files.", "");
  lines.push("See `docs/ASSET_SPEC.md` for the Blender and export pipeline.", "");
}
for (const { entry, problems } of invalid) {
  lines.push(`## INVALID PRODUCTION ASSET: ${entry.id}`, "", `- expected filename: \`public/${entry.file}\``, ...problems.map((problem) => `- ${problem}`), "");
}
for (const entry of missing) {
  lines.push(`## MISSING PRODUCTION ASSET: ${entry.id}`, "");
  lines.push(`- asset type: ${entry.kind}`);
  lines.push(`- expected filename: \`public/${entry.file}\``);
  lines.push(`- poly budget: ${entry.budgetLabel}`);
  lines.push(`- texture requirement: ${entry.textures}`);
  lines.push(`- animation requirement: ${entry.animation}`);
  if (entry.scenes.length) lines.push(`- used in: ${entry.scenes.join(", ")}`);
  for (const detail of entry.detail) lines.push(`- ${detail}`);
  lines.push("");
}
if (present.length) {
  lines.push("## Present and valid", "");
  for (const { entry, size, notes } of present) lines.push(`- \`public/${entry.file.split(" ")[0]}\` (${(size / 1024).toFixed(0)} KB)${notes.length ? ` (${notes.join("; ")})` : ""}`);
  lines.push("");
}
writeFileSync(join(root, "TODO.md"), lines.join("\n"));

// ---------------------------------------------------------------------------------------------------------------
console.log(`assets: ${present.length} present · ${invalid.length} invalid · ${missing.length} missing (of ${entries.length})`);
for (const kind of [...new Set(missing.map((entry) => entry.kind))]) {
  const group = missing.filter((entry) => entry.kind === kind);
  console.log(`  MISSING ${kind}: ${group.length}${kind === "Character" ? " · " + group.map((entry) => entry.id).join(", ") : ""}`);
}
for (const { entry, problems } of invalid) console.log(`  INVALID ${entry.id}: ${problems.join("; ")}`);
for (const id of unspecified) console.log(`  UNSPECIFIED audio cue used by the timeline but absent from assetSpec.json: ${id}`);
console.log("TODO.md regenerated.");
if (strict && (missing.length || invalid.length || unspecified.length)) process.exit(1);
if (unspecified.length) process.exit(1);
