// Downloads the two Krishna models from Sketchfab with YOUR API token, then imports them.
//
//   1. Copy your token from https://sketchfab.com/settings/password (API token)
//   2. Put it in .env.local:   SKETCHFAB_API_TOKEN=...
//   3. npm run krishna:fetch
//
// The token is read from the environment or .env.local, sent only to api.sketchfab.com, and never printed.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { MODELS, importZips } from "./import-krishna.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envFile = join(root, ".env.local");
let token = process.env.SKETCHFAB_API_TOKEN;
if (!token && existsSync(envFile)) token = readFileSync(envFile, "utf8").match(/^SKETCHFAB_API_TOKEN\s*=\s*"?([^"\n]+)"?/m)?.[1]?.trim();
if (!token) {
  console.error("krishna:fetch: set SKETCHFAB_API_TOKEN in .env.local (your token from sketchfab.com/settings/password).");
  process.exit(1);
}

const dir = join(root, "assets-src", "sketchfab");
mkdirSync(dir, { recursive: true });
const zips = [];
for (const [uid, model] of Object.entries(MODELS)) {
  const response = await fetch(`https://api.sketchfab.com/v3/models/${uid}/download`, { headers: { Authorization: `Token ${token}` } });
  if (!response.ok) {
    console.error(`krishna:fetch: ${model.id}: Sketchfab answered ${response.status}${response.status === 401 ? " (token rejected)" : ""}`);
    continue;
  }
  const { gltf } = await response.json();
  if (!gltf?.url) {
    console.error(`krishna:fetch: ${model.id}: no glTF archive offered`);
    continue;
  }
  const zip = join(dir, `${model.id}-krishna-sketchfab.zip`);
  execFileSync("curl", ["-sL", "-m", "600", "-o", zip, gltf.url]);
  console.log(`krishna:fetch: ${model.id}: downloaded ${(gltf.size / 1048576).toFixed(1)} MB`);
  zips.push(zip);
}
await importZips(zips);
