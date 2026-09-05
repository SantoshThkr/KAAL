"use client";

import { useGLTF } from "@react-three/drei";
import { useEffect } from "react";
import * as THREE from "three";
import { KrishnaAnimator } from "./KrishnaAnimator";
import { configureKrishnaMaterials } from "./KrishnaMaterials";
import { KRISHNA_ASSETS } from "../../lib/assets";
import { useExperienceStore } from "../../state/experienceStore";

function LoadedCharacter({ path }: { path: string }) {
  const asset = useGLTF(path);
  useEffect(() => configureKrishnaMaterials(asset.scene), [asset.scene]);
  return (
    <group>
      <primitive object={asset.scene} scale={1.8} />
      <KrishnaAnimator root={asset.scene} animations={asset.animations} />
    </group>
  );
}

export function KrishnaCharacter({ balAvailable, kishoreAvailable }: { balAvailable: boolean; kishoreAvailable: boolean }) {
  const progress = useExperienceStore((state) => state.progress);
  if (!balAvailable) return null;
  return (
    <>
      <LoadedCharacter path={KRISHNA_ASSETS.bal} />
      {kishoreAvailable && progress > 0.72 ? <LoadedCharacter path={KRISHNA_ASSETS.kishore} /> : null}
    </>
  );
}
