"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { film } from "@/state/film";
import { useExperienceStore } from "@/state/experienceStore";

/**
 * ENGINEERING MODE ONLY (press E). Not content: a ground grid, an 18% grey ball (the standard lighting reference
 * used on real film sets) and a marker where the camera is aimed, so camera moves and lighting presets can be checked
 * before any environment exists. Unmounted entirely when engineering mode is off.
 */
export function DebugStage() {
  const visible = useExperienceStore((state) => state.engineering);
  const marker = useRef<Group>(null);

  useFrame(() => {
    marker.current?.position.set(film.cam.tx, film.cam.ty, film.cam.tz);
  });

  if (!visible) return null;
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position-y={-0.002} receiveShadow>
        <planeGeometry args={[600, 600]} />
        <meshStandardMaterial color="#0d1014" roughness={1} />
      </mesh>
      <gridHelper args={[600, 300, 0x35507a, 0x1a2540]} />
      <axesHelper args={[1.5]} />
      <mesh position-y={0.18} castShadow receiveShadow>
        <sphereGeometry args={[0.18, 48, 24]} />
        <meshStandardMaterial color="#767676" roughness={0.95} />
      </mesh>
      <group ref={marker}>
        <axesHelper args={[0.4]} />
      </group>
    </group>
  );
}
