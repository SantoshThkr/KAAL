# Motion capture

`mocap-basic.json` holds five motion-capture clips (idle, walk, run, agree, headShake) in a rig-independent form
(per-bone rotation relative to the T-pose), extracted with `scripts/extract-mocap.mjs`.

- Source: `examples/models/gltf/Xbot.glb` in the three.js repository (r176), whose clips come from **Adobe Mixamo**.
- Licence status: Mixamo animations may be used royalty-free in projects, but they come under Adobe's terms, not an open
  licence, and these reached us through a third party. **Treat this as a development placeholder.** Before release,
  replace it with (a) clips from your own Mixamo account, or (b) the CMU Graphics Lab Motion Capture Database (free for
  any use), or (c) Krishna-specific performance capture, which the brief calls for anyway (the flute, the makhan scene).
  The format is the same; only the JSON changes.
