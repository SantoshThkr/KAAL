varying float vProgress;

void main() {
  float distanceToCenter = distance(gl_PointCoord, vec2(0.5));
  float alpha = smoothstep(0.5, 0.08, distanceToCenter);
  vec3 color = mix(vec3(0.22, 0.48, 0.72), vec3(0.84, 0.59, 0.28), vProgress);
  gl_FragColor = vec4(color, alpha);
}
