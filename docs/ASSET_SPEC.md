# Production asset specification

The film is two Krishnas and a world for them. Everything else in this repository (the clock, the timeline, the camera,
the lighting, the audio graph, the loaders) is built to receive these files. **None of the characters exist yet.** No
stand-in has been built, on purpose.

The machine-readable source of truth is [`src/data/assetSpec.json`](../src/data/assetSpec.json). `npm run assets:check`
reads it, validates any file that exists, and regenerates [`TODO.md`](../TODO.md) with every missing asset. This document
explains the *why* and the export pipeline.

## 1. The look

Stylized realism. Recognizably Krishna to someone who knows nothing about the project, within the first seconds.
Not cartoonish, not childish, not anime, not a mascot, not a superhero.

Required identifiers: **blue skin**, expressive eyes, a youthful face, a peacock feather, traditional clothing, a flute,
jewellery, the Krishna hairstyle, natural proportions, expressive hands, believable facial structure.

- **Skin must read as blue under every lighting preset** (`src/data/lightingPresets.ts`), from cold moonlight to
  harsh dust. It is checked under all of them before a character is accepted. Tone mapping is AgX for this reason.
- **Bal Krishna:** playful, curious, mischievous, peaceful, alive.
- **Kishore Krishna:** graceful, calm, powerful, mysterious, compassionate. Timeless.
- The character must feel alive standing still: breathing, blinks, eye movement, small head movement, cloth, feather,
  jewellery and hair all move.

## 2. Coordinate system and scale

| | |
|---|---|
| Units | metres, 1 unit = 1 m. Blender scene units: Metric, unit scale **1.0** |
| Up / forward | +Y up, characters face **+Z** (glTF convention) |
| Origin | on the ground, between the feet, at the character's centre line |
| Height | Bal 0.95-1.15 m, Kishore 1.65-1.80 m |
| Transforms | **applied** before export: location origin, rotation 0, scale 1 |

Bal and Kishore must share origin, facing and centre, so the transformation can map one surface onto the other without
re-registering them. Only the height differs.

## 3. Character contract

Bal and Kishore have **identical** bone names, mesh names, morph target names and material slots. The animator retargets by
name; the transformation dissolves the character part by part.

- **Skeleton:** humanoid, with fingers and toes, `Jaw`, `Eye_L`, `Eye_R`. Names use `_L` / `_R` suffixes, no dots, no spaces.
  Maximum **4** bone influences per vertex, weights normalised.
- **Secondary chains** (driven by the runtime spring solver, not baked): `Feather_*` (3+ bones), `Dhoti_*`, `Scarf_*`,
  `Hair_*`, `Mala_*` (2+ each).
- **Named meshes:** `KR_Body`, `KR_Face`, `KR_Eyes`, `KR_Hair`, `KR_Feather`, `KR_Cloth_Dhoti`, `KR_Cloth_Scarf`,
  `KR_Jewelry_Crown`, `KR_Jewelry_Necklace`, `KR_Flute`.
- **Materials:** separate PBR materials for skin, eyes (sclera/iris plus a clear cornea mesh), hair (alpha-hashed cards, not
  alpha-blended), cloth (sheen), jewellery (metal). Every mesh needs UVs and a base-colour texture, because the
  transformation samples particle colour from them.
- **Morph targets (ARKit names):** `eyeBlinkLeft/Right`, `eyeSquintLeft/Right`, `eyeWideLeft/Right`, `browInnerUp`,
  `browDownLeft/Right`, `mouthSmileLeft/Right`, `jawOpen`, `mouthFunnel`, `mouthPucker` (the flute embouchure).
  Preferred, and needed for Kishore's speech: `viseme_aa/E/I/O/U/PP/FF`. Blink, smile and eye expression are driven by
  these morphs, never faked by scaling.
- **Clips (exact names, 30 fps, one per Blender Action):** see `characters.bal.requiredClips` and
  `characters.kishore.requiredClips`. Every `CharacterAction` the timeline uses must resolve to one (the tests enforce it).
