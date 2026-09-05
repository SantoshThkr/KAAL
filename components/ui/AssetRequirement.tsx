"use client";

import { useExperienceStore } from "../../state/experienceStore";

export function AssetRequirement() {
  const status = useExperienceStore((state) => state.assetStatus);
  if (status !== "missing") return null;
  return (
    <aside className="asset-requirement">
      <strong>PRODUCTION ASSET REQUIRED</strong>
      <span>Bal Krishna GLB</span>
      <span>Kishore Krishna GLB</span>
      <span>Rigged skeleton + idle / breathing / blink / look / flute clips</span>
    </aside>
  );
}
