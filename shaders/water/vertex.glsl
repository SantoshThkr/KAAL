uniform float uTime;
uniform float uRipple;
varying vec2 vUv;

void main() {
  vUv = uv;
  vec3 displaced = position;
  displaced.z += sin(position.x * 2.0 + uTime) * 0.012 * uRipple;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
}
