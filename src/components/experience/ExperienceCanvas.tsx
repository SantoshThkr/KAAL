"use client";

import { Profiler } from "react";
import { Canvas } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import { NoToneMapping } from "three";
import { CameraRig } from "@/components/camera/CameraRig";
import { CinematicCamera } from "@/components/camera/CinematicCamera";
import { PostFX } from "@/components/effects/PostFX";
import { useQuality } from "@/hooks/useQuality";
import { isEngineeringAllowed } from "@/lib/env";
import { debugCounters } from "@/lib/debugCounters";
import { useExperienceStore } from "@/state/experienceStore";
import { Stage } from "@/components/world/Stage";
import { CinematicController } from "./CinematicController";

export function ExperienceCanvas({ floatTargets }: { floatTargets: boolean }) {
  const profile = useQuality();
  const stepQuality = useExperienceStore((state) => state.stepQuality);
  const locked = useExperienceStore((state) => state.qualityLocked);

  return (
    <Canvas
      className="stage-canvas"
      dpr={profile.dpr}
      camera={{ fov: 30, near: 0.1, far: 6000, position: [0, 1.6, 4] }}
      gl={{ antialias: false, alpha: false, stencil: false, powerPreference: "high-performance", toneMapping: NoToneMapping }}
      onCreated={({ gl, scene, camera }) => {
        // Engineering handle: lets scripted checks look at the real scene graph.
        if (isEngineeringAllowed()) Object.assign(window as unknown as Record<string, unknown>, { __KAAL_SCENE__: { scene, camera, gl } });
        // The composer renders many passes per frame; the controller reads and resets the counters once per frame.
        gl.info.autoReset = false;
        gl.setClearColor(0x000000, 1);
      }}
    >
      <Profiler id="canvas" onRender={() => (debugCounters.canvasCommits += 1)}>
        {locked ? null : <PerformanceMonitor flipflops={3} onDecline={() => stepQuality(-1)} onIncline={() => stepQuality(1)} />}
        <CinematicCamera />
        <CinematicController />
        <CameraRig />
        <Stage />
        <PostFX floatTargets={floatTargets} />
      </Profiler>
    </Canvas>
  );
}
