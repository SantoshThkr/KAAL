import * as THREE from "three";

export function configureKrishnaMaterials(root: THREE.Object3D) {
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    materials.forEach((material) => {
      if (!(material instanceof THREE.MeshStandardMaterial)) return;
      material.envMapIntensity = 0.8;
      material.roughness = Math.max(0.28, material.roughness);
      material.needsUpdate = true;
    });
  });
}
