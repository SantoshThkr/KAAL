"use client";

import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, ShaderMaterial, UniformsLib, UniformsUtils, Vector3, Vector4 } from "three";
import { KRISHNA_MARK, WATER_EDGE_Z } from "@/data/worldLayout";
import { MAX_RIPPLES, waterFragment, waterVertex } from "@/shaders/water/water";
import { film } from "@/state/film";
import { skyUniforms } from "./skyUniforms";

export interface Ripple {
  x: number;
  z: number;
  /** World time the ripple began. */
  start: number;
  strength: number;
}

/** Ripples scenes can raise (a drop, a touch, a note). The water reads this list every frame. */
export const ripples: Ripple[] = [];

export function addRipple(x: number, z: number, strength = 1) {
  ripples.unshift({ x, z, start: film.worldTime, strength });
  ripples.length = Math.min(ripples.length, MAX_RIPPLES);
}

/** The river's own uniforms. Module-level (one river), so the frame loop updates them without touching React state. */
const waterUniforms = {
  uTime: { value: 0 },
  uRipple: { value: Array.from({ length: MAX_RIPPLES }, () => new Vector4()) },
  uAudioEnergy: { value: 0 },
  uAudioCenter: { value: new Vector3(KRISHNA_MARK.position[0], 0, KRISHNA_MARK.position[2] - 1) },
  uDeep: { value: new Color(0x02060d) }
};

function updateWater() {
  waterUniforms.uTime.value = film.worldTime;
  waterUniforms.uAudioEnergy.value = film.audio.energy;
  const slots = waterUniforms.uRipple.value;
  for (let index = 0; index < MAX_RIPPLES; index += 1) {
    const ripple = ripples[index];
    slots[index].set(ripple?.x ?? 0, ripple?.z ?? 0, ripple?.start ?? -100, ripple?.strength ?? 0);
  }
  const fog = film.light.fog;
  waterUniforms.uDeep.value.setRGB(fog.r * 0.35, fog.g * 0.45, fog.b * 0.6);
}

/** The river. Reflects the shared sky, glitters under the moon, breathes with the flute. */
export function Yamuna() {
  const material = useMemo(() => {
    // Fog uniforms are per material; the river's and the sky's uniforms are shared by reference, never copied.
    const uniforms = { ...UniformsUtils.clone(UniformsLib.fog), ...waterUniforms, ...skyUniforms };
    return new ShaderMaterial({ uniforms, vertexShader: waterVertex, fragmentShader: waterFragment, fog: true });
  }, []);

  useFrame(updateWater);

  return (
    <mesh material={material} rotation-x={-Math.PI / 2} position={[0, 0, WATER_EDGE_Z - 400]} renderOrder={-10}>
      <planeGeometry args={[1600, 800 + 1.2, 1, 1]} />
    </mesh>
  );
}
