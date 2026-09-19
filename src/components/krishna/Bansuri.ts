import {
  CanvasTexture,
  ClampToEdgeWrapping,
  Group,
  LatheGeometry,
  Mesh,
  MeshStandardMaterial,
  SRGBColorSpace,
  Vector2
} from "three";

/** Bansuri dimensions (metres). A concert bansuri in E is about 60 cm with a 2.4 cm bore. */
export const BANSURI = {
  length: 0.6,
  radius: 0.0125,
  /** Distance from the closed end to the embouchure hole: the flute rests against the lip here. */
  embouchure: 0.075,
  /** Where each hand grips, measured from the embouchure along the flute. */
  gripLeft: 0.17,
  gripRight: 0.33
};

/** Bamboo: warm cane with dark node rings, six finger holes, and two silk bindings. Drawn once into a texture. */
function bambooTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 64;
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  const gradient = ctx.createLinearGradient(0, 0, 0, 64);
  gradient.addColorStop(0, "#6b4a22");
  gradient.addColorStop(0.35, "#c79a55");
  gradient.addColorStop(0.55, "#d9b06a");
  gradient.addColorStop(1, "#6b4a22");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1024, 64);
  // Grain.
  for (let i = 0; i < 260; i += 1) {
    ctx.fillStyle = `rgba(80, 50, 20, ${0.04 + Math.random() * 0.06})`;
    ctx.fillRect(Math.random() * 1024, Math.random() * 64, 30 + Math.random() * 180, 1);
  }
  const at = (metres: number) => (metres / BANSURI.length) * 1024;
  // Nodes.
  for (const node of [0.02, 0.29, 0.58]) {
    ctx.fillStyle = "rgba(60, 35, 12, 0.85)";
    ctx.fillRect(at(node) - 3, 0, 6, 64);
  }
  // Silk bindings in red and gold, near both ends.
  for (const [start, width] of [
    [0.035, 0.018],
    [0.55, 0.02]
  ]) {
    for (let k = 0; k < 6; k += 1) {
      ctx.fillStyle = k % 2 ? "#b8872f" : "#8e1f1a";
      ctx.fillRect(at(start + (width * k) / 6), 0, at(width / 6) + 1, 64);
    }
  }
  // Embouchure and six finger holes on the top of the flute (the texture's middle row faces up).
  const hole = (metres: number, r: number) => {
    ctx.fillStyle = "#1a0e05";
    ctx.beginPath();
    ctx.ellipse(at(metres), 32, r * 1.2, r, 0, 0, Math.PI * 2);
    ctx.fill();
  };
  hole(BANSURI.embouchure, 7);
  for (let k = 0; k < 6; k += 1) hole(0.3 + k * 0.034, 5.5);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = ClampToEdgeWrapping;
  texture.anisotropy = 8;
  return texture;
}

/**
 * The bansuri, modelled as a lathe (the bamboo's profile swells slightly at each node) and textured. Its local X axis
 * runs along the flute from the closed end (x = 0) to the open end; the holes face local +Y.
 */
export function createBansuri() {
  const profile: Vector2[] = [];
  const steps = 60;
  for (let i = 0; i <= steps; i += 1) {
    const x = (i / steps) * BANSURI.length;
    const nodeSwell = [0.02, 0.29, 0.58].reduce((sum, node) => sum + Math.exp(-Math.pow((x - node) / 0.006, 2)) * 0.0012, 0);
    profile.push(new Vector2(BANSURI.radius + nodeSwell - (x / BANSURI.length) * 0.0012, x));
  }
  profile.unshift(new Vector2(0.0001, 0));
  profile.push(new Vector2(0.0001, BANSURI.length));
  const geometry = new LatheGeometry(profile, 24);
  // Lathe runs along +Y; lay it along +X with the texture's middle row on top.
  geometry.rotateZ(-Math.PI / 2);
  geometry.rotateX(Math.PI / 2);

  const material = new MeshStandardMaterial({ map: bambooTexture(), roughness: 0.55, metalness: 0.02 });
  // LatheGeometry's U wraps around the flute and V runs along it; swap so our texture's X runs along the flute.
  material.map?.center.set(0.5, 0.5);
  if (material.map) material.map.rotation = Math.PI / 2;
  const mesh = new Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.name = "KR_Flute";
  const group = new Group();
  group.name = "Bansuri";
  group.add(mesh);
  return group;
}
