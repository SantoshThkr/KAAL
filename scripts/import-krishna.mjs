// Imports the Krishna models downloaded from Sketchfab (glTF zip) into public/models/krishna as web-ready GLBs.
//
//   npm run krishna:import              find the zips in ~/Downloads (or pass paths), import both
//   npm run krishna:import -- a.zip b.zip
//   npm run krishna:fetch               download them with SKETCHFAB_API_TOKEN from .env.local, then import
//
// Sketchfab zips contain scene.gltf, scene.bin, textures/ and license.txt. The licence file names the model's URL,
// which tells us which Krishna it is. Output: resized textures (2K max), welded and pruned geometry, the heavy
// sculpt reduced to a real-time triangle budget, and a CREDITS.md entry (CC BY requires attribution).
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, prune, simplify, textureCompress, weld } from "@gltf-transform/functions";
import { MeshoptSimplifier } from "meshoptimizer";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
// KRISHNA_IMPORT_OUT / KRISHNA_IMPORT_STAGING redirect output (used to test the importer without touching public/).
const staging = process.env.KRISHNA_IMPORT_STAGING ?? join(root, "assets-src", "sketchfab");
const outDir = process.env.KRISHNA_IMPORT_OUT ?? join(root, "public", "models", "krishna");

/** The two models chosen for the film. Triangle budgets from src/data/assetSpec.json (LOD0). */
export const MODELS = {
  e06ba9c2cad240eab0320db2e48c6d08: { id: "kishore", file: "kishore-krishna.glb", maxTriangles: 80000, name: "Lord Krishna ji t pose" },
  "0eb2eecfb6d84cbe8966140bec849c3d": { id: "bal", file: "bal-krishna.glb", maxTriangles: 150000, name: "Lord Krishna – Stylized 3D Character" }
};

const log = (...args) => console.log("krishna:import", ...args);

function findZips(args) {
  if (args.length) return args;
  const dirs = [join(homedir(), "Downloads"), staging];
  const hits = [];
  for (const dir of dirs) {
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir)) {
      if (/\.zip$/i.test(name) && /krishna/i.test(name)) hits.push(join(dir, name));
    }
  }
  return hits.sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
}

function unzip(zip) {
  const target = join(staging, basename(zip).replace(/\.zip$/i, ""));
  rmSync(target, { recursive: true, force: true });
  mkdirSync(target, { recursive: true });
  execFileSync("unzip", ["-q", "-o", zip, "-d", target]);
  return target;
}

function findFile(dir, test) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      const found = findFile(path, test);
      if (found) return found;
    } else if (test(name)) return path;
  }
  return null;
}

