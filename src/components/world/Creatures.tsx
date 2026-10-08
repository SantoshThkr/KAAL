"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, DoubleSide, InstancedMesh, Matrix4, PlaneGeometry, Quaternion, ShaderMaterial, Vector3, type Texture } from "three";
import { butterfly } from "@/art/worldArt";
import { artTexture } from "@/art/artTextures";
import { BUTTERFLY_HOMES } from "@/data/vrindavan";
import { useQuality } from "@/hooks/useQuality";
import { film } from "@/state/film";

/**
 * Butterflies, wandering their own small orbits. When the flute plays they drift toward Krishna, which is the whole
 * point of the scene: the world leans toward the music.
 */
export function Creatures() {
  const quality = useQuality();
  const count = Math.max(3, Math.round(BUTTERFLY_HOMES.length * quality.environmentDensity));
  const mesh = useRef<InstancedMesh>(null);

  const { geometry, material } = useMemo(() => {
    const geometry = new PlaneGeometry(1, 1);
    const material = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: DoubleSide,
      uniforms: { map: { value: artTexture(butterfly.id) as Texture }, uTint: { value: new Color(1, 1, 1) } },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D map;
        uniform vec3 uTint;
        varying vec2 vUv;
        void main() {
          vec4 texel = texture2D(map, vUv);
          if (texel.a < 0.02) discard;
          gl_FragColor = vec4(texel.rgb * uTint, texel.a);
          #include <colorspace_fragment>
        }
      `
    });
    return { geometry, material };
  }, []);

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  const matrix = useMemo(() => new Matrix4(), []);
  const position = useMemo(() => new Vector3(), []);
  const quaternion = useMemo(() => new Quaternion(), []);
  const scale = useMemo(() => new Vector3(), []);

  useFrame(() => {
    const instanced = mesh.current;
    if (!instanced) return;
    const t = film.worldTime;
    const krishna = film.actors.bal.opacity > film.actors.kishore.opacity ? film.actors.bal : film.actors.kishore;
    const pull = film.fx.magic * 0.8;
    for (let index = 0; index < count; index += 1) {
      const home = BUTTERFLY_HOMES[index % BUTTERFLY_HOMES.length] as { x: number; y: number; z: number };
      const phase = index * 2.3;
      const wander = new Vector3(
        home.x + Math.sin(t * 0.5 + phase) * 1.6 + Math.sin(t * 1.3 + phase) * 0.3,
        home.y + Math.sin(t * 0.9 + phase * 1.7) * 0.35 + Math.abs(Math.sin(t * 2.2 + phase)) * 0.12,
        home.z + Math.cos(t * 0.42 + phase) * 1.2
      );
      position.set(krishna.x + 0.6, krishna.y + 1.0, krishna.z + 0.6).lerp(wander, 1 - pull);
      // Wings beat by squashing the drawing; the sign of the squash turns it to face its heading.
      const beat = Math.sin(t * 13 + phase);
      const width = (butterfly.w / butterfly.h) * 0.26 * (0.35 + 0.65 * Math.abs(beat)) * (Math.cos(t * 0.5 + phase) > 0 ? 1 : -1);
      scale.set(width, 0.26, 1);
      quaternion.setFromAxisAngle(new Vector3(0, 0, 1), Math.sin(t * 0.8 + phase) * 0.25);
      matrix.compose(position, quaternion, scale);
      instanced.setMatrixAt(index, matrix);
    }
    instanced.instanceMatrix.needsUpdate = true;
    ((instanced.material as ShaderMaterial).uniforms.uTint.value as Color).setRGB(film.mood.tint.r, film.mood.tint.g, film.mood.tint.b);
  });

  return <instancedMesh ref={mesh} args={[geometry, material, count]} frustumCulled={false} renderOrder={400} />;
}
