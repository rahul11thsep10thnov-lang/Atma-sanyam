import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { foliageClump, materials } from '../../engine/materials';

// PLACEHOLDER PROPS — low-poly stand-ins built from primitives, each with the
// same origin convention a final GLB will use: base centre at (0,0,0), facing
// -Z (toward the railing and the view). Replace any one of these by changing
// its catalog entry to kind:'glb'; the engine never calls these by name.

/** Growth 0..1 (visual size/fullness) and health 0..1 (below the wilt
 * threshold the foliage browns and droops). Non-plants ignore both. */
export interface BuildOptions {
  growth: number;
  health: number;
}
export const FULL: BuildOptions = { growth: 1, health: 1 };

type Builder = (opts?: BuildOptions) => THREE.Group;

const WILT_AT = 0.35;
const WILT_TINT = new THREE.Color(0x8a7a3a);

function mesh(geometry: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function seeded(seed: number) {
  return () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

/** Low white sectional: plinth base, three seat cushions, three loose back
 * cushions and four throw pillows. 2.2 m long, 0.9 m deep, seat at 0.46. */
const sofaSectionalWhite: Builder = () => {
  const M = materials();
  const g = new THREE.Group();
  const recess = mesh(new THREE.BoxGeometry(2.0, 0.06, 0.7), M.darkMetal, 0, 0.03, 0.02);
  recess.castShadow = false;
  g.add(recess);
  g.add(mesh(new RoundedBoxGeometry(2.2, 0.34, 0.9, 2, 0.03), M.whiteFabric, 0, 0.23, 0));
  for (const x of [-0.73, 0, 0.73]) {
    g.add(mesh(new RoundedBoxGeometry(0.7, 0.16, 0.8, 3, 0.05), M.whiteFabric, x, 0.46, -0.03));
    const back = mesh(new RoundedBoxGeometry(0.7, 0.42, 0.16, 3, 0.05), M.whiteFabric, x, 0.7, 0.36);
    back.rotation.x = -0.14;
    g.add(back);
  }
  for (const x of [-1.04, 1.04]) {
    g.add(mesh(new RoundedBoxGeometry(0.12, 0.2, 0.88, 2, 0.03), M.whiteFabric, x, 0.5, 0.01));
  }
  const pillows: [number, THREE.Material, number][] = [
    [-0.8, M.cushionSand, 0.08],
    [-0.38, M.cushionOlive, -0.05],
    [0.32, M.cushionGrey, 0.06],
    [0.78, M.cushionCharcoal, -0.07],
  ];
  for (const [x, mat, tilt] of pillows) {
    const p = mesh(new RoundedBoxGeometry(0.42, 0.42, 0.12, 3, 0.06), mat, x, 0.76, 0.22);
    p.rotation.x = -0.18;
    p.rotation.z = tilt;
    g.add(p);
  }
  return g;
};

/** Low walnut coffee table with a bowl and a book on it. 1.1 × 0.6, 0.34 high. */
const tableCoffeeLow: Builder = () => {
  const M = materials();
  const g = new THREE.Group();
  g.add(mesh(new RoundedBoxGeometry(1.1, 0.05, 0.6, 2, 0.015), M.walnut, 0, 0.315, 0));
  for (const x of [-0.42, 0.42]) {
    g.add(mesh(new THREE.BoxGeometry(0.05, 0.29, 0.5), M.walnut, x, 0.145, 0));
  }
  g.add(mesh(new THREE.CylinderGeometry(0.11, 0.08, 0.05, 20), M.planterConcrete, -0.22, 0.365, 0.05));
  g.add(mesh(new THREE.BoxGeometry(0.24, 0.03, 0.17), M.cushionCharcoal, 0.26, 0.355, -0.06));
  g.add(mesh(new THREE.BoxGeometry(0.22, 0.02, 0.15), M.cushionSand, 0.27, 0.38, -0.05));
  return g;
};

/** Charcoal planter trough with a clipped hedge. 1.6 m long, hedge to ~1.1 m
 * when fully grown; a seedling row of small tufts when new. */
const planterTroughHedge: Builder = (opts = FULL) => {
  const M = materials();
  const g = new THREE.Group();
  g.add(mesh(new RoundedBoxGeometry(1.6, 0.46, 0.45, 2, 0.02), M.planterCharcoal, 0, 0.23, 0));
  const soil = mesh(new THREE.BoxGeometry(1.52, 0.02, 0.37), M.soil, 0, 0.455, 0);
  soil.castShadow = false;
  g.add(soil);
  const grow = 0.18 + 0.82 * opts.growth;
  const foliage = new THREE.Group();
  foliage.position.set(0, 0.46, 0);
  foliage.userData.sway = true;
  const clump = foliageClump(Math.round(16 + 54 * opts.growth), [1.5, 0.5 * grow, 0.36], [0.09 * grow, 0.16 * grow], seeded(5));
  if (opts.health < WILT_AT) tintWilted(clump, opts.health);
  foliage.add(clump);
  if (opts.health < WILT_AT) foliage.rotation.x = 0.12;
  g.add(foliage);
  return g;
};

/** Tall charcoal pot with a broad-leaf plant. Pot 0.62 high, leaves to
 * ~1.7 m when grown; a short stem with three small leaves when new. */
const planterTallBroadleaf: Builder = (opts = FULL) => {
  const M = materials();
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.24, 0.2, 0.62, 20), M.planterCharcoal, 0, 0.31, 0));
  const soil = mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.02, 20), M.soil, 0, 0.62, 0);
  soil.castShadow = false;
  g.add(soil);

  const grow = 0.3 + 0.7 * opts.growth;
  const wilted = opts.health < WILT_AT;
  const plant = new THREE.Group();
  plant.position.set(0, 0.62, 0);
  plant.userData.sway = true;
  plant.add(mesh(new THREE.CylinderGeometry(0.018, 0.026, 0.7 * grow, 8), M.leaf, 0, 0.35 * grow, 0));
  const leafGeo = new THREE.SphereGeometry(1, 8, 6);
  leafGeo.scale(0.14 * grow, 0.025, 0.42 * grow);
  const leafMat = wilted ? M.leafWilted : M.leaf;
  const leafMatLight = wilted ? M.leafWilted : M.leafLight;
  const rand = seeded(21);
  const count = 3 + Math.round(6 * opts.growth);
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + rand() * 0.4;
    const h = (0.45 + rand() * 0.55) * grow;
    const leaf = new THREE.Mesh(leafGeo, i % 3 === 0 ? leafMatLight : leafMat);
    leaf.position.set(Math.cos(a) * 0.2 * grow, h, Math.sin(a) * 0.2 * grow);
    leaf.rotation.y = -a + Math.PI / 2;
    leaf.rotation.x = (wilted ? -1.1 : -0.45) - rand() * 0.3;
    leaf.castShadow = true;
    plant.add(leaf);
  }
  g.add(plant);
  return g;
};

