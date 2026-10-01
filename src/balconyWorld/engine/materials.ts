import * as THREE from 'three';

// PLACEHOLDER MATERIALS — procedural textures generated in code so the shell
// and stand-in props read as real surfaces (deck boards, render grain) until
// PBR texture sets replace them (architecture doc, section K). Every
// material is created once and shared. The palette follows the starter
// terrace reference: warm timber deck, white render, frameless glass, a dark
// flat overhang, white upholstery, charcoal planters and dusk-blue city.

function makeTexture(size: number, paint: (x: number, y: number) => [number, number, number]): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const [r, g, b] = paint(x, y);
      const i = (y * size + x) * 4;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}

// Deterministic hash noise so the look is identical on every launch.
function noise(x: number, y: number, seed = 1) {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed * 37.719) * 43758.5453;
  return n - Math.floor(n);
}

/** Decking boards running along V (the balcony's depth), four boards per
 * tile, each a slightly different tone, with staggered butt joints. */
function deckBoards(base: [number, number, number], seam: [number, number, number], seed: number): THREE.DataTexture {
  return makeTexture(128, (x, y) => {
    const board = Math.floor(x / 32);
    if (x % 32 < 2) return seam;
    const joint = (y + board * 41) % 128 < 2;
    if (joint) return seam;
    const tone = (noise(board, 0, seed) - 0.5) * 26;
    const grain = Math.sin(y * 0.31 + board * 2.1 + Math.sin(x * 0.5) * 0.8) * 7 + (noise(x, y, seed + 2) - 0.5) * 9;
    const v = tone + grain;
    return [base[0] + v, base[1] + v * 0.75, base[2] + v * 0.5];
  });
}

function render(): THREE.DataTexture {
  return makeTexture(64, (x, y) => {
    const g = (noise(x, y, 3) - 0.5) * 6;
    return [228 + g, 223 + g, 214 + g];
  });
}

let cache: Record<string, THREE.Material> | null = null;

export function materials() {
  if (cache) return cache;
  const deck = deckBoards([150, 104, 66], [68, 48, 32], 7);
  deck.repeat.set(9, 2.2);
  const oak = deckBoards([194, 164, 126], [128, 104, 78], 9);
  oak.repeat.set(9, 2.6);
  const wall = render();
  wall.repeat.set(4, 3);

  cache = {
    // shell
    deck: new THREE.MeshStandardMaterial({ map: deck, roughness: 0.78, metalness: 0 }),
    roomFloor: new THREE.MeshStandardMaterial({ map: oak, roughness: 0.6, metalness: 0 }),
    wall: new THREE.MeshStandardMaterial({ map: wall, roughness: 0.95, metalness: 0 }),
    wallDark: new THREE.MeshStandardMaterial({ map: wall, color: 0xcdc6bb, roughness: 0.95, metalness: 0 }),
    ceiling: new THREE.MeshStandardMaterial({ color: 0x2b2b2e, roughness: 0.9, metalness: 0 }),
    fascia: new THREE.MeshStandardMaterial({ color: 0x232326, roughness: 0.7, metalness: 0.2 }),
    darkMetal: new THREE.MeshStandardMaterial({ color: 0x2a2725, roughness: 0.45, metalness: 0.7 }),
    glass: new THREE.MeshStandardMaterial({
      color: 0xd4e6ec, roughness: 0.06, metalness: 0.05, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false,
    }),
    glassDoor: new THREE.MeshStandardMaterial({
      color: 0x6d7c86, roughness: 0.04, metalness: 0.2, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false,
    }),
    interiorDark: new THREE.MeshStandardMaterial({ color: 0x1a1c1f, roughness: 1, metalness: 0 }),
    downlight: new THREE.MeshStandardMaterial({ color: 0xfff4e0, roughness: 1, metalness: 0, emissive: 0xffe3b0, emissiveIntensity: 1.4 }),
    // props
    whiteFabric: new THREE.MeshStandardMaterial({ color: 0xf1eee8, roughness: 1, metalness: 0 }),
    cushionSand: new THREE.MeshStandardMaterial({ color: 0xd6c3a5, roughness: 1, metalness: 0 }),
    cushionGrey: new THREE.MeshStandardMaterial({ color: 0x8f969b, roughness: 1, metalness: 0 }),
    cushionOlive: new THREE.MeshStandardMaterial({ color: 0x6e7b5a, roughness: 1, metalness: 0 }),
    cushionCharcoal: new THREE.MeshStandardMaterial({ color: 0x3d3f42, roughness: 1, metalness: 0 }),
    walnut: new THREE.MeshStandardMaterial({ color: 0x4b3526, roughness: 0.55, metalness: 0 }),
    planterCharcoal: new THREE.MeshStandardMaterial({ color: 0x35363a, roughness: 0.85, metalness: 0.05 }),
    planterConcrete: new THREE.MeshStandardMaterial({ color: 0xa19b92, roughness: 0.95, metalness: 0 }),
    soil: new THREE.MeshStandardMaterial({ color: 0x3e2e22, roughness: 1, metalness: 0 }),
    foliage: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, metalness: 0 }),
    leaf: new THREE.MeshStandardMaterial({ color: 0x3e6b38, roughness: 0.8, metalness: 0, side: THREE.DoubleSide }),
    leafLight: new THREE.MeshStandardMaterial({ color: 0x6a9a4a, roughness: 0.8, metalness: 0, side: THREE.DoubleSide }),
    hedge: new THREE.MeshStandardMaterial({ color: 0x2f5a2d, roughness: 0.95, metalness: 0 }),
    leafWilted: new THREE.MeshStandardMaterial({ color: 0x8a7a3a, roughness: 0.9, metalness: 0, side: THREE.DoubleSide }),
    lampBlack: new THREE.MeshStandardMaterial({ color: 0x1f1f21, roughness: 0.4, metalness: 0.6 }),
    lampShade: new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 1, metalness: 0, emissive: 0xffd9a0, emissiveIntensity: 0.35, side: THREE.DoubleSide }),
    glassWarm: new THREE.MeshStandardMaterial({ color: 0xffe7b8, roughness: 0.2, metalness: 0, transparent: true, opacity: 0.55, emissive: 0xffc46a, emissiveIntensity: 0.6 }),
    rug: new THREE.MeshStandardMaterial({ color: 0xcdc8bf, roughness: 1, metalness: 0 }),
    rugBorder: new THREE.MeshStandardMaterial({ color: 0x8f8a82, roughness: 1, metalness: 0 }),
    // the world beyond
    city: new THREE.MeshLambertMaterial({ color: 0x4b5569 }),
    cityFar: new THREE.MeshLambertMaterial({ color: 0x7d87a0 }),
    ground: new THREE.MeshLambertMaterial({ color: 0x4e5566 }),
  };
  return cache;
}

