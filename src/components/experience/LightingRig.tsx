"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { AmbientLight, Color, DirectionalLight, FogExp2 } from "three";
import { DEG2RAD } from "@/lib/math";
import type { DirectionalBlock } from "@/lib/filmState";
import { film } from "@/state/film";
import { useQuality } from "@/hooks/useQuality";

const SKY_DISTANCE = 60;

const aim = (light: DirectionalLight, block: DirectionalBlock) => {
  light.color.setRGB(block.r, block.g, block.b);
  light.intensity = block.i;
  light.position.setFromSphericalCoords(SKY_DISTANCE, (90 - block.el) * DEG2RAD, block.az * DEG2RAD);
};

/**
 * Moon or sun as the key, a rim, and a fill, plus fog and the horizon colour, all driven from the lighting presets by
 * the master timeline. Lighting tells the story, so this is the only place lights live and no scene adds its own.
 */
export function LightingRig() {
  const quality = useQuality();
  const ambient = useRef<AmbientLight>(null);
  const key = useRef<DirectionalLight>(null);
  const rim = useRef<DirectionalLight>(null);
  const fog = useRef<FogExp2>(null);
  const horizon = useRef<Color>(null);

  useFrame(() => {
    const { light } = film;
    if (ambient.current) {
      ambient.current.color.setRGB(light.ambient.r, light.ambient.g, light.ambient.b);
      ambient.current.intensity = light.ambient.i;
    }
    if (key.current) aim(key.current, light.key);
    if (rim.current) aim(rim.current, light.rim);
    if (fog.current) {
      fog.current.color.setRGB(light.fog.r, light.fog.g, light.fog.b);
      fog.current.density = light.fog.d;
    }
    if (horizon.current) horizon.current.setRGB(light.fog.r, light.fog.g, light.fog.b);
  }, -50);

  return (
    <>
      <fogExp2 ref={fog} attach="fog" args={[0x000000, 0]} />
      <color ref={horizon} attach="background" args={[0x000000]} />
      <ambientLight ref={ambient} />
      <directionalLight
        ref={key}
        castShadow={quality.shadows}
        shadow-mapSize={[quality.shadowMapSize, quality.shadowMapSize]}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
        shadow-camera-near={1}
        shadow-camera-far={140}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />
      <directionalLight ref={rim} />
    </>
  );
}
