"use client";

import { useMemo } from "react";
import { BufferAttribute, Color, PlaneGeometry } from "three";
import { WATER_EDGE_Z, bankHeight } from "@/data/worldLayout";

const WIDTH = 90;
const DEPTH = 40;

/** The near bank of the Yamuna: damp earth at the water's edge, grass further up. Real lit geometry, receives shadow. */
export function RiverBank() {
  const geometry = useMemo(() => {
    const plane = new PlaneGeometry(WIDTH, DEPTH, 240, 120);
    plane.rotateX(-Math.PI / 2);
    plane.translate(0, 0, WATER_EDGE_Z - 1.5 + DEPTH / 2);
    const position = plane.getAttribute("position") as BufferAttribute;
    const colors = new Float32Array(position.count * 3);
    const wet = new Color(0x1b1510);
    const soil = new Color(0x2f261b);
    const grass = new Color(0x1f2a14);
    const dry = new Color(0x3a3322);
    const mix = new Color();
    for (let index = 0; index < position.count; index += 1) {
      const x = position.getX(index);
      const z = position.getZ(index);
      const y = bankHeight(x, z);
      position.setY(index, y);
      const up = Math.max(0, z - WATER_EDGE_Z);
      const patch = 0.5 + 0.5 * Math.sin(x * 0.9 + Math.sin(z * 1.3) * 2.0) * Math.cos(z * 0.7 - x * 0.2);
      mix.copy(wet).lerp(soil, Math.min(1, up / 0.8));
      mix.lerp(grass, Math.min(1, Math.max(0, (up - 0.9) / 1.5)) * (0.55 + 0.45 * patch));
      mix.lerp(dry, Math.max(0, patch - 0.7) * 0.6 * Math.min(1, up / 3));
      colors.set([mix.r, mix.g, mix.b], index * 3);
    }
    plane.setAttribute("color", new BufferAttribute(colors, 3));
    plane.computeVertexNormals();
    return plane;
  }, []);

  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial vertexColors roughness={0.96} metalness={0} />
    </mesh>
  );
}
