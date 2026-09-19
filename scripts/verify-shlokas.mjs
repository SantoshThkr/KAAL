// Verifies the shloka data.
//
//   npm run shlokas:verify               integrity + cross-check against an independent public corpus (needs network)
//   npm run shlokas:verify -- --strict   also exit 1 unless every verse has a human Supersite sign-off (release gate)
//
// Sanskrit is never edited by hand. Integrity: NFC, four pādas, danda placement, SHA-256 lock.
// Cross-check: Devanagari letters (whitespace, dandas and verse numbers stripped) must equal the corpus exactly.
// Sign-off: a person compares each verse on https://www.gitasupersite.in/ (its verse API needs a login, so this cannot
// be automated) and records their name in src/data/shlokas.ts.
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const strict = process.argv.includes("--strict");
const { SHLOKAS } = await import(pathToFileURL(join(root, "src/data/shlokas.ts")).href);

const CORPUS_URL = "https://raw.githubusercontent.com/gita/gita/main/data/verse.json";
const letters = (text) => text.normalize("NFC").replace(/[\s।॥|\d.]/g, "");
const failures = [];
const fail = (id, message) => {
  failures.push(`${id}: ${message}`);
  console.log(`  FAIL ${id}: ${message}`);
};

console.log("Integrity");
for (const shloka of SHLOKAS) {
  const joined = shloka.sanskrit.join("\n");
  if (joined !== joined.normalize("NFC")) fail(shloka.id, "Sanskrit is not NFC-normalised");
  if (shloka.sanskrit.length !== 4) fail(shloka.id, "expected four pādas");
  if (!shloka.sanskrit[1].endsWith("।") || !shloka.sanskrit[3].endsWith("॥")) fail(shloka.id, "pāda 2 must end with । and pāda 4 with ॥");
  const hash = createHash("sha256").update(joined.normalize("NFC")).digest("hex");
  if (hash !== shloka.verification.sanskritSha256) fail(shloka.id, `Sanskrit changed: hash ${hash} does not match the lock`);
}
if (failures.length === 0) console.log(`  ok: ${SHLOKAS.length} verses intact`);

console.log("Corpus cross-check");
try {
  const response = await fetch(CORPUS_URL, { signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const corpus = await response.json();
  let matched = 0;
  for (const shloka of SHLOKAS) {
    const entry = corpus.find((candidate) => candidate.chapter_number === shloka.chapter && candidate.verse_number === shloka.verse);
    if (!entry) {
      fail(shloka.id, "not found in corpus");
      continue;
    }
    const theirs = letters(entry.text.replace(/।।\s*\d+\.\d+\s*।।/, "").replace(/^श्री\s*भगवानुवाच/, ""));
    const ours = letters(shloka.sanskrit.join(""));
    if (theirs === ours) matched += 1;
    else fail(shloka.id, `differs from corpus\n    ours:   ${ours}\n    corpus: ${theirs}`);
  }
  console.log(`  ${matched}/${SHLOKAS.length} match the corpus letter for letter`);
} catch (error) {
  console.log(`  skipped: could not reach the corpus (${error.message}). Integrity checks above still apply.`);
}

console.log("Supersite sign-off");
const unsigned = SHLOKAS.filter((shloka) => shloka.verification.supersiteSignOff === null);
console.log(`  ${SHLOKAS.length - unsigned.length}/${SHLOKAS.length} signed off by a person${unsigned.length ? ` · pending: ${unsigned.map((shloka) => shloka.id).join(", ")}` : ""}`);
const draft = SHLOKAS.filter((shloka) => shloka.meaningReview === "draft");
console.log(`  ${draft.length}/${SHLOKAS.length} meanings (Hindi + English) still marked draft`);

if (failures.length > 0) process.exit(1);
if (strict && (unsigned.length > 0 || draft.length > 0)) {
  console.log("STRICT: release blocked until every verse is signed off and every meaning reviewed.");
  process.exit(1);
}
