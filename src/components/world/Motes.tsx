"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, BufferGeometry, Color, Float32BufferAttribute, Points, ShaderMaterial, type Texture } from "three";
import { glow } from "@/art/worldArt";
import { artTexture } from "@/art/artTextures";
import { seeded } from "@/lib/random";
import { useQuality } from "@/hooks/useQuality";
import { film } from "@/state/film";

/**
 * Fireflies and motes of light: the air of the place. They drift on their own, lift and brighten when the flute
 * plays (film.fx.magic and the live flute energy), and stream upward when the cosmos opens.
 */
export function Motes() {
  const quality = useQuality();
  const count = Math.round(900 * quality.particleScale);
  const points = useRef<Points>(null);

  const { geometry, material } = useMemo(() => {
    const geometry = new BufferGeometry();
    const position = new Float32Array(count * 3);
    const seed = new Float32Array(count * 3);
    const random = seeded(4321);
    for (let i = 0; i < count; i += 1) {
      position[i * 3] = (random() - 0.5) * 48;
      position[i * 3 + 1] = random() * 7;
      position[i * 3 + 2] = -14 + random() * 18;
      seed[i * 3] = random() * Math.PI * 2;
      seed[i * 3 + 1] = 0.4 + random() * 1.6;
      seed[i * 3 + 2] = random();
    }
    geometry.setAttribute("position", new Float32BufferAttribute(position, 3));
    geometry.setAttribute("aSeed", new Float32BufferAttribute(seed, 3));

    const material = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: {
        map: { value: artTexture(glow.id) as Texture },
        uTime: { value: 0 },
        uMagic: { value: 0 },
        uEnergy: { value: 0 },
        uCosmos: { value: 0 },
        uColor: { value: new Color("#FFE9A8") },
        uPixelRatio: { value: 1 },
        uCentre: { value: 2.6 }
      },
      vertexShader: /* glsl */ `
        attribute vec3 aSeed;
        uniform float uTime;
        uniform float uMagic;
        uniform float uEnergy;
        uniform float uCosmos;
        uniform float uPixelRatio;
        uniform float uCentre;
        varying float vAlpha;
        void main() {
          vec3 p = position;
          float phase = aSeed.x;
          float speed = aSeed.y;
          // Drift: a slow wander, lifting as the flute takes hold.
          p.x += sin(uTime * 0.25 * speed + phase) * 1.1;
          p.y += sin(uTime * 0.4 * speed + phase * 1.7) * 0.5 + uMagic * (0.6 + aSeed.z * 2.2);
          p.z += cos(uTime * 0.21 * speed + phase) * 0.9;
          // When the cosmos opens, everything streams up and in toward him.
          if (uCosmos > 0.001) {
            vec3 toCentre = vec3(uCentre, 2.0 + aSeed.z * 10.0, -2.0) - p;
            p += toCentre * uCosmos * (0.25 + aSeed.z * 0.5);
          }
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          float twinkle = 0.55 + 0.45 * sin(uTime * (1.4 + speed) + phase * 4.0);
          vAlpha = twinkle * (0.18 + uMagic * 0.85 + uEnergy * 0.5 + uCosmos * 0.7);
          gl_PointSize = (14.0 + uMagic * 26.0 + uCosmos * 30.0) * uPixelRatio / max(1.0, -mv.z) * 6.0;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D map;
        uniform vec3 uColor;
        varying float vAlpha;
        void main() {
          vec4 texel = texture2D(map, gl_PointCoord);
          gl_FragColor = vec4(uColor * texel.rgb, texel.a * vAlpha);
          #include <colorspace_fragment>
        }
      `
    });
    return { geometry, material };
  }, [count]);

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  useFrame(({ gl }) => {
    const node = points.current;
    if (!node) return;
    const u = (node.material as ShaderMaterial).uniforms;
    u.uTime.value = film.worldTime;
    u.uMagic.value = film.fx.magic;
    u.uEnergy.value = film.audio.energy;
    u.uCosmos.value = film.fx.cosmos;
    u.uPixelRatio.value = gl.getPixelRatio();
    (u.uColor.value as Color).setRGB(
      0.9 + film.mood.lamp.r * 0.3,
      0.82 + film.mood.lamp.g * 0.25,
      0.6 + film.mood.lamp.b * 0.3
    );
  });

  return <points ref={points} args={[geometry, material]} frustumCulled={false} renderOrder={500} />;
}
