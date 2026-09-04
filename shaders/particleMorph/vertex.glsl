uniform float uProgress;
uniform float uTime;
uniform float uNoiseStrength;
uniform float uAttractor;
uniform float uDissolve;
attribute vec3 aSource;
attribute vec3 aTarget;
varying float vProgress;

void main() {
  float eased = smoothstep(0.0, 1.0, uProgress);
  vec3 position = mix(aSource, aTarget, eased);
  position += sin(position.yzx * 6.0 + uTime) * uNoiseStrength * sin(eased * 3.14159);
  position *= 1.0 + uAttractor * sin(eased * 3.14159);
  vProgress = eased;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = mix(2.0, 4.5, eased) * (1.0 - uDissolve);
}
