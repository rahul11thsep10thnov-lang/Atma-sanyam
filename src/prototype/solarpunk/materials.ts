// Materials and small procedural textures for the prototype. Everything is
// built from MeshStandardMaterial (PBR roughness/metalness) plus a few shader
// patches, and none of it needs an HDR environment map or float render
// targets, because expo-gl exposes only the extensions a phone reports.
import * as THREE from 'three';
import { fbm2, noise2 } from './rng';

/** What this device's GL context can do; set once by the engine before scenes are built. */
export const caps = { env: false };

/** One shared clock: every swaying material reads it. */
export const clock = { uTime: { value: 0 } };

// ---- vegetation: wind sway + leaf translucency -------------------------------------------------

export function makePlantMaterial(): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0, side: THREE.DoubleSide });
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = clock.uTime;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aWind;\nuniform float uTime;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        #ifdef USE_INSTANCING
          float ph = instanceMatrix[3].x * 0.7 + instanceMatrix[3].z * 0.9;
        #else
          float ph = modelMatrix[3].x * 0.7 + modelMatrix[3].z * 0.9;
        #endif
        transformed.x += sin(uTime * 1.35 + ph + position.y * 0.9 + position.z * 2.1) * aWind;
        transformed.z += cos(uTime * 1.1 + ph * 1.3 + position.y * 0.7 + position.x * 1.7) * aWind * 0.7;`,
      );
    // light shining through a leaf shows on its far side
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <lights_fragment_end>',
      `#include <lights_fragment_end>
      #if NUM_DIR_LIGHTS > 0
        {
          float tr = max(0.0, -dot(normal, directionalLights[0].direction));
          reflectedLight.directDiffuse += directionalLights[0].color * diffuseColor.rgb * tr * 0.45;
        }
      #endif`,
    );
  };
  m.customProgramCacheKey = () => 'sp-plant-v2';
  return m;
}

/** Stone, soil and bark: plain PBR with vertex colour and a little bump. */
export function makeRockMaterial(bump?: THREE.Texture, rough = 0.9): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ vertexColors: true, roughness: rough, metalness: 0.0, bumpMap: bump ?? null, bumpScale: bump ? 1.6 : 0 });
}

export function makeMetalMaterial(color: number, rough = 0.38, metal = 0.85): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
}

// ---- glass -------------------------------------------------------------------------------------

/** Transparent glass with a Fresnel sky reflection, no environment map needed. */
export function makeGlassMaterial(sky: THREE.Color, opacity = 0.1): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ color: 0xd8f2ea, roughness: 0.03, metalness: 0, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false });
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uSky = { value: sky };
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uSky;')
      .replace(
        '#include <opaque_fragment>',
        `float fres = pow(1.0 - saturate(abs(dot(normalize(vViewPosition), normal))), 3.0);
        outgoingLight += uSky * fres * 0.95;
        diffuseColor.a = clamp(diffuseColor.a + fres * 0.6, 0.0, 0.85);
        #include <opaque_fragment>`,
      );
  };
  m.customProgramCacheKey = () => 'sp-glass-v1';
  return m;
}

// ---- procedural textures -------------------------------------------------------------------------

/** Tileable-ish value-noise bump map. */
export function noiseTexture(size = 128, scale = 6): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x / size) * scale;
      const v = (y / size) * scale;
      // wrap so the texture tiles
      const n = fbm2(u, v, 4) * 0.6 + noise2(u * 3, v * 3) * 0.4;
      const c = Math.floor(Math.min(1, Math.max(0, n)) * 255);
      const i = (y * size + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = c;
      data[i + 3] = 255;
    }
  }
  const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.needsUpdate = true;
  return t;
}

/** A soft round glow, for light pools, lantern halos and sun shafts. */
export function glowTexture(size = 64): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x + 0.5) / size - 0.5;
      const dy = (y + 0.5) / size - 0.5;
      const d = Math.sqrt(dx * dx + dy * dy) * 2;
      const a = Math.pow(Math.max(0, 1 - d), 2.2);
      const i = (y * size + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = 255;
      data[i + 3] = Math.floor(a * 255);
    }
  }
  const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
}

/** A vertical fade (bright in the middle, soft top and bottom) for light shafts. */
export function shaftTexture(): THREE.DataTexture {
  const w = 16;
  const h = 64;
  const data = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const u = Math.abs((x + 0.5) / w - 0.5) * 2;
      const v = (y + 0.5) / h;
      const a = Math.pow(Math.max(0, 1 - u), 1.6) * Math.pow(Math.sin(v * Math.PI), 0.8);
      const i = (y * w + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = 255;
      data[i + 3] = Math.floor(a * 255);
    }
  }
  const t = new THREE.DataTexture(data, w, h, THREE.RGBAFormat);
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
}

/** The ground height over a square, as a texture the water shader reads to tint by depth. */
export function heightTexture(height: (x: number, z: number) => number, half: number, size = 128, lo = -1, hi = 1): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      const x = ((i + 0.5) / size - 0.5) * 2 * half;
      const z = ((j + 0.5) / size - 0.5) * 2 * half;
      const v = Math.floor(Math.min(1, Math.max(0, (height(x, z) - lo) / (hi - lo))) * 255);
      const k = (j * size + i) * 4;
      data[k] = data[k + 1] = data[k + 2] = v;
      data[k + 3] = 255;
    }
  }
  const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
}

/** Vertical gradient sky dome (inside-out sphere), no texture. */
export function skyDome(top: number, horizon: number, ground: number, sunDir: THREE.Vector3): THREE.Mesh {
  const g = new THREE.SphereGeometry(520, 24, 16);
  const pos = g.getAttribute('position');
  const col = new Float32Array(pos.count * 3);
  const cT = new THREE.Color(top);
  const cH = new THREE.Color(horizon);
  const cG = new THREE.Color(ground);
  const sun = new THREE.Color(0xfff2d0);
  const c = new THREE.Color();
  const d = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    d.fromBufferAttribute(pos, i).normalize();
    const y = d.y;
    if (y >= 0) c.copy(cH).lerp(cT, Math.pow(y, 0.6));
    else c.copy(cH).lerp(cG, Math.min(1, -y * 3));
    c.lerp(sun, Math.pow(Math.max(0, d.dot(sunDir)), 8) * 0.5);
    col[i * 3] = c.r;
    col[i * 3 + 1] = c.g;
    col[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
  m.renderOrder = -10;
  m.frustumCulled = false;
  return m;
}
