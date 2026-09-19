// Copies the Draco and Basis (KTX2) decoders out of three's examples into public/decoders so they are served from our
// own origin. drei and three default to third-party CDNs; a film should not depend on someone else's server at load.
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const libs = join(root, "node_modules/three/examples/jsm/libs");

const jobs = [
  { from: join(libs, "draco/gltf"), to: join(root, "public/decoders/draco"), files: ["draco_decoder.js", "draco_decoder.wasm", "draco_wasm_wrapper.js"] },
  { from: join(libs, "basis"), to: join(root, "public/decoders/basis"), files: ["basis_transcoder.js", "basis_transcoder.wasm"] }
];

for (const job of jobs) {
  mkdirSync(job.to, { recursive: true });
  for (const file of job.files) {
    const source = join(job.from, file);
    if (!existsSync(source)) {
      console.error(`copy-decoders: missing ${source}. Did npm install finish?`);
      process.exit(1);
    }
    cpSync(source, join(job.to, file));
  }
}
console.log("copy-decoders: draco + basis decoders are in public/decoders");
