import { DoubleSide, MeshPhysicalMaterial, MeshStandardMaterial, type Material } from "three";

/**
 * Tune imported materials for the film's night lighting. Sculpted models from Sketchfab arrive with a mix of glTF PBR
 * materials; this keeps their textures and colours, and only adjusts how they catch light:
 *  - skin and cloth stay rough (no plastic shine under the moon), and cloth gets a soft sheen at grazing angles;
 *  - metal (gold jewellery, crown) keeps its metalness so it glints in the rim light;
 *  - thin parts (scarf, feather, hair cards) render both sides.
 */
export function configureKrishnaMaterials(material: Material | Material[]) {
  const list = Array.isArray(material) ? material : [material];
  for (const item of list) {
    if (!(item instanceof MeshStandardMaterial)) continue;
    if (item.metalness < 0.5) item.roughness = Math.max(item.roughness, 0.55);
    item.envMapIntensity = 0.6;
    if (item.transparent || item.alphaTest > 0 || item.alphaMap) {
      item.side = DoubleSide;
      item.alphaTest = Math.max(item.alphaTest, 0.35);
      item.transparent = false;
    }
    if (item instanceof MeshPhysicalMaterial && item.metalness < 0.5) {
      item.sheen = Math.max(item.sheen, 0.25);
    }
    item.needsUpdate = true;
  }
}
