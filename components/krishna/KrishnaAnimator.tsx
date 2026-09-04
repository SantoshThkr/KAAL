"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

export function KrishnaAnimator({ morph }: { morph: number }) {
  const feather = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!feather.current) return;
    feather.current.rotation.z = Math.sin(state.clock.elapsedTime * 1.1) * 0.08;
    feather.current.position.y = 1.35 + morph * 0.18;
  });
  return (
    <mesh ref={feather} position={[0.08, 1.35, -0.02]} rotation={[0.2, 0.3, -0.1]}>
      <coneGeometry args={[0.035, 0.7, 4]} />
      <meshStandardMaterial color="#d4a659" emissive="#6b4217" emissiveIntensity={0.15} />
    </mesh>
  );
}