/** Browns an instanced foliage clump in place (per-instance colours). */
function tintWilted(clump: THREE.InstancedMesh, health: number) {
  const c = new THREE.Color();
  const t = 1 - health / WILT_AT; // 0 at the threshold → 1 fully dry
  for (let i = 0; i < clump.count; i++) {
    clump.getColorAt(i, c);
    c.lerp(WILT_TINT, 0.35 + 0.5 * t);
    clump.setColorAt(i, c);
  }
  if (clump.instanceColor) clump.instanceColor.needsUpdate = true;
}

/** Slim black arc floor lamp with a white drum shade, 1.9 m. */
const lampFloorArc: Builder = () => {
  const M = materials();
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.025, 24), M.lampBlack, 0, 0.0125, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.014, 0.014, 1.78, 10), M.lampBlack, 0, 0.9, 0));
  const arm = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.42, 10), M.lampBlack, 0, 1.79, -0.2);
  arm.rotation.x = Math.PI / 2;
  g.add(arm);
  const shade = mesh(new THREE.CylinderGeometry(0.15, 0.17, 0.2, 28, 1, true), M.lampShade, 0, 1.68, -0.4);
  shade.castShadow = false;
  g.add(shade);
  const bulb = mesh(new THREE.SphereGeometry(0.035, 12, 10), M.glassWarm, 0, 1.64, -0.4);
  bulb.castShadow = false;
  g.add(bulb);
  const light = new THREE.PointLight(0xffd9a0, 6, 3.8, 2);
  light.position.set(0, 1.62, -0.4);
  light.name = 'prop-light';
  g.add(light);
  return g;
};

/** Black metal candle lantern with warm glass, 0.5 m. */
const lanternBlack: Builder = () => {
  const M = materials();
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(0.28, 0.02, 0.28), M.lampBlack, 0, 0.01, 0));
  for (const [x, z] of [[-0.12, -0.12], [0.12, -0.12], [-0.12, 0.12], [0.12, 0.12]]) {
    g.add(mesh(new THREE.BoxGeometry(0.014, 0.36, 0.014), M.lampBlack, x, 0.2, z));
  }
  const glass = mesh(new THREE.BoxGeometry(0.22, 0.32, 0.22), M.glassWarm, 0, 0.2, 0);
  glass.castShadow = false;
  g.add(glass);
  g.add(mesh(new THREE.BoxGeometry(0.28, 0.02, 0.28), M.lampBlack, 0, 0.39, 0));
  g.add(mesh(new THREE.ConeGeometry(0.19, 0.1, 4), M.lampBlack, 0, 0.45, 0));
  g.add(mesh(new THREE.TorusGeometry(0.035, 0.007, 8, 16), M.lampBlack, 0, 0.53, 0));
  const light = new THREE.PointLight(0xffc46a, 2.2, 2.2, 2);
  light.position.set(0, 0.2, 0);
  light.name = 'prop-light';
  g.add(light);
  return g;
};

/** Flat-weave outdoor rug, 2.2 × 1.6, pale with a dark border. */
const rugOutdoor: Builder = () => {
  const M = materials();
  const g = new THREE.Group();
  const base = mesh(new THREE.BoxGeometry(2.2, 0.012, 1.6), M.rug, 0, 0.006, 0);
  base.castShadow = false;
  g.add(base);
  for (const [w, d, x, z] of [[2.2, 0.06, 0, -0.77], [2.2, 0.06, 0, 0.77], [0.06, 1.6, -1.07, 0], [0.06, 1.6, 1.07, 0]]) {
    const b = mesh(new THREE.BoxGeometry(w, 0.014, d), M.rugBorder, x, 0.007, z);
    b.castShadow = false;
    g.add(b);
  }
  return g;
};

export const PROCEDURAL_BUILDERS: Record<string, Builder> = {
  sofa_sectional_white: sofaSectionalWhite,
  table_coffee_low: tableCoffeeLow,
  planter_trough_hedge: planterTroughHedge,
  planter_tall_broadleaf: planterTallBroadleaf,
  lamp_floor_arc: lampFloorArc,
  lantern_black: lanternBlack,
  rug_outdoor: rugOutdoor,
};
