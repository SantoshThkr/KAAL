import { CanvasTexture, LinearMipmapLinearFilter, SRGBColorSpace, type Texture } from "three";
import type { PartArt } from "./krishnaArt";

/**
 * Rasterises the vector art into textures, once, at a resolution that suits a close-up. Drawing the art in code (no
 * image files) keeps every part crisp, recolourable and tiny over the wire.
 */
const cache = new Map<string, Texture>();

async function rasterise(part: PartArt, scale: number): Promise<Texture> {
  const height = Math.round((part.texHeight ?? 512) * scale);
  const width = Math.round((height * part.w) / part.h);
  const image = new Image();
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(part.svg)}`;
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  ctx.drawImage(image, 0, 0, width, height);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.anisotropy = 8;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

/** Load (and cache) every part's texture. `scale` trims resolution on weaker devices. */
export async function loadArt(parts: PartArt[], scale = 1): Promise<Map<string, Texture>> {
  const missing = parts.filter((part) => !cache.has(part.id));
  const made = await Promise.all(missing.map((part) => rasterise(part, scale)));
  missing.forEach((part, index) => cache.set(part.id, made[index]));
  return new Map(parts.map((part) => [part.id, cache.get(part.id) as Texture]));
}

export const artTexture = (id: string) => cache.get(id) ?? null;

export function disposeArt() {
  for (const texture of cache.values()) texture.dispose();
  cache.clear();
}
