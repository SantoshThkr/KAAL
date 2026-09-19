"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  Bloom,
  ChromaticAberration,
  DepthOfField,
  EffectComposer,
  Noise,
  ToneMapping,
  Vignette
} from "@react-three/postprocessing";
import {
  BlendFunction,
  ToneMappingMode,
  type BloomEffect,
  type ChromaticAberrationEffect,
  type DepthOfFieldEffect,
  type NoiseEffect,
  type VignetteEffect
} from "postprocessing";
import { HalfFloatType, UnsignedByteType } from "three";
import { clamp } from "@/lib/math";
import { PROFILES } from "@/lib/quality";
import { film } from "@/state/film";
import { useExperienceStore } from "@/state/experienceStore";
import { Gain, type GainEffect } from "./GainEffect";

/** f-number the depth of field is derived from. Wide open, as a cinematographer would shoot a close-up. */
const F_NUMBER = 2.8;
/** Circle of confusion on a 35 mm film back, in metres. */
const CIRCLE_OF_CONFUSION = 0.00003;

/**
 * Depth of field in metres for the current lens and subject distance (thin lens). Beyond the hyperfocal distance
 * everything to infinity is acceptably sharp, exactly as with a real lens: a wide lens on a distant subject keeps
 * the stars pin-sharp; a long lens on a face melts the background.
 */
const focusRange = (focusMetres: number, focalMm: number) => {
  const f = focalMm / 1000;
  const hyperfocal = (f * f) / (F_NUMBER * CIRCLE_OF_CONFUSION) + f;
  const s = Math.max(focusMetres, f * 1.01);
  const near = (s * (hyperfocal - f)) / (hyperfocal + s - 2 * f);
  const far = s >= hyperfocal ? Infinity : (s * (hyperfocal - f)) / (hyperfocal - s);
  return clamp(Math.min(far, 1e5) - near, 0.05, 1e5);
};

/**
 * The grade: depth of field, bloom, tone mapping, vignette, grain, a breath of chromatic aberration, and the fade.
 * Cinematic, not artificial: every value below is driven each frame from `film` by the master timeline, through refs,
 * with no React state involved.
 */
export function PostFX({ floatTargets }: { floatTargets: boolean }) {
  const quality = useExperienceStore((state) => state.quality);
  const profile = PROFILES[quality];

  const exposure = useRef<GainEffect>(null);
  const fade = useRef<GainEffect>(null);
  const bloom = useRef<BloomEffect>(null);
  const vignette = useRef<VignetteEffect>(null);
  const noise = useRef<NoiseEffect>(null);
  const chromatic = useRef<ChromaticAberrationEffect>(null);
  const depthOfField = useRef<DepthOfFieldEffect>(null);

  useFrame(() => {
    const { light, fx, cam } = film;
    if (exposure.current) exposure.current.gain = light.exposure;
    if (fade.current) fade.current.gain = 1 - fx.fade;
    if (bloom.current) bloom.current.intensity = light.bloom;
    if (vignette.current) vignette.current.darkness = fx.vignette;
    if (noise.current) noise.current.blendMode.opacity.value = fx.grain;
    if (chromatic.current) chromatic.current.offset.set(fx.chromatic, fx.chromatic);
    const dof = depthOfField.current;
    if (dof) {
      dof.bokehScale = fx.bokeh;
      dof.circleOfConfusionMaterial.focusDistance = cam.focus;
      dof.circleOfConfusionMaterial.focusRange = focusRange(cam.focus, cam.focal);
    }
  });

  return (
    <EffectComposer
      multisampling={profile.msaa}
      frameBufferType={floatTargets ? HalfFloatType : UnsignedByteType}
      enableNormalPass={false}
    >
      {profile.dof ? <DepthOfField ref={depthOfField} focusDistance={8} focusRange={4} bokehScale={1.6} /> : <></>}
      <Bloom ref={bloom} mipmapBlur luminanceThreshold={0.9} luminanceSmoothing={0.25} radius={0.7} />
      {profile.chromatic ? <ChromaticAberration ref={chromatic} radialModulation modulationOffset={0.3} /> : <></>}
      <Gain ref={exposure} gain={1} />
      <ToneMapping mode={ToneMappingMode.AGX} />
      <Vignette ref={vignette} eskil={false} offset={0.3} darkness={0.55} />
      {profile.grain ? <Noise ref={noise} premultiply blendFunction={BlendFunction.SOFT_LIGHT} /> : <></>}
      <Gain ref={fade} gain={0} />
    </EffectComposer>
  );
}
