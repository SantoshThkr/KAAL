import { BlendFunction, Effect } from "postprocessing";
import { Uniform } from "three";
import { wrapEffect } from "@react-three/postprocessing";

const fragmentShader = /* glsl */ `
uniform float uGain;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  outputColor = vec4(inputColor.rgb * uGain, inputColor.a);
}
`;

/**
 * A single multiply. Used twice in the chain: before tone mapping as exposure, and last as the fade to black, so that
 * a fade of 1 is true black (no grain, no vignette lift) and "cut to black" is a real cut to black.
 */
export class GainEffect extends Effect {
  constructor({ gain = 1 }: { gain?: number } = {}) {
    super("GainEffect", fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, Uniform>([["uGain", new Uniform(gain)]])
    });
  }

  get gain(): number {
    return (this.uniforms.get("uGain") as Uniform<number>).value;
  }

  set gain(value: number) {
    (this.uniforms.get("uGain") as Uniform<number>).value = value;
  }
}

export const Gain = wrapEffect(GainEffect);
