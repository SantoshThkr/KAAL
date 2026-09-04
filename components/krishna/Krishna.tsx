"use client";

import { KrishnaCharacter } from "./KrishnaCharacter";
import { KrishnaAnimator } from "./KrishnaAnimator";
import { useExperienceStore } from "../../state/experienceStore";

export function Krishna() {
  const progress = useExperienceStore((state) => state.progress);
  const morph = Math.max(0, Math.min(1, (progress - 0.54) / 0.18));
  return (
    <group position={[0, 0, 0]}>
      <KrishnaCharacter morph={morph} />
      <KrishnaAnimator morph={morph} />
    </group>
  );
}
