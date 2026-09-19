/**
 * One sky, shared by the sky dome and the water's reflection, so what the river mirrors is exactly what is above it.
 * Everything is driven by the lighting presets (horizon = fog colour, key light = moon or sun direction), so the same
 * shader is midnight, dawn, golden hour and dusk.
 */
export const skyChunk = /* glsl */ `
uniform vec3 uHorizon;
uniform vec3 uZenith;
uniform vec3 uMoonDir;
uniform vec3 uMoonColor;
uniform float uMoonSize;
uniform float uStars;
uniform float uSkyTime;

float skyHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
vec2 skyHash2(vec2 p) { return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453); }
float skyNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(skyHash(i), skyHash(i + vec2(1, 0)), u.x), mix(skyHash(i + vec2(0, 1)), skyHash(i + vec2(1, 1)), u.x), u.y);
}
float skyFbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * skyNoise(p); p *= 2.03; a *= 0.5; }
  return v;
}

/** Height of the far bank's tree line above the horizon, in radians, as a function of azimuth. */
float treeLine(float azimuth) {
  // A river's far bank is low and long: a flat line of trees with rounded crowns, the odd taller kadamba.
  float broad = skyFbm(vec2(azimuth * 2.2, 1.7));
  float crowns = skyFbm(vec2(azimuth * 55.0, 4.1));
  float tall = smoothstep(0.62, 0.9, skyFbm(vec2(azimuth * 9.0, 8.3)));
  return 0.008 + broad * 0.008 + crowns * 0.009 + tall * 0.012;
}

vec3 skyColor(vec3 dir, bool withTreeLine) {
  vec3 d = normalize(dir);
  float elevation = asin(clamp(d.y, -1.0, 1.0));
  float azimuth = atan(d.x, d.z);

  // Gradient: the horizon glows with the air, the zenith deepens.
  float h = clamp(d.y, 0.0, 1.0);
  vec3 col = mix(uHorizon, uZenith, pow(h, 0.45));

  // Thin high cloud, lit from the moon's side.
  vec2 cloudUv = d.xz / max(0.12, d.y + 0.08) * 0.6 + vec2(uSkyTime * 0.004, 0.0);
  float cloud = smoothstep(0.52, 0.8, skyFbm(cloudUv * 1.4)) * smoothstep(0.0, 0.25, d.y);
  float moonSide = pow(max(dot(d, uMoonDir), 0.0), 3.0);
  col = mix(col, uHorizon * 1.4 + uMoonColor * moonSide * 0.35, cloud * 0.35);

  // Stars: sparse, varied, gently twinkling; hidden by cloud and by the glow near the horizon.
  if (uStars > 0.001) {
    vec2 cellUv = vec2(azimuth / 3.14159265 * 220.0, elevation / 1.5707963 * 110.0);
    vec2 cell = floor(cellUv);
    vec2 jitter = skyHash2(cell) - 0.5;
    float pick = skyHash(cell + 17.0);
    float dist = length(fract(cellUv) - 0.5 - jitter * 0.6);
    float bright = step(0.972, pick) * (0.3 + 0.7 * pow(skyHash(cell + 3.0), 2.0));
    float twinkle = 0.75 + 0.25 * sin(uSkyTime * (1.5 + pick * 3.0) + pick * 40.0);
    float star = smoothstep(0.06, 0.0, dist) * bright * twinkle;
    col += vec3(0.85, 0.9, 1.0) * star * uStars * smoothstep(0.02, 0.2, d.y) * (1.0 - cloud);
  }

  // The moon (or the sun, when the preset is daylight): a limb-darkened disc and a soft halo.
  float cosAngle = dot(d, uMoonDir);
  float angle = acos(clamp(cosAngle, -1.0, 1.0));
  float disc = smoothstep(uMoonSize, uMoonSize * 0.93, angle);
  float limb = sqrt(max(0.0, 1.0 - pow(angle / uMoonSize, 2.0)));
  float maria = 0.82 + 0.18 * skyFbm(vec2(angle * 40.0, atan(d.y - uMoonDir.y, d.x - uMoonDir.x) * 2.0));
  col = mix(col, uMoonColor * (0.7 + 0.3 * limb) * maria * 2.2, disc);
  col += uMoonColor * (exp(-angle * 18.0) * 0.35 + exp(-angle * 4.0) * 0.08);

  // Far bank: a dark line of trees along the horizon.
  if (withTreeLine) {
    float line = treeLine(azimuth);
    float tree = smoothstep(line + 0.002, line - 0.002, elevation) * step(-0.02, elevation);
    col = mix(col, uHorizon * 0.18, tree * 0.92);
  }

  // Below the horizon (seen only in reflections): the dark far bank.
  col = mix(col, uHorizon * 0.12, smoothstep(0.0, -0.02, elevation));
  return col;
}
`;

export const skyVertex = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  vec4 p = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * p;
  gl_Position.z = gl_Position.w; // always at the far plane
}
`;

export const skyFragment = /* glsl */ `
${skyChunk}
varying vec3 vDir;
void main() {
  gl_FragColor = vec4(skyColor(vDir, true), 1.0);
  #include <colorspace_fragment>
}
`;
