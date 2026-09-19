import { skyChunk } from "../atmosphere/sky";

export const MAX_RIPPLES = 4;

/**
 * The Yamuna. A single large plane whose surface detail is entirely in the fragment shader: layered swells for the
 * slow body of the river, fine noise for the skin, expanding rings for ripples (a falling particle, a touch, a note).
 * It reflects the shared sky function, so the moon's glitter path is exactly under the moon.
 *
 * uniforms: uTime (world time), uRipple (x, z, startTime, strength) x MAX_RIPPLES, uAudioEnergy (flute).
 */
export const waterVertex = /* glsl */ `
varying vec3 vWorld;
#include <fog_pars_vertex>
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  vec4 mvPosition = viewMatrix * world;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

export const waterFragment = /* glsl */ `
${skyChunk}
uniform float uTime;
uniform vec4 uRipple[${MAX_RIPPLES}];
uniform float uAudioEnergy;
uniform vec3 uAudioCenter;
uniform vec3 uDeep;
varying vec3 vWorld;
#include <fog_pars_fragment>

float waterNoise(vec2 p) { return skyNoise(p); }

/** Surface height at a world point (metres, small). */
float surface(vec2 p) {
  float t = uTime;
  float h = 0.0;
  h += sin(dot(p, vec2(0.08, 0.31)) + t * 0.35) * 0.030;
  h += sin(dot(p, vec2(-0.21, 0.13)) + t * 0.52) * 0.018;
  h += (waterNoise(p * 0.9 + vec2(t * 0.06, t * 0.11)) - 0.5) * 0.030;
  h += (waterNoise(p * 3.1 - vec2(t * 0.17, t * 0.05)) - 0.5) * 0.012;
  h += (waterNoise(p * 9.0 + vec2(t * 0.31, -t * 0.22)) - 0.5) * 0.007;
  h += (waterNoise(p * 23.0 - vec2(t * 0.5, t * 0.37)) - 0.5) * 0.0025;

  for (int i = 0; i < ${MAX_RIPPLES}; i++) {
    vec4 r = uRipple[i];
    float age = t - r.z;
    if (r.w <= 0.0 || age < 0.0 || age > 9.0) continue;
    float d = length(p - r.xy);
    float front = age * 0.55;
    float ring = exp(-pow((d - front) * 5.0, 2.0)) * sin((d - front) * 26.0);
    h += ring * r.w * 0.02 * exp(-age * 0.45) / (1.0 + d * 0.6);
  }

  // The flute: slow concentric breathing around Krishna, scaled by the live (or baked) flute energy.
  float dc = length(p - uAudioCenter.xz);
  h += sin(dc * 9.0 - t * 2.2) * 0.006 * uAudioEnergy * exp(-dc * 0.35);
  return h;
}

void main() {
  vec2 p = vWorld.xz;
  float e = 0.03;
  float hx = surface(p + vec2(e, 0.0)) - surface(p - vec2(e, 0.0));
  float hz = surface(p + vec2(0.0, e)) - surface(p - vec2(0.0, e));
  vec3 n = normalize(vec3(-hx / (2.0 * e), 1.0, -hz / (2.0 * e)));

  vec3 view = normalize(vWorld - cameraPosition);
  vec3 refl = reflect(view, n);
  refl.y = abs(refl.y);

  float fresnel = 0.02 + 0.98 * pow(1.0 - max(dot(-view, n), 0.0), 5.0);
  vec3 sky = skyColor(refl, false);
  vec3 col = mix(uDeep, sky, fresnel);

  // Moon glitter: a broad column of light on the water under the moon, broken into sparkling facets.
  float facing = max(dot(refl, uMoonDir), 0.0);
  float column = pow(facing, 60.0) * 0.35;
  float glint = pow(facing, 700.0) * 9.0;
  float shimmer = smoothstep(0.55, 0.95, waterNoise(p * 7.0 + vec2(uTime * 0.6, -uTime * 0.4)));
  col += uMoonColor * (column + glint * (0.35 + shimmer));

  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;
