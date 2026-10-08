"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  Color,
  DoubleSide,
  DynamicDrawUsage,
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
  PlaneGeometry,
  Quaternion,
  ShaderMaterial,
  Vector3,
  type Texture
} from "three";
import type { PartArt } from "@/art/krishnaArt";
import { artTexture } from "@/art/artTextures";
import { seeded } from "@/lib/random";
import { film } from "@/state/film";

export interface SpriteItem {
  x: number;
  z: number;
  /** Height in metres; the drawing keeps its aspect. */
  height: number;
  /** Mirror the drawing. */
  flip?: boolean;
  /** 0 = rigid (huts, pots), 1 = full wind (grass, blossom). */
  sway?: number;
  /** Lifts a sprite off the ground (butterflies, clouds). */
  y?: number;
}

/**
 * Many copies of one drawing, in one draw call, swaying in the wind. Trees, grass, flowers, huts, cows: everything
 * standing in Vrindavan is one of these, which is what keeps a world this full cheap enough for a phone.
 */
export function Sprites({ art, items, sway = 0.6, tintStrength = 1 }: { art: PartArt; items: SpriteItem[]; sway?: number; tintStrength?: number }) {
  const mesh = useRef<InstancedMesh>(null);

  const { geometry, material } = useMemo(() => {
    const geometry = new PlaneGeometry(1, 1);
    // Pivot at the foot of the drawing.
    geometry.translate(0, 0.5, 0);
    const phases = new Float32Array(items.length);
    const sways = new Float32Array(items.length);
    const random = seeded(items.length * 97 + Math.round(sway * 100) + art.id.length);
    for (let i = 0; i < items.length; i += 1) {
      phases[i] = random() * Math.PI * 2;
      sways[i] = (items[i].sway ?? 1) * sway;
    }
    geometry.setAttribute("aPhase", new InstancedBufferAttribute(phases, 1));
    geometry.setAttribute("aSway", new InstancedBufferAttribute(sways, 1));

    const material = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: DoubleSide,
      uniforms: {
        map: { value: artTexture(art.id) as Texture },
        uTime: { value: 0 },
        uWind: { value: 0.3 },
        uTint: { value: new Color(1, 1, 1) },
        uOpacity: { value: 1 }
      },
      vertexShader: /* glsl */ `
        attribute float aPhase;
        attribute float aSway;
        uniform float uTime;
        uniform float uWind;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vec3 p = position;
          float h = uv.y * uv.y;
          float bend = sin(uTime * 1.1 + aPhase) * 0.6 + sin(uTime * 2.3 + aPhase * 1.7) * 0.25;
          p.x += bend * h * aSway * (0.05 + uWind * 0.16);
          p.y -= abs(bend) * h * aSway * 0.012;
          vec4 world = instanceMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * modelViewMatrix * world;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D map;
        uniform vec3 uTint;
        uniform float uOpacity;
        varying vec2 vUv;
        void main() {
          vec4 texel = texture2D(map, vUv);
          if (texel.a < 0.01) discard;
          gl_FragColor = vec4(texel.rgb * uTint, texel.a * uOpacity);
          #include <colorspace_fragment>
        }
      `
    });
    return { geometry, material };
  }, [art.id, items, sway]);

  useEffect(() => {
    const instanced = mesh.current;
    if (!instanced) return;
    const matrix = new Matrix4();
    const position = new Vector3();
    const quaternion = new Quaternion();
    const scale = new Vector3();
    items.forEach((item, index) => {
      const width = (art.w / art.h) * item.height * (item.flip ? -1 : 1);
      position.set(item.x, item.y ?? 0, item.z);
      scale.set(width, item.height, 1);
      matrix.compose(position, quaternion, scale);
      instanced.setMatrixAt(index, matrix);
    });
    instanced.instanceMatrix.needsUpdate = true;
    instanced.instanceMatrix.setUsage(DynamicDrawUsage);
    instanced.computeBoundingSphere();
  }, [art, items]);

  useFrame(() => {
    // Through the ref: the frame loop never writes to a value a hook returned.
    const instanced = mesh.current;
    if (!instanced) return;
    const uniforms = (instanced.material as ShaderMaterial).uniforms;
    uniforms.uTime.value = film.worldTime;
    uniforms.uWind.value = film.world.wind;
    (uniforms.uTint.value as Color).setRGB(
      film.mood.tint.r * tintStrength + (1 - tintStrength),
      film.mood.tint.g * tintStrength + (1 - tintStrength),
      film.mood.tint.b * tintStrength + (1 - tintStrength)
    );
  });

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  if (items.length === 0) return null;
  return <instancedMesh ref={mesh} args={[geometry, material, items.length]} frustumCulled={false} renderOrder={Math.round(100 - items[0].z)} />;
}
