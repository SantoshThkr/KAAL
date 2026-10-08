"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BackSide, Color, ShaderMaterial, Vector2, Vector3 } from "three";
import * as world from "@/art/worldArt";
import { groundFragment, groundVertex, skyFragment, skyVertex, waterFragment, waterVertex } from "@/shaders/sky";
import * as layout from "@/data/vrindavan";
import { PALETTE } from "@/art/palette";
import { film } from "@/state/film";
import { useQuality } from "@/hooks/useQuality";
import { Sprites } from "./Sprites";
import { Creatures } from "./Creatures";
import { Motes } from "./Motes";

/** Where the last flute note touched the water, so the river can ring outward from it. */
export const ripple = { x: 2.6, z: -9, start: -100 };

/** One sky, one river, one ground: their uniforms live at module scope, so the frame loop can write them directly. */
const skyUniforms = {
  uSkyTop: { value: new Color() },
  uSkyHorizon: { value: new Color() },
  uLamp: { value: new Color() },
  uLampPos: { value: new Vector2() },
  uLampSize: { value: 0.05 },
  uStars: { value: 1 },
  uTime: { value: 0 },
  uCosmos: { value: 0 }
};

export function Sky() {
  const material = useMemo(
    () => new ShaderMaterial({ side: BackSide, depthWrite: false, uniforms: skyUniforms, vertexShader: skyVertex, fragmentShader: skyFragment }),
    []
  );

  useFrame(() => {
    const u = skyUniforms;
    const mood = film.mood;
    (u.uSkyTop.value as Color).setRGB(mood.skyTop.r, mood.skyTop.g, mood.skyTop.b);
    (u.uSkyHorizon.value as Color).setRGB(mood.skyHorizon.r, mood.skyHorizon.g, mood.skyHorizon.b);
    (u.uLamp.value as Color).setRGB(mood.lamp.r, mood.lamp.g, mood.lamp.b);
    (u.uLampPos.value as Vector2).set(mood.lampX, mood.lampY);
    u.uLampSize.value = mood.lampSize;
    u.uStars.value = mood.stars;
    u.uCosmos.value = film.fx.cosmos;
    u.uTime.value = film.worldTime;
  }, -45);

  return (
    <mesh material={material} renderOrder={-2000} frustumCulled={false}>
      <sphereGeometry args={[220, 48, 24]} />
    </mesh>
  );
}

const waterUniforms = {
  uWater: { value: new Color() },
  uLamp: { value: new Color() },
  uSkyHorizon: { value: new Color() },
  uTime: { value: 0 },
  uEnergy: { value: 0 },
  uMagic: { value: 0 },
  uRipple: { value: new Vector3(2.6, -9, -100) },
  uLampX: { value: -0.3 }
};

export function River() {
  const material = useMemo(
    () => new ShaderMaterial({ uniforms: waterUniforms, vertexShader: waterVertex, fragmentShader: waterFragment }),
    []
  );

  useFrame(() => {
    const u = waterUniforms;
    const mood = film.mood;
    (u.uWater.value as Color).setRGB(mood.water.r, mood.water.g, mood.water.b);
    (u.uLamp.value as Color).setRGB(mood.lamp.r, mood.lamp.g, mood.lamp.b);
    (u.uSkyHorizon.value as Color).setRGB(mood.skyHorizon.r, mood.skyHorizon.g, mood.skyHorizon.b);
    u.uTime.value = film.worldTime;
    u.uEnergy.value = film.audio.energy;
    u.uMagic.value = film.fx.magic;
    u.uLampX.value = mood.lampX;
    (u.uRipple.value as Vector3).set(ripple.x, ripple.z, ripple.start);
  }, -44);

  return (
    <mesh material={material} rotation-x={-Math.PI / 2} position={[0, -0.02, -29]} renderOrder={-900}>
      <planeGeometry args={[220, 42, 1, 1]} />
    </mesh>
  );
}

const groundUniforms = {
  uNear: { value: new Color(PALETTE.grass) },
  uFar: { value: new Color(PALETTE.grassDeep) },
  uPath: { value: new Color(PALETTE.earth) },
  uTime: { value: 0 }
};

export function Ground() {
  const material = useMemo(
    () => new ShaderMaterial({ uniforms: groundUniforms, vertexShader: groundVertex, fragmentShader: groundFragment }),
    []
  );
  const tint = useRef(new Color());

  useFrame(() => {
    const u = groundUniforms;
    const mood = film.mood;
    tint.current.setRGB(mood.tint.r, mood.tint.g, mood.tint.b);
    (u.uNear.value as Color).set(PALETTE.grass).multiply(tint.current);
    (u.uFar.value as Color).set(PALETTE.grassDeep).multiply(tint.current);
    (u.uPath.value as Color).set(PALETTE.earth).multiply(tint.current);
    u.uTime.value = film.worldTime;
  }, -44);

  return (
    <mesh material={material} rotation-x={-Math.PI / 2} position={[0, 0, -1]} renderOrder={-800}>
      <planeGeometry args={[160, 26, 1, 1]} />
    </mesh>
  );
}

/** Everything that grows, stands or wanders in Vrindavan. */
export function World() {
  const quality = useQuality();
  const dense = quality.environmentDensity;
  const take = <T,>(items: T[], fraction: number) => items.slice(0, Math.max(1, Math.round(items.length * fraction)));
  return (
    <>
      <Sky />
      <River />
      <Ground />

      <Sprites art={world.cloud} items={layout.CLOUDS} sway={0} tintStrength={0.8} />
      <Sprites art={world.treeSlim} items={take(layout.FAR_TREES, dense)} sway={0.2} tintStrength={0.9} />
      <Sprites art={world.lotus} items={take(layout.LOTUS, dense)} sway={0.3} />
      <Sprites art={world.hut} items={layout.HUTS} sway={0} />
      <Sprites art={world.treeKadamba} items={layout.MID_TREES} sway={0.45} />
      <Sprites art={world.cow} items={layout.COWS} sway={0.15} />
      <Sprites art={world.butterPots} items={layout.POTS} sway={0} />
      <Sprites art={world.peacock} items={layout.PEACOCKS} sway={0.25} />
      <Sprites art={world.bush} items={take(layout.BUSHES, dense)} sway={0.9} />
      <Sprites art={world.treeKadamba} items={layout.NEAR_TREES} sway={0.6} />
      <Sprites art={world.grassTuft} items={take(layout.GRASS, dense)} sway={1.3} />
      <Sprites art={world.flowerCluster} items={take(layout.FLOWERS, dense)} sway={1.1} />
      <Sprites art={world.treeSlim} items={layout.FOREGROUND_TREES} sway={0.7} tintStrength={0.55} />

      <Creatures />
      <Motes />
    </>
  );
}
