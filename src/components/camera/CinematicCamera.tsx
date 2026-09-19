"use client";

import { PerspectiveCamera } from "@react-three/drei";

/**
 * The film camera: a 35 mm film back and generous clip planes (the film runs from a ripple a metre away to a
 * battlefield and a cosmos). Position, aim, lens and focus are driven every frame by CameraRig from the master
 * timeline. Nothing here is user-controllable: there is no OrbitControls anywhere in this project.
 */
export function CinematicCamera() {
  return <PerspectiveCamera makeDefault fov={30} near={0.1} far={6000} filmGauge={35} position={[0, 1.6, 4]} />;
}
