"use client";

import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

export function KrishnaCharacter({ morph }: { morph: number }) {
  const group = useRef<THREE.Group>(null);
  const childScale = THREE.MathUtils.lerp(0.82, 1, morph);
  const bodyHeight = THREE.MathUtils.lerp(1.2, 1.6, morph);
  useFrame((state) => {
    if (!group.current) return;
    group.current.position.y = Math.sin(state.clock.elapsedTime * 1.3) * 0.018;
    group.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.35) * 0.025;
  });
  return (
    <group ref={group} scale={[childScale, childScale, childScale]} position={[0, 0, 0]}>
      <mesh position={[0, bodyHeight * 0.7, 0]} castShadow>
        <sphereGeometry args={[0.43, 32, 32]} />
        <meshStandardMaterial color="#2f6e9c" roughness={0.62} metalness={0.05} />
      </mesh>
      <mesh position={[0, bodyHeight * 0.22, 0]} castShadow>
        <capsuleGeometry args={[0.43, bodyHeight * 0.8, 12, 24]} />
        <meshStandardMaterial color="#2b6793" roughness={0.72} />
      </mesh>
      <mesh position={[0, -0.38, 0]} castShadow>
        <sphereGeometry args={[0.68, 32, 16]} />
        <meshStandardMaterial color="#d4a659" roughness={0.82} />
      </mesh>
      <mesh position={[0, 0.56, -0.37]} rotation={[0.25, 0, 0]} castShadow>
        <torusGeometry args={[0.46, 0.13, 12, 32, Math.PI * 1.55]} />
        <meshStandardMaterial color="#142238" roughness={0.86} />
      </mesh>
      <mesh position={[-0.15, bodyHeight * 0.77, 0.38]}>
        <sphereGeometry args={[0.055, 12, 12]} />
        <meshStandardMaterial color="#f1e9da" />
      </mesh>
      <mesh position={[0.15, bodyHeight * 0.77, 0.38]}>
        <sphereGeometry args={[0.055, 12, 12]} />
        <meshStandardMaterial color="#f1e9da" />
      </mesh>
      <mesh position={[-0.15, bodyHeight * 0.77, 0.425]}>
        <sphereGeometry args={[0.022, 10, 10]} />
        <meshStandardMaterial color="#171117" />
      </mesh>
      <mesh position={[0.15, bodyHeight * 0.77, 0.425]}>
        <sphereGeometry args={[0.022, 10, 10]} />
        <meshStandardMaterial color="#171117" />
      </mesh>
      <mesh position={[0, bodyHeight * 0.7, 0.4]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.09, 0.018, 8, 20, Math.PI]} />
        <meshStandardMaterial color="#211a1b" />
      </mesh>
      <mesh position={[0, bodyHeight * 1.02, -0.02]} rotation={[0, 0, -0.18]}>
        <coneGeometry args={[0.28, 0.7, 5]} />
        <meshStandardMaterial color="#1b3651" roughness={0.8} />
      </mesh>
      <mesh position={[0.19, bodyHeight * 1.23, -0.02]} rotation={[0.15, 0.3, -0.2]}>
        <coneGeometry args={[0.2, 0.8, 5]} />
        <meshStandardMaterial color="#2d7c65" roughness={0.72} />
      </mesh>
      <mesh position={[0.08, bodyHeight * 1.44, -0.02]} rotation={[0.2, 0.3, -0.1]}>
        <coneGeometry args={[0.035, 0.7, 4]} />
        <meshStandardMaterial color="#d4a659" emissive="#6b4217" emissiveIntensity={0.15} />
      </mesh>
      <mesh position={[0, bodyHeight * 0.55, 0.45]} rotation={[0, 0, -Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.035, 0.035, 1.25, 16]} />
        <meshStandardMaterial color="#b87b43" roughness={0.5} />
      </mesh>
      <mesh position={[-0.49, bodyHeight * 0.43, 0]} rotation={[0, 0, -0.35]}>
        <capsuleGeometry args={[0.1, 0.6, 8, 16]} />
        <meshStandardMaterial color="#2f6e9c" />
      </mesh>
      <mesh position={[0.49, bodyHeight * 0.43, 0]} rotation={[0, 0, 0.35]}>
        <capsuleGeometry args={[0.1, 0.6, 8, 16]} />
        <meshStandardMaterial color="#2f6e9c" />
      </mesh>
      <mesh position={[-0.23, -0.78, 0]}>
        <capsuleGeometry args={[0.13, 0.8, 8, 16]} />
        <meshStandardMaterial color="#2f6e9c" />
      </mesh>
      <mesh position={[0.23, -0.78, 0]}>
        <capsuleGeometry args={[0.13, 0.8, 8, 16]} />
        <meshStandardMaterial color="#2f6e9c" />
      </mesh>
      <mesh position={[-0.23, -1.3, 0.1]} scale={[1, 0.5, 1.45]}>
        <sphereGeometry args={[0.18, 16, 12]} />
        <meshStandardMaterial color="#1d2736" />
      </mesh>
      <mesh position={[0.23, -1.3, 0.1]} scale={[1, 0.5, 1.45]}>
        <sphereGeometry args={[0.18, 16, 12]} />
        <meshStandardMaterial color="#1d2736" />
      </mesh>
      <mesh position={[0, bodyHeight * 0.45, 0.43]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.24, 0.025, 8, 24]} />
        <meshStandardMaterial color="#d4a659" metalness={0.65} roughness={0.3} />
      </mesh>
    </group>
  );
}
