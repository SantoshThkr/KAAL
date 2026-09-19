"use client";

import { useMemo } from "react";
import { BufferAttribute, CircleGeometry, Color } from "three";

/** An open, dusty plain to the horizon. Stands in for Kurukshetra until the battlefield world exists. */
export function Plain() {
  const geometry = useMemo(() => {
    const disc = new CircleGeometry(400, 256, 0, Math.PI * 2);
    disc.rotateX(-Math.PI / 2);
    const position = disc.getAttribute("position") as BufferAttribute;
    const colors = new Float32Array(position.count * 3);
    const earth = new Color(0x4a3f30);
    const pale = new Color(0x6e604a);
    const c = new Color();
    for (let i = 0; i < position.count; i += 1) {
      const x = position.getX(i);
      const z = position.getZ(i);
      const n = 0.5 + 0.25 * Math.sin(x * 0.35 + Math.sin(z * 0.21) * 3) + 0.25 * Math.sin(z * 0.53 - x * 0.12);
      c.copy(earth).lerp(pale, n * 0.6);
      colors.set([c.r, c.g, c.b], i * 3);
    }
    disc.setAttribute("color", new BufferAttribute(colors, 3));
    return disc;
  }, []);
  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial vertexColors roughness={1} />
    </mesh>
  );
}
