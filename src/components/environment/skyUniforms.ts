import { Color, Vector3 } from "three";
import { DEG2RAD, clamp } from "@/lib/math";
import type { FilmState } from "@/lib/filmState";

/**
 * Uniforms for the shared sky function (shaders/atmosphere/sky.ts). One object is shared by the sky dome and the
 * water, and refreshed once per frame from the lighting presets, so both always agree.
 */
export const skyUniforms = {
  uHorizon: { value: new Color() },
  uZenith: { value: new Color() },
  uMoonDir: { value: new Vector3(0, 0.4, -1).normalize() },
  uMoonColor: { value: new Color() },
  uMoonSize: { value: 0.03 },
  uStars: { value: 1 },
  uSkyTime: { value: 0 }
};

/** How much brighter than the fog the sky itself glows. The fog colour alone is too dark to read as sky. */
const SKY_GAIN = 2.6;

export function updateSkyUniforms(film: FilmState) {
  const { fog, ambient, key } = film.light;
  const horizonLuminance = 0.2126 * fog.r + 0.7152 * fog.g + 0.0722 * fog.b;
  // Night fog colours are too dark to read as sky, so they are lifted; daylight ones are already sky-bright.
  const gain = SKY_GAIN + (0.85 - SKY_GAIN) * clamp((horizonLuminance - 0.02) / 0.18, 0, 1);
  skyUniforms.uHorizon.value.setRGB(fog.r * gain, fog.g * gain, fog.b * gain);
  // The zenith takes the ambient (sky-fill) colour, a little deeper than the horizon.
  skyUniforms.uZenith.value.setRGB(ambient.r * 0.55, ambient.g * 0.55, ambient.b * 0.6);
  skyUniforms.uMoonDir.value.setFromSphericalCoords(1, (90 - Math.max(key.el, 2)) * DEG2RAD, key.az * DEG2RAD);
  const brightness = clamp(key.i / 1.1, 0.3, 2.5);
  skyUniforms.uMoonColor.value.setRGB(key.r * brightness, key.g * brightness, key.b * brightness);
  skyUniforms.uStars.value = clamp(1 - horizonLuminance / 0.06, 0, 1);
  skyUniforms.uSkyTime.value = film.worldTime;
}
