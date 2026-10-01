import * as THREE from 'three';
import { materials } from '../../engine/materials';

// PLACEHOLDER PROPS — low-poly stand-ins built from primitives, each with the
// same origin convention a final GLB will use: base centre at (0,0,0), facing
// -Z (toward the railing and the view). Replace any one of these by changing
// its catalog entry to kind:'glb'; the engine never calls these by name.

type Builder = () => THREE.Group;

function mesh(geometry: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

const sofaRattan: Builder = () => {
  const M = materials();
  const g = new THREE.Group();
  for (const [x, z] of [[-0.78, -0.36], [0.78, -0.36], [-0.78, 0.36], [0.78, 0.36]]) {
    g.add(mesh(new THREE.BoxGeometry(0.06, 0.12, 0.06), M.teak, x, 0.06, z));
  }
  g.add(mesh(new THREE.BoxGeometry(1.7, 0.3, 0.85), M.rattan, 0, 0.27, 0));
  g.add(mesh(new THREE.BoxGeometry(1.56, 0.14, 0.72), M.linen, 0, 0.49, -0.03));
  g.add(mesh(new THREE.BoxGeometry(1.7, 0.46, 0.14), M.rattan, 0, 0.63, 0.36));
  g.add(mesh(new THREE.BoxGeometry(0.14, 0.26, 0.85), M.rattan, -0.78, 0.55, 0));
  g.add(mesh(new THREE.BoxGeometry(0.14, 0.26, 0.85), M.rattan, 0.78, 0.55, 0));
  for (const x of [-0.45, 0.42]) {
    const c = mesh(new THREE.BoxGeometry(0.42, 0.38, 0.12), M.cushionTerracotta, x, 0.73, 0.26);
    c.rotation.x = -0.12;
    c.rotation.z = x < 0 ? 0.06 : -0.05;
    g.add(c);
  }
  return g;
};

const tableTeakSmall: Builder = () => {
  const M = materials();
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.04, 28), M.teak, 0, 0.4, 0));
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 6;
    g.add(mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.38, 10), M.teak, Math.cos(a) * 0.25, 0.19, Math.sin(a) * 0.25));
  }
  return g;
};

const lampFloorBrass: Builder = () => {
  const M = materials();
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.03, 28), M.brass, 0, 0.015, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.014, 0.014, 1.32, 10), M.brass, 0, 0.69, 0));
  const shade = mesh(new THREE.CylinderGeometry(0.14, 0.21, 0.3, 28, 1, true), M.lampShade, 0, 1.46, 0);
  shade.castShadow = false;
  g.add(shade);
  const bulb = mesh(new THREE.SphereGeometry(0.035, 12, 10), M.glassWarm, 0, 1.41, 0);
  bulb.castShadow = false;
  g.add(bulb);
  const light = new THREE.PointLight(0xffd9a0, 6, 3.6, 2);
  light.position.set(0, 1.42, 0);
  light.name = 'prop-light';
  g.add(light);
  return g;
};

const planterTerracotta: Builder = () => {
  const M = materials();
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.21, 0.15, 0.4, 24), M.terracotta, 0, 0.2, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.235, 0.235, 0.045, 24), M.terracotta, 0, 0.395, 0));
  const soil = mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.02, 24), M.soil, 0, 0.41, 0);
  soil.castShadow = false;
  g.add(soil);

  // foliage sways gently (ObjectSystem animates children flagged `sway`)
  const foliage = new THREE.Group();
  foliage.position.set(0, 0.42, 0);
  foliage.userData.sway = true;
  foliage.add(mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.5, 8), M.leaf, 0, 0.25, 0));
  const leafGeo = new THREE.SphereGeometry(1, 8, 6);
  leafGeo.scale(0.055, 0.02, 0.19);
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * Math.PI * 2 + (i % 2) * 0.3;
    const h = 0.18 + (i % 4) * 0.09;
    const leaf = new THREE.Mesh(leafGeo, i % 3 === 0 ? M.leafLight : M.leaf);
    leaf.position.set(Math.cos(a) * 0.1, h, Math.sin(a) * 0.1);
    leaf.rotation.y = -a + Math.PI / 2;
    leaf.rotation.x = -0.55 - (i % 3) * 0.12;
    leaf.castShadow = true;
    foliage.add(leaf);
  }
  g.add(foliage);
  return g;
};

const lanternBrass: Builder = () => {
  const M = materials();
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(0.26, 0.03, 0.26), M.brass, 0, 0.015, 0));
  for (const [x, z] of [[-0.11, -0.11], [0.11, -0.11], [-0.11, 0.11], [0.11, 0.11]]) {
    g.add(mesh(new THREE.BoxGeometry(0.016, 0.34, 0.016), M.brass, x, 0.2, z));
  }
  const glass = mesh(new THREE.BoxGeometry(0.2, 0.3, 0.2), M.glassWarm, 0, 0.19, 0);
  glass.castShadow = false;
  g.add(glass);
  g.add(mesh(new THREE.BoxGeometry(0.26, 0.03, 0.26), M.brass, 0, 0.385, 0));
  g.add(mesh(new THREE.ConeGeometry(0.17, 0.12, 4), M.brass, 0, 0.46, 0));
  const ring = mesh(new THREE.TorusGeometry(0.04, 0.008, 8, 16), M.brass, 0, 0.55, 0);
  g.add(ring);
  const light = new THREE.PointLight(0xffc46a, 2.2, 2.2, 2);
  light.position.set(0, 0.2, 0);
  light.name = 'prop-light';
  g.add(light);
  return g;
};

const rugJute: Builder = () => {
  const M = materials();
  const g = new THREE.Group();
  const base = mesh(new THREE.BoxGeometry(1.9, 0.014, 1.4), M.rug, 0, 0.007, 0);
  base.castShadow = false;
  g.add(base);
  for (const [w, d, x, z] of [[1.9, 0.08, 0, -0.66], [1.9, 0.08, 0, 0.66], [0.08, 1.4, -0.91, 0], [0.08, 1.4, 0.91, 0]]) {
    const b = mesh(new THREE.BoxGeometry(w, 0.016, d), M.rugBorder, x, 0.008, z);
    b.castShadow = false;
    g.add(b);
  }
  return g;
};

export const PROCEDURAL_BUILDERS: Record<string, Builder> = {
  sofa_rattan: sofaRattan,
  table_teak_small: tableTeakSmall,
  lamp_floor_brass: lampFloorBrass,
  planter_terracotta: planterTerracotta,
  lantern_brass: lanternBrass,
  rug_jute: rugJute,
};
