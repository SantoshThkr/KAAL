"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import { CameraRig } from "../camera/CameraRig";
import { Vrindavan } from "../environment/Vrindavan";
import { Krishna } from "../krishna/Krishna";
import { useExperienceStore } from "../../state/experienceStore";

function World() {
  const reducedMotion = useExperienceStore((state) => state.reducedMotion);
  return (
    <>
      <color attach="background" args={["#050912"]} />
      <fog attach="fog" args={["#08111c", 8, 28]} />
      <ambientLight intensity={0.22} color="#7e9abb" />
      <directionalLight position={[-4, 6, 3]} intensity={2.8} color="#9fc5ed" />
      <pointLight position={[2, 3, 2]} intensity={3.5} distance={10} color="#e6b56c" />
      <CameraRig />
      <Vrindavan reducedMotion={reducedMotion} />
      <Krishna />
      <EffectComposer multisampling={0}>
        <Bloom intensity={0.55} luminanceThreshold={1.1} mipmapBlur />
        <Vignette eskil={false} offset={0.22} darkness={0.75} />
      </EffectComposer>
    </>
  );
}

export function ExperienceCanvas() {
  return (
    <div className="experience-canvas">
      <Canvas dpr={[1, 1.75]} camera={{ position: [0, 1.45, 7], fov: 35 }} gl={{ antialias: true, powerPreference: "high-performance" }}>
        <Suspense fallback={null}>
          <World />
        </Suspense>
      </Canvas>
    </div>
  );
}
