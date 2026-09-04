"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import { useExperienceStore } from "../../state/experienceStore";

export function CameraRig() {
  const camera = useThree((state) => state.camera);
  const target = useMemo(() => new THREE.Vector3(), []);
  const progress = useExperienceStore((state) => state.progress);
  const reducedMotion = useExperienceStore((state) => state.reducedMotion);
  useFrame((_, delta) => {
    const t = reducedMotion ? 0.05 : 0.045;
    const transformation = THREE.MathUtils.smoothstep(progress, 0.5, 0.72);
    const x = Math.sin(progress * Math.PI * 1.6) * 0.55;
    const z = 6.6 - transformation * 1.5 + Math.sin(progress * 4) * 0.2;
    camera.position.lerp(new THREE.Vector3(x, 1.55 + transformation * 0.15, z), 1 - Math.pow(t, delta * 60));
    target.set(0, 1.15 + transformation * 0.1, 0);
    camera.lookAt(target);
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = THREE.MathUtils.lerp(camera.fov, 35 - transformation * 5, 0.04);
    }
    camera.updateProjectionMatrix();
  });
  return null;
}
