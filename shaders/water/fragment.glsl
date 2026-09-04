uniform float uAudioEnergy;
varying vec2 vUv;

void main() {
  float reflection = smoothstep(0.0, 1.0, 1.0 - abs(vUv.y - 0.5) * 2.0);
  vec3 color = mix(vec3(0.02, 0.08, 0.12), vec3(0.17, 0.31, 0.39), reflection * 0.45 + uAudioEnergy * 0.2);
  gl_FragColor = vec4(color, 0.92);
}
