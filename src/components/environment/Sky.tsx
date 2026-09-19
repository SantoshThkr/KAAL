"use client";

import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { BackSide, ShaderMaterial } from "three";
import { skyFragment, skyVertex } from "@/shaders/atmosphere/sky";
import { film } from "@/state/film";
import { skyUniforms, updateSkyUniforms } from "./skyUniforms";

/** The sky dome: gradient, thin cloud, stars, the moon, and the far bank's tree line. Follows the camera. */
export function Sky() {
  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: skyUniforms,
        vertexShader: skyVertex,
        fragmentShader: skyFragment,
        side: BackSide,
        depthWrite: false,
        fog: false
      }),
    []
  );

  useFrame(() => updateSkyUniforms(film), -40);

  return (
    <mesh material={material} renderOrder={-1000} frustumCulled={false}>
      <sphereGeometry args={[3000, 64, 32]} />
    </mesh>
  );
}
