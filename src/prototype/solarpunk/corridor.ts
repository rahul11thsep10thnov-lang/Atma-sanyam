// The glass corridor that joins two wings: an arched glass tube on bronze
// ribs over a stone walk, with planting troughs along both sides. It leads
// out of the dome towards the next wing; tapping it travels there.
import * as THREE from 'three';
import { makeGlassMaterial, makeMetalMaterial, makeRockMaterial, noiseTexture } from './materials';

export function buildCorridor(from: THREE.Vector3, to: THREE.Vector3, radius = 1.5): { group: THREE.Group; pick: THREE.Mesh; dispose(): void } {
  const group = new THREE.Group();
  const len = from.distanceTo(to);
  const dir = new THREE.Vector3().subVectors(to, from).normalize();
  const yaw = Math.atan2(dir.x, dir.z);
  group.position.copy(from);
  group.rotation.y = yaw;

  const glass = makeGlassMaterial(new THREE.Color(0xcfe6f2), 0.16);
  const metal = makeMetalMaterial(0xb8935a, 0.35, 0.8);
  const bump = noiseTexture(64, 6);
  const stone = makeRockMaterial(bump, 0.8);
  stone.vertexColors = false;
  stone.color = new THREE.Color(0xd8cdb6);

  const tube = new THREE.CylinderGeometry(radius, radius, len, 28, 1, true, -Math.PI / 2, Math.PI);
  tube.rotateX(Math.PI / 2);
  tube.rotateZ(Math.PI / 2);
  const glassMesh = new THREE.Mesh(tube, glass);
  glassMesh.position.set(0, 0.05, len / 2);
  glassMesh.name = 'glass';
  group.add(glassMesh);

  const ribGeo = new THREE.TorusGeometry(radius, 0.045, 6, 28, Math.PI);
  const ribs = Math.max(2, Math.round(len / 1.4));
  for (let i = 0; i <= ribs; i++) {
    const rib = new THREE.Mesh(ribGeo, metal);
    rib.position.set(0, 0.05, (i / ribs) * len);
    rib.castShadow = true;
    group.add(rib);
  }
  const railGeo = new THREE.BoxGeometry(0.06, 0.06, len);
  for (const a of [0.35, 0.75, 1.25, 1.57]) {
    for (const sg of [-1, 1]) {
      if (a === 1.57 && sg < 0) continue;
      const rail = new THREE.Mesh(railGeo, metal);
      rail.position.set(sg * Math.cos(a) * radius, 0.05 + Math.sin(a) * radius, len / 2);
      group.add(rail);
    }
  }
  const floorGeo = new THREE.BoxGeometry(radius * 1.9, 0.12, len);
  const floor = new THREE.Mesh(floorGeo, stone);
  floor.position.set(0, 0.0, len / 2);
  floor.receiveShadow = true;
  group.add(floor);
  const troughGeo = new THREE.BoxGeometry(0.34, 0.26, len - 0.4);
  const soil = new THREE.MeshStandardMaterial({ color: 0x3f6a2e, roughness: 0.95 });
  for (const sg of [-1, 1]) {
    const t = new THREE.Mesh(troughGeo, soil);
    t.position.set(sg * (radius - 0.3), 0.16, len / 2);
    t.castShadow = true;
    group.add(t);
  }

  const pick = new THREE.Mesh(new THREE.BoxGeometry(radius * 2, radius * 1.2, len), new THREE.MeshBasicMaterial({ visible: false }));
  pick.position.set(0, radius * 0.6, len / 2);
  pick.userData = { kind: 'corridor' };
  group.add(pick);

  return {
    group,
    pick,
    dispose() {
      for (const g of [tube, ribGeo, railGeo, floorGeo, troughGeo, pick.geometry]) g.dispose();
      for (const m of [glass, metal, stone, soil, pick.material as THREE.Material]) m.dispose();
      bump.dispose();
    },
  };
}
