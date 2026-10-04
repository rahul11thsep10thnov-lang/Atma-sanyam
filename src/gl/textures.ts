// Textures for the three.js scenes. On the web three's own loader reads
// the bundled image; on a phone expo-gl uploads an Expo asset straight
// into the texture (the same technique expo-three uses), so no DOM image
// is needed. Textures are shared by module id and reference counted.
import { Platform } from 'react-native';
import { Asset } from 'expo-asset';
import * as THREE from 'three';

type Key = number | string;
const cache = new Map<Key, Promise<THREE.Texture>>();

interface AssetLike {
  localUri?: string | null;
  uri: string;
  width?: number | null;
  height?: number | null;
}

async function fromUri(uri: string, width?: number, height?: number): Promise<THREE.Texture> {
  if (Platform.OS === 'web') {
    return new Promise((resolve, reject) => {
      new THREE.TextureLoader().load(uri, (t) => resolve(t), undefined, reject);
    });
  }
  const texture = new THREE.Texture();
  // expo-gl reads { localUri } objects passed to texImage2D
  const asset: AssetLike = { uri, localUri: uri, width: width ?? null, height: height ?? null };
  (texture as unknown as { image: unknown }).image = { data: asset, width: width ?? 1024, height: height ?? 1024 };
  (texture as unknown as { isDataTexture: boolean }).isDataTexture = true;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function finish(t: THREE.Texture, srgb = true): THREE.Texture {
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.ClampToEdgeWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  t.generateMipmaps = false;
  t.minFilter = THREE.LinearFilter;
  return t;
}

/** A bundled image (require('…webp')). */
export function loadModuleTexture(moduleId: number, srgb = true): Promise<THREE.Texture> {
  const hit = cache.get(moduleId);
  if (hit) return hit;
  const p = (async () => {
    const asset = Asset.fromModule(moduleId);
    await asset.downloadAsync();
    const uri = Platform.OS === 'web' ? asset.uri : asset.localUri ?? asset.uri;
    return finish(await fromUri(uri, asset.width ?? undefined, asset.height ?? undefined), srgb);
  })();
  cache.set(moduleId, p);
  return p;
}

/** A picture on disk or the network (an artwork, a user's photo). */
export function loadUriTexture(uri: string): Promise<THREE.Texture> {
  const hit = cache.get(uri);
  if (hit) return hit;
  const p = (async () => {
    if (Platform.OS === 'web') return finish(await fromUri(uri));
    const asset = Asset.fromURI(uri);
    try {
      await asset.downloadAsync();
    } catch {
      // local files need no download
    }
    return finish(await fromUri(asset.localUri ?? uri, asset.width ?? undefined, asset.height ?? undefined));
  })();
  cache.set(uri, p);
  return p;
}

/** A tiling texture (grass, paving, marble). */
export async function loadTile(moduleId: number, repeat: number): Promise<THREE.Texture> {
  const t = (await loadModuleTexture(moduleId)).clone();
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.needsUpdate = true;
  return t;
}

/** A soft round shadow / glow, built in memory: alpha falls off from the centre. */
export function radialTexture(size = 64, inner = 0.15, power = 1.6): THREE.Texture {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x + 0.5) / size - 0.5;
      const dy = (y + 0.5) / size - 0.5;
      const d = Math.min(1, Math.hypot(dx, dy) * 2);
      const a = d < inner ? 1 : Math.pow(1 - (d - inner) / (1 - inner), power);
      const i = (y * size + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = 255;
      data[i + 3] = Math.round(Math.max(0, a) * 255);
    }
  }
  const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  t.needsUpdate = true;
  t.minFilter = THREE.LinearFilter;
  t.magFilter = THREE.LinearFilter;
  return t;
}

/** A small value-noise texture for plaster, marble veins and gradients. */
export function noiseTexture(size = 128, scale = 6, seed = 1, contrast = 0.35, base = 0.78): THREE.Texture {
  const rand = (x: number, y: number) => {
    const s = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
    return s - Math.floor(s);
  };
  const smooth = (x: number, y: number) => {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const fx = x - x0;
    const fy = y - y0;
    const u = fx * fx * (3 - 2 * fx);
    const v = fy * fy * (3 - 2 * fy);
    const a = rand(x0, y0);
    const b = rand(x0 + 1, y0);
    const c = rand(x0, y0 + 1);
    const d = rand(x0 + 1, y0 + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let n = 0;
      let amp = 1;
      let f = scale;
      for (let o = 0; o < 4; o++) {
        n += smooth((x / size) * f, (y / size) * f) * amp;
        amp *= 0.5;
        f *= 2;
      }
      n /= 1.875;
      const v = Math.round(Math.min(255, Math.max(0, (base + (n - 0.5) * contrast) * 255)));
      const i = (y * size + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = v;
      data[i + 3] = 255;
    }
  }
  const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.needsUpdate = true;
  t.minFilter = THREE.LinearFilter;
  t.magFilter = THREE.LinearFilter;
  return t;
}
