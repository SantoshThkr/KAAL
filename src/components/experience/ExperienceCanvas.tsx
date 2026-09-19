"use client";

import { Profiler } from "react";
import { Canvas } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import { NoToneMapping } from "three";
import { CameraRig } from "@/components/camera/CameraRig";
import { CinematicCamera } from "@/components/camera/CinematicCamera";
import { DebugStage } from "@/components/debug/DebugStage";
import { PostFX } from "@/components/effects/PostFX";
import { SceneDirector } from "@/components/scenes/SceneDirector";
import { CharacterPreloader } from "@/components/krishna/CharacterPreloader";
import { useQuality } from "@/hooks/useQuality";
import { debugCounters } from "@/lib/debugCounters";
import { useExperienceStore } from "@/state/experienceStore";
import { CinematicController } from "./CinematicController";
import { LightingRig } from "./LightingRig";

export function ExperienceCanvas({ floatTargets }: { floatTargets: boolean }) {
  const profile = useQuality();
  const stepQuality = useExperienceStore((state) => state.stepQuality);
  const locked = useExperienceStore((state) => state.qualityLocked);

  return (
    <Canvas
      className="stage-canvas"
      dpr={profile.dpr}
      shadows={profile.shadows ? "percentage" : false}
      camera={{ fov: 30, near: 0.1, far: 6000, position: [0, 1.6, 4] }}
      gl={{ antialias: false, alpha: false, stencil: false, powerPreference: "high-performance", toneMapping: NoToneMapping }}
      onCreated={({ gl }) => {
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
        <LightingRig />
        <CharacterPreloader />
        <SceneDirector />
        <DebugStage />
        <PostFX floatTargets={floatTargets} />
      </Profiler>
    </Canvas>
  );
}
