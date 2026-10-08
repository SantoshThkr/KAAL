/**
 * The sky: a painted gradient with a sun or moon, stars, and the far bank's treeline. Everything comes from the
 * scene's mood, so one shader is midnight, morning, golden hour and the cosmos.
 */
export const skyVertex = /* glsl */ `
varying vec2 vUv;
varying vec3 vDir;
void main() {
  vUv = uv;
  vDir = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const skyFragment = /* glsl */ `
uniform vec3 uSkyTop;
uniform vec3 uSkyHorizon;
uniform vec3 uLamp;
uniform vec2 uLampPos;
uniform float uLampSize;
uniform float uStars;
uniform float uTime;
uniform float uCosmos;
varying vec3 vDir;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1,0)), u.x), mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.02; a *= 0.5; }
  return v;
}

void main() {
  vec3 dir = normalize(vDir);
  // Sky coordinates: x across the dome, y up from the horizon.
  float up = clamp(dir.y, -0.2, 1.0);
  vec2 sky = vec2(atan(dir.x, -dir.z) / 3.14159265, up);

  vec3 col = mix(uSkyHorizon, uSkyTop, pow(clamp(up, 0.0, 1.0), 0.42));

  // Stars, thicker overhead, with a slow twinkle.
  if (uStars > 0.001) {
    vec2 cell = floor(sky * vec2(420.0, 240.0));
    float pick = hash(cell);
    float dist = length(fract(sky * vec2(420.0, 240.0)) - 0.5);
    float star = smoothstep(0.34, 0.0, dist) * step(0.978, pick);
    float twinkle = 0.7 + 0.3 * sin(uTime * (1.2 + pick * 4.0) + pick * 30.0);
    col += vec3(0.9, 0.93, 1.0) * star * twinkle * uStars * smoothstep(0.0, 0.25, up);
  }

  // The lamp: sun or moon, with a soft halo.
  vec2 lampDelta = (sky - uLampPos) * vec2(1.6, 1.0);
  float lampDist = length(lampDelta);
  float disc = smoothstep(uLampSize, uLampSize * 0.82, lampDist);
  col = mix(col, uLamp * 1.5, disc);
  col += uLamp * (exp(-lampDist * 9.0) * 0.5 + exp(-lampDist * 2.4) * 0.12);

  // The cosmos arriving: nebula light blooming out of the dark.
  if (uCosmos > 0.001) {
    float n = fbm(sky * 3.2 + vec2(uTime * 0.01, 0.0));
    float m = fbm(sky * 7.0 - vec2(uTime * 0.016, 0.0));
    vec3 nebula = mix(vec3(0.22, 0.12, 0.42), vec3(0.95, 0.76, 0.45), smoothstep(0.45, 0.95, n * m * 2.1));
    col = mix(col, col + nebula, uCosmos * smoothstep(0.1, 0.8, n));
    vec2 dense = floor(sky * vec2(900.0, 520.0));
    float deep = smoothstep(0.3, 0.0, length(fract(sky * vec2(900.0, 520.0)) - 0.5)) * step(0.982, hash(dense + 3.1));
    col += vec3(1.0) * deep * uCosmos * 0.9;
  }

  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}
`;

/** The river: flat bands of colour, a moving line of light under the lamp, and rings when the flute sounds. */
export const waterVertex = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorld;
void main() {
  vUv = uv;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const waterFragment = /* glsl */ `
uniform vec3 uWater;
uniform vec3 uLamp;
uniform vec3 uSkyHorizon;
uniform float uTime;
uniform float uEnergy;
uniform float uMagic;
uniform vec3 uRipple;   // x, z, start time
uniform float uLampX;
varying vec2 vUv;
varying vec3 vWorld;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1,0)), u.x), mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x), u.y);
}

void main() {
  // Far water takes the sky; near water keeps its own colour.
  float depth = clamp((vWorld.z + 8.0) / -22.0, 0.0, 1.0);
  vec3 col = mix(uWater, uSkyHorizon * 0.85, depth * 0.75);

  // Long lazy ripples across the river.
  float band = sin(vWorld.z * 1.6 + uTime * 0.5 + noise(vWorld.xz * 0.3) * 3.0);
  col += uLamp * smoothstep(0.86, 1.0, band) * 0.09;

  // The lamp's reflection: a soft column of light directly under it.
  float column = exp(-pow((vWorld.x - uLampX * 14.0) * 0.26, 2.0));
  float shimmer = smoothstep(0.55, 1.0, noise(vec2(vWorld.x * 2.2, vWorld.z * 0.5 + uTime * 0.7)));
  col += uLamp * column * (0.12 + shimmer * 0.5) * (0.55 + uEnergy * 0.8);

  // Rings spreading from wherever the flute last sounded.
  float age = uTime - uRipple.z;
  if (age > 0.0 && age < 12.0) {
    float d = distance(vWorld.xz, uRipple.xy);
    float front = age * 2.2;
    float ring = exp(-pow((d - front) * 1.5, 2.0)) * sin((d - front) * 7.0);
    col += uLamp * ring * 0.5 * exp(-age * 0.25) * (0.4 + uMagic);
  }

  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}
`;

/** Ground: grass that darkens with distance, with a worn path along the bank. */
export const groundVertex = waterVertex;

export const groundFragment = /* glsl */ `
uniform vec3 uNear;
uniform vec3 uFar;
uniform vec3 uPath;
uniform float uTime;
varying vec3 vWorld;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1,0)), u.x), mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x), u.y);
}

void main() {
  float toward = clamp((vWorld.z + 8.0) / 14.0, 0.0, 1.0);
  vec3 col = mix(uFar, uNear, toward);
  col *= 0.88 + 0.24 * noise(vWorld.xz * 1.7);
  col *= 0.94 + 0.12 * noise(vWorld.xz * 7.0);
  // A path of worn earth where everyone walks, just in front of the water.
  float path = exp(-pow((vWorld.z + 1.2) * 0.9, 2.0)) * (0.75 + 0.25 * noise(vWorld.xz * 2.5));
  col = mix(col, uPath, path * 0.55);
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}
`;