- **Budget:** LOD0 45-60k triangles (Bal), 60-80k (Kishore). LOD1 (`*.lod1.glb`) 25k / 35k with the same rig, morphs and
  clips: the low quality tier swaps to it. Krishna is never removed on any device.

## 4. Blender pipeline

Pin one Blender version for the whole project and record it in the file's `extras` (Blender 4.5 LTS at the time of
writing; use the current LTS at project start and do not change it mid-project).

1. **Scene:** Metric, unit scale 1.0. Model at real scale.
2. **Apply transforms:** select everything, `Ctrl+A` then *All Transforms*. Delete history you don't need. Check the origin
   is on the ground between the feet.
3. **Rest pose:** A-pose, arms about 35 degrees from the body, palms in, fingers relaxed. The same on both characters.
4. **Bones:** Blender's default bone axes (Y along the bone). Use `Deform` on every bone that moves the mesh; keep the
   secondary chains as deform bones. No scaled bones. No constraints left in the exported armature (bake them).
5. **Weights:** *Limit Total* to 4, then *Normalize All*.
6. **Shape keys:** name them exactly as listed above. Leave the Basis clean. The glTF exporter writes the names into
   `mesh.extras.targetNames`, which the checker and the runtime both read.
7. **Animation:** 30 fps, one Action per clip, named exactly as the spec says. Loops must loop cleanly (first and last
   keyframe equal). Breath is authored as an additive-friendly clip.
8. **Export, glTF 2.0, glTF Binary (.glb):**
   - Transform: **+Y Up**.
   - Mesh: Apply Modifiers ON (the Armature modifier is excluded automatically), UVs ON, Normals ON, Tangents OFF,
     Vertex Colours OFF (unless a material uses them).
   - Shape Keys: ON. Shape Key Normals OFF (ON for `KR_Face` only if the shading needs it). Tangents OFF.
   - Armature: Export Deformation Bones Only ON, Flatten Bone Hierarchy OFF.
   - Animation: ON, mode **Actions**, sampling rate **30**, Optimize Animation Size ON, Shape Key Animation ON.
   - Materials: PBR metallic-roughness. Export images as PNG (base colour, normal) or JPEG; they are converted next.
   - **Compression: OFF in Blender.** Compress afterwards, so the source export stays lossless.
9. **Optimise (after export):**
   - Characters: **Meshopt** (`EXT_meshopt_compression`). It compresses skinned meshes, morph targets and animation
     keyframes, which Draco does not.
   - Static environment meshes: **Draco** (`KHR_draco_mesh_compression`).
   - Textures: **KTX2** (`KHR_texture_basisu`). UASTC for normal and occlusion-roughness-metal maps, ETC1S for base colour.
     2K per material set, 4K only for a face that earns it, 1K for the LOD1 file.
   - `@gltf-transform/cli` does all of this (`optimize`, `etc1s`, `uastc`, `meshopt`), and the KTX-Software `toktx` encoder
     is required for KTX2. Check the flags against the CLI version you install; they change between releases.
10. **Validate:** `npm run assets:check` (names, bones, morphs, clips, triangle budget, compression). Then open it in
    the engineering view in the running app: check height and origin, then the skin under every lighting preset.

The decoders (Draco, Basis) are copied from `node_modules/three/examples/jsm/libs` to `public/decoders` by
`scripts/copy-decoders.mjs` on `npm run dev` / `npm run build`, so a film never depends on a third-party CDN to load.

## 5. Everything else

Environment, props, HDRIs, textures and the whole audio list (flute stems, score, ambience, effects, and the seven Sanskrit
recitations) are specified per file in `assetSpec.json` and listed in `TODO.md` with expected filename, budget, texture
requirement and animation requirement.

Two rules for the audio:

- **Flute stems are delivered dry.** The analyser listens to them to drive the world; reverb belongs to the mix.
- **The Sanskrit recitation is a human voice.** Calm, deep, reverent, not theatrical. There is no text-to-speech and no
  placeholder speech. Until a recording exists, the verse is shown as text only and engineering mode says so.

## 6. Licensing

Any GLB served on the web can be downloaded by anyone. A commissioned or licensed model must explicitly permit real-time web
distribution, and the licence for every asset should be recorded next to it in the repository.
