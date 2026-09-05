import * as THREE from "three";

export type KrishnaMorphState = {
  source: THREE.Vector3[];
  target: THREE.Vector3[];
  progress: number;
};

export function sampleSkinnedSurface(root: THREE.Object3D, count: number) {
  const points: THREE.Vector3[] = [];
  const meshes: THREE.Mesh[] = [];
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (mesh.isMesh) meshes.push(mesh);
  });
  if (!meshes.length) return points;
  for (let index = 0; index < count; index += 1) {
    const mesh = meshes[index % meshes.length];
    const position = mesh.geometry.getAttribute("position");
    const vertex = Math.floor(Math.random() * position.count);
    const point = new THREE.Vector3().fromBufferAttribute(position, vertex);
    mesh.localToWorld(point);
    points.push(point);
  }
  return points;
}

export function createKrishnaMorphState(sourceRoot: THREE.Object3D, targetRoot: THREE.Object3D, count = 12000): KrishnaMorphState {
  return { source: sampleSkinnedSurface(sourceRoot, count), target: sampleSkinnedSurface(targetRoot, count), progress: 0 };
}