/** Sketchfab's license.txt: model URL, author, licence. */
function readLicense(dir) {
  const file = findFile(dir, (name) => name.toLowerCase() === "license.txt");
  const text = file ? readFileSync(file, "utf8") : "";
  const uid = text.match(/sketchfab\.com\/3d-models\/[^\s]*?-([0-9a-f]{32})/i)?.[1] ?? text.match(/([0-9a-f]{32})/i)?.[1] ?? null;
  const field = (name) => text.match(new RegExp(`^\\W*${name}:[ \\t]*(\\S.*)$`, "im"))?.[1]?.trim();
  const author = field("author") ?? text.match(/by\s+([^\n]+?)\s+is licensed/i)?.[1]?.trim() ?? "unknown";
  const license = field("license type") ?? text.match(/(CC[- ]BY[^\n(]*)/i)?.[1]?.trim() ?? "see source";
  return { uid, author, license, text };
}

async function importOne(zip) {
  const dir = unzip(zip);
  const gltf = findFile(dir, (name) => /\.(gltf|glb)$/i.test(name));
  if (!gltf) throw new Error(`${basename(zip)}: no .gltf or .glb inside`);
  const license = readLicense(dir);
  const model = license.uid ? MODELS[license.uid] : null;
  const guess = model ?? (/t[_-]?pose/i.test(zip) ? MODELS.e06ba9c2cad240eab0320db2e48c6d08 : /stylized/i.test(zip) ? MODELS["0eb2eecfb6d84cbe8966140bec849c3d"] : null);
  if (!guess) throw new Error(`${basename(zip)}: cannot tell which Krishna this is (license.txt has no known model URL)`);

  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.simplifier": MeshoptSimplifier });
  const document = await io.read(gltf);
  const before = triangleCount(document);
  await MeshoptSimplifier.ready;
  await document.transform(dedup(), weld(), prune());
  let after = triangleCount(document);
  if (after > guess.maxTriangles) {
    const ratio = Math.max(0.02, guess.maxTriangles / after);
    await document.transform(simplify({ simplifier: MeshoptSimplifier, ratio, error: 0.0008, lockBorder: true }), prune());
    after = triangleCount(document);
  }
  await document.transform(textureCompress({ encoder: sharp, resize: [2048, 2048], targetFormat: "jpeg", quality: 88, slots: /^(?!.*(normal|alpha)).*$/i }));
  await document.transform(textureCompress({ encoder: sharp, resize: [2048, 2048], targetFormat: "png", slots: /normal/i }));
  mkdirSync(outDir, { recursive: true });
  const out = join(outDir, guess.file);
  await io.write(out, document);
  const size = statSync(out).size;
  log(`${guess.id}: ${basename(zip)} -> ${out.replace(root + "/", "")}  ${before.toLocaleString()} -> ${after.toLocaleString()} triangles, ${(size / 1048576).toFixed(1)} MB`);
  return { ...guess, uid: license.uid, author: license.author, license: license.license, source: license.uid ? `https://sketchfab.com/3d-models/${license.uid}` : zip };
}

function triangleCount(document) {
  let total = 0;
  for (const mesh of document.getRoot().listMeshes()) {
    for (const primitive of mesh.listPrimitives()) {
      const indices = primitive.getIndices();
      const position = primitive.getAttribute("POSITION");
      if (primitive.getMode() !== 4) continue;
      total += Math.floor((indices ? indices.getCount() : position ? position.getCount() : 0) / 3);
    }
  }
  return total;
}

function writeCredits(entries) {
  const path = join(outDir, "CREDITS.md");
  const existing = existsSync(path) ? readFileSync(path, "utf8") : "";
  const kept = existing.split("\n## ").slice(1).filter((block) => !entries.some((entry) => block.startsWith(entry.id)));
  const blocks = [
    ...kept.map((block) => `## ${block.trim()}`),
    ...entries.map((entry) => [`## ${entry.id}: ${entry.name}`, "", `- Source: ${entry.source}`, `- Author: ${entry.author}`, `- Licence: ${entry.license} (Creative Commons Attribution: credit required, changes indicated)`, `- Changes: converted to GLB, geometry welded${entry.id === "bal" ? " and reduced to a real-time triangle budget" : ""}, textures resized to 2048 px; rigged at load time by src/lib/rig.`].join("\n"))
  ];
  writeFileSync(path, ["# Krishna models: credits", "Both models are unrigged sculpts published on Sketchfab under Creative Commons Attribution.", ...blocks].join("\n\n") + "\n");
}

export async function importZips(zips) {
  if (zips.length === 0) {
    console.error("krishna:import: no Krishna zip found in ~/Downloads. Download both models as glTF (see README) or pass the zip paths.");
    process.exit(1);
  }
  const done = [];
  for (const zip of zips) {
    try {
      const result = await importOne(zip);
      if (!done.some((entry) => entry.id === result.id)) done.push(result);
    } catch (error) {
      console.error(`krishna:import: ${error.message}`);
    }
  }
  if (done.length) writeCredits(done);
  const missing = Object.values(MODELS).filter((model) => !existsSync(join(outDir, model.file)));
  log(done.length ? `imported: ${done.map((entry) => entry.id).join(", ")}` : "nothing imported");
  if (missing.length) log(`still missing: ${missing.map((model) => model.id).join(", ")}`);
  if (!done.length) process.exit(1);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await importZips(findZips(process.argv.slice(2)));
}
