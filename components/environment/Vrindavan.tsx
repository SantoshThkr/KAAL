"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

export function Vrindavan({ reducedMotion }: { reducedMotion: boolean }) {
  const water = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (water.current && !reducedMotion) water.current.position.y = -1.62 + Math.sin(state.clock.elapsedTime * 0.45) * 0.012;
  });
  return (
    <>
      <mesh ref={water} rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.62, -3]}>
        <planeGeometry args={[30, 12, 1, 1]} />
        <meshStandardMaterial color="#0b2534" roughness={0.22} metalness={0.5} />
      </mesh>
      <mesh position={[-4, 2.9, -5]}>
        <sphereGeometry args={[0.7, 32, 32]} />
        <meshBasicMaterial color="#dfd0a8" />
      </mesh>
      <mesh position={[-3, 0.1, -2.5]} scale={[1.5, 4, 1.5]}>
        <coneGeometry args={[1, 1, 8]} />
        <meshStandardMaterial color="#142f2d" roughness={1} />
      </mesh>
      <mesh position={[3.5, 0.25, -3.4]} scale={[1.8, 5, 1.8]}>
        <coneGeometry args={[1, 1, 8]} />
        <meshStandardMaterial color="#102a2a" roughness={1} />
      </mesh>
      {Array.from({ length: 28 }, (_, index) => (
        <mesh key={index} position={[(index % 7) * 1.1 - 3.7, (index % 4) * 0.28 - 1.2, -1.8 - Math.floor(index / 7) * 0.45]}>
          <sphereGeometry args={[0.025 + (index % 3) * 0.012, 8, 8]} />
          <meshBasicMaterial color={index % 4 === 0 ? "#e4bd79" : "#a9d3c2"} />
        </mesh>
      ))}
    </>
  );
}