/** Shades of green for instanced foliage (hedges, the living wall). */
export const FOLIAGE_GREENS = [0x2f5a2d, 0x3e6b38, 0x4f7f3f, 0x6a9a4a, 0x587a2f].map((c) => new THREE.Color(c));

/** A soft radial alpha disc — the cheap contact shadow every floor object
 * sits on when the real shadow map is off (LOW/MEDIUM profiles). */
let blobTexture: THREE.DataTexture | null = null;
export function blobShadowTexture(): THREE.DataTexture {
  if (blobTexture) return blobTexture;
  const size = 64;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x + 0.5) / size - 0.5;
      const dy = (y + 0.5) / size - 0.5;
      const d = Math.sqrt(dx * dx + dy * dy) * 2;
      const a = Math.max(0, 1 - d);
      const i = (y * size + x) * 4;
      data[i] = 14;
      data[i + 1] = 12;
      data[i + 2] = 12;
      data[i + 3] = Math.round(a * a * 180);
    }
  }
  blobTexture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  blobTexture.needsUpdate = true;
  return blobTexture;
}

/** A clump of instanced leaf-ellipsoids filling a box — one draw call for a
 * whole hedge or living wall. `rand` must be deterministic per caller. */
export function foliageClump(
  count: number,
  size: [number, number, number],
  radius: [number, number],
  rand: () => number,
): THREE.InstancedMesh {
  const geo = new THREE.SphereGeometry(1, 7, 5);
  const mesh = new THREE.InstancedMesh(geo, materials().foliage, count);
  const m = new THREE.Matrix4();
  const pos = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const scl = new THREE.Vector3();
  const euler = new THREE.Euler();
  for (let i = 0; i < count; i++) {
    pos.set((rand() - 0.5) * size[0], rand() * size[1], (rand() - 0.5) * size[2]);
    const r = radius[0] + rand() * (radius[1] - radius[0]);
    scl.set(r * (1 + rand() * 0.5), r * (0.65 + rand() * 0.3), r * (1 + rand() * 0.5));
    euler.set(rand() * 0.8 - 0.4, rand() * Math.PI, rand() * 0.6 - 0.3);
    quat.setFromEuler(euler);
    m.compose(pos, quat, scl);
    mesh.setMatrixAt(i, m);
    mesh.setColorAt(i, FOLIAGE_GREENS[Math.floor(rand() * FOLIAGE_GREENS.length)]);
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}
