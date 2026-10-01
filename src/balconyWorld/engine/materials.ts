import * as THREE from 'three';

// PLACEHOLDER MATERIALS — procedural textures generated in code so the shell
// and stand-in props read as real surfaces (grout lines, plaster grain, wood
// plank seams) until PBR texture sets replace them (architecture doc,
// section K). Every material is created once and shared.

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

function terracottaTile(): THREE.DataTexture {
  return makeTexture(128, (x, y) => {
    const grout = x % 64 < 3 || y % 64 < 3;
    if (grout) return [168, 140, 118];
    const grain = (noise(x, y) - 0.5) * 18;
    const tileTone = ((Math.floor(x / 64) + Math.floor(y / 64)) % 2) * 6;
    return [196 + grain + tileTone, 110 + grain * 0.6 + tileTone, 78 + grain * 0.4];
  });
}

function plaster(): THREE.DataTexture {
  return makeTexture(64, (x, y) => {
    const g = (noise(x, y, 3) - 0.5) * 10;
    return [238 + g, 226 + g, 207 + g];
  });
}

function woodPlank(): THREE.DataTexture {
  return makeTexture(128, (x, y) => {
    const seam = y % 32 < 2;
    if (seam) return [96, 66, 44];
    const streak = Math.sin(x * 0.35 + Math.floor(y / 32) * 1.7) * 8 + (noise(x, y, 5) - 0.5) * 10;
    return [150 + streak, 104 + streak * 0.7, 70 + streak * 0.4];
  });
}

let cache: Record<string, THREE.Material> | null = null;

export function materials() {
  if (cache) return cache;
  const tile = terracottaTile();
  tile.repeat.set(5, 2.2);
  const wall = plaster();
  wall.repeat.set(4, 3);
  const wood = woodPlank();
  wood.repeat.set(3, 3);

  cache = {
    floorTile: new THREE.MeshStandardMaterial({ map: tile, roughness: 0.85, metalness: 0 }),
    roomFloor: new THREE.MeshStandardMaterial({ map: wood, roughness: 0.7, metalness: 0 }),
    plaster: new THREE.MeshStandardMaterial({ map: wall, roughness: 0.95, metalness: 0 }),
    plasterDark: new THREE.MeshStandardMaterial({ map: wall, color: 0xd9ccb6, roughness: 0.95, metalness: 0 }),
    ceiling: new THREE.MeshStandardMaterial({ color: 0xf1e8d8, roughness: 1, metalness: 0 }),
    darkMetal: new THREE.MeshStandardMaterial({ color: 0x3a3632, roughness: 0.55, metalness: 0.6 }),
    handrailWood: new THREE.MeshStandardMaterial({ color: 0x7a5236, roughness: 0.6, metalness: 0 }),
    teak: new THREE.MeshStandardMaterial({ color: 0x8a5a3a, roughness: 0.6, metalness: 0 }),
    rattan: new THREE.MeshStandardMaterial({ color: 0xb98c5a, roughness: 0.9, metalness: 0 }),
    linen: new THREE.MeshStandardMaterial({ color: 0xf1e6d3, roughness: 1, metalness: 0 }),
    cushionTerracotta: new THREE.MeshStandardMaterial({ color: 0xc1694a, roughness: 1, metalness: 0 }),
    brass: new THREE.MeshStandardMaterial({ color: 0xc9a04a, roughness: 0.35, metalness: 0.85 }),
    lampShade: new THREE.MeshStandardMaterial({ color: 0xf7e9cf, roughness: 1, metalness: 0, emissive: 0xffd79a, emissiveIntensity: 0.35, side: THREE.DoubleSide }),
    terracotta: new THREE.MeshStandardMaterial({ color: 0xb8623f, roughness: 0.9, metalness: 0 }),
    soil: new THREE.MeshStandardMaterial({ color: 0x4a3426, roughness: 1, metalness: 0 }),
    leaf: new THREE.MeshStandardMaterial({ color: 0x4f7a46, roughness: 0.8, metalness: 0, side: THREE.DoubleSide }),
    leafLight: new THREE.MeshStandardMaterial({ color: 0x6f9a5c, roughness: 0.8, metalness: 0, side: THREE.DoubleSide }),
    rug: new THREE.MeshStandardMaterial({ color: 0xcfa37a, roughness: 1, metalness: 0 }),
    rugBorder: new THREE.MeshStandardMaterial({ color: 0x9c5a3c, roughness: 1, metalness: 0 }),
    glassWarm: new THREE.MeshStandardMaterial({ color: 0xffe7b8, roughness: 0.2, metalness: 0, transparent: true, opacity: 0.55, emissive: 0xffc46a, emissiveIntensity: 0.6 }),
    city: new THREE.MeshLambertMaterial({ color: 0x8c6f62 }),
    cityFar: new THREE.MeshLambertMaterial({ color: 0xa48878 }),
    ground: new THREE.MeshLambertMaterial({ color: 0x75604e }),
  };
  return cache;
}

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
      data[i] = 20;
      data[i + 1] = 12;
      data[i + 2] = 8;
      data[i + 3] = Math.round(a * a * 190);
    }
  }
  blobTexture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  blobTexture.needsUpdate = true;
  return blobTexture;
}
