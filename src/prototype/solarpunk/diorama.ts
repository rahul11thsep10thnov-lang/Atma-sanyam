// A diorama: a round plinth of soil strata under a geodesic glass dome, with
// carved ponds, stone paths, bridges, rocks, grass, lanterns, sun shafts,
// pollen, lily pads and koi. The two worlds (Central Conservatory, Northern
// Arboretum) are this builder with different inputs.
import * as THREE from 'three';
import { GeoBuilder, V, V3, hex, jitter, mix, UP } from './geo';
import { PAL } from './plants';
import { caps, clock, glowTexture, heightTexture, makeGlassMaterial, makeMetalMaterial, makePlantMaterial, makeRockMaterial, noiseTexture, shaftTexture } from './materials';
import { Rand, clamp, fbm2, noise2, range, rng, smoothstep } from './rng';
import { bridge, buildDome, buildPlinth, buildTerrain, flagstones, lantern, resample, rock, solarTree } from './structures';
import { Water } from './water';

const TAU = Math.PI * 2;

export interface PondDef {
  x: number;
  z: number;
  r: number;
}

export interface DioramaCfg {
  seed: number;
  R: number;
  domeR: number;
  domeH: number;
  domeDetail: number;
  height: (x: number, z: number) => number;
  waterDist: (x: number, z: number) => number;
  waterY: number;
  hLo: number;
  hHi: number;
  paths: { line: V3[]; width: number }[];
  bridges: { a: V3; b: V3; width: number; arch: number }[];
  rocks: { x: number; z: number; size: number; squash?: number }[];
  rimRocks: number;
  lanterns: { x: number; z: number }[];
  centerpiece: boolean;
  grass: number;
  koiPonds: PondDef[];
  koi: number;
  lilies: number;
  sunDir: V3;
  noGrass?: (x: number, z: number) => boolean;
}

export class Diorama {
  readonly group = new THREE.Group();
  readonly water: Water;
  readonly hideInReflection: THREE.Object3D[] = [];
  readonly stats = { triangles: 0, meshes: 0 };
  private motes: THREE.Points;
  private moteBase: Float32Array;
  private koi: { mesh: THREE.Mesh; pond: PondDef; a: number; rad: number; speed: number }[] = [];
  private disposables: { dispose(): void }[] = [];
  readonly plantMat: THREE.MeshStandardMaterial;
  readonly lanternBulbs: THREE.Object3D[] = [];
  readonly cfg: DioramaCfg;
  /** Distance from (x,z) to the nearest path edge (negative on a path). */
  readonly pathEdge: (x: number, z: number) => number;

  constructor(cfg: DioramaCfg) {
    this.cfg = cfg;
    const r = rng(cfg.seed);
    const bump = noiseTexture(128, 6);
    this.disposables.push(bump);
    this.plantMat = makePlantMaterial();
    const rockMat = makeRockMaterial(bump, 0.88);
    const metalMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.36, metalness: caps.env ? 0.85 : 0.35 });

    // ---- path distance (terrain colouring and grass rejection) -----------------------------------
    const samples: { x: number; z: number; hw: number }[] = [];
    for (const p of cfg.paths) for (const s of resample(p.line, 0.5)) samples.push({ x: s.p.x, z: s.p.z, hw: p.width / 2 });
    this.pathEdge = (x, z) => {
      let best = 99;
      for (const s of samples) {
        const d = Math.hypot(s.x - x, s.z - z) - s.hw;
        if (d < best) best = d;
      }
      return best;
    };
    const pathEdge = this.pathEdge;

    // ---- terrain + plinth --------------------------------------------------------------------------
    const rim = cfg.R;
    const terrain = new THREE.Mesh(
      buildTerrain({
        R: rim,
        height: cfg.height,
        rings: 72,
        segs: 180,
        color: (x, z, h, slope) => {
          const n = fbm2(x * 0.45 + 11, z * 0.45, 3);
          const n2 = noise2(x * 3.1, z * 3.1);
          let c = mix(hex(0x3d7a35), hex(0x6fa844), n);
          c = mix(c, hex(0x93ab4c), smoothstep(0.6, 0.85, n2) * 0.3);
          c = mix(c, hex(0x2f6a30), smoothstep(0.45, 0.2, n) * 0.35);
          const pe = pathEdge(x, z);
          c = mix(c, hex(0x6a5238), smoothstep(0.55, 0.0, pe) * 0.85);
          const w = cfg.waterDist(x, z);
          c = mix(c, hex(0x4a4032), smoothstep(0.8, 0.0, w) * 0.9);
          if (h < cfg.waterY) c = mix(c, hex(0x24342f), smoothstep(0, 0.35, cfg.waterY - h));
          if (slope > 0.5) c = mix(c, hex(0x7a7468), Math.min(1, (slope - 0.5) * 1.5));
          return jitter(c, r, 0.035);
        },
      }),
      rockMat,
    );
    terrain.receiveShadow = true;
    terrain.name = 'terrain';
    this.group.add(terrain);
    const plinth = new THREE.Mesh(buildPlinth(rim, 0, cfg.R * 0.22, r), rockMat);
    plinth.receiveShadow = true;
    plinth.castShadow = true;
    this.group.add(plinth);

    // ---- stone: paths, bridges, rocks ----------------------------------------------------------------
    const stone = new GeoBuilder();
    for (const p of cfg.paths) flagstones(stone, r, p.line, p.width, cfg.height, 0.68);
    for (const br of cfg.bridges) bridge(stone, r, br.a, br.b, br.width, br.arch);
    for (const ro of cfg.rocks) rock(stone, r, V(ro.x, cfg.height(ro.x, ro.z), ro.z), ro.size, ro.squash);
    // boulders along the pond banks
    let placed = 0;
    for (let i = 0; i < 4000 && placed < cfg.rimRocks; i++) {
      const a = r() * TAU;
      const rr = Math.sqrt(r()) * (cfg.R - 1.5);
      const x = Math.cos(a) * rr;
      const z = Math.sin(a) * rr;
      const w = cfg.waterDist(x, z);
      if (w < -0.1 || w > 0.7 || pathEdge(x, z) < 0.4) continue;
      rock(stone, r, V(x, cfg.height(x, z) - 0.05, z), range(r, 0.22, 0.6), range(r, 0.55, 0.9));
      placed++;
    }
    const stoneMesh = new THREE.Mesh(stone.build({ wind: false }), rockMat);
    stoneMesh.castShadow = true;
    stoneMesh.receiveShadow = true;
    this.group.add(stoneMesh);
    this.stats.triangles += stone.triangleCount;

    // ---- lanterns and the solar tree ---------------------------------------------------------------------
    const metal = new GeoBuilder();
    const bulbs: V3[] = [];
    for (const l of cfg.lanterns) bulbs.push(lantern(metal, r, V(l.x, cfg.height(l.x, l.z), l.z), 1.75));
    if (cfg.centerpiece) {
      for (const g of solarTree(metal, r, V(0, cfg.height(0, 0), 0), 1)) bulbs.push(g);
    }
    const metalMesh = new THREE.Mesh(metal.build({ wind: false }), metalMat);
    metalMesh.castShadow = true;
    this.group.add(metalMesh);
    this.stats.triangles += metal.triangleCount;
    const halo = new THREE.Points(
      new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(bulbs.flatMap((b) => [b.x, b.y, b.z]), 3)),
      new THREE.PointsMaterial({ map: glowTexture(), color: 0xffd48a, size: 1.5, sizeAttenuation: true, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    halo.frustumCulled = false;
    halo.name = 'halo';
    this.group.add(halo);
    this.lanternBulbs.push(halo);
    this.hideInReflection.push(halo);
    // light pools on the ground
    const poolGeo = new THREE.PlaneGeometry(1, 1);
    poolGeo.rotateX(-Math.PI / 2);
    const poolMat = new THREE.MeshBasicMaterial({ map: glowTexture(), color: 0xffc66e, transparent: true, opacity: 0.32, depthWrite: false, blending: THREE.AdditiveBlending });
    const pools = new THREE.InstancedMesh(poolGeo, poolMat, Math.max(1, cfg.lanterns.length));
    const pm = new THREE.Matrix4();
    cfg.lanterns.forEach((l, i) => {
      pm.compose(V(l.x, cfg.height(l.x, l.z) + 0.05, l.z), new THREE.Quaternion(), V(4.2, 1, 4.2));
      pools.setMatrixAt(i, pm);
    });
    pools.renderOrder = 3;
    pools.frustumCulled = false;
    this.group.add(pools);
    this.hideInReflection.push(pools);
    this.disposables.push(poolGeo, poolMat);

    // ---- dome ---------------------------------------------------------------------------------------------
    const dome = buildDome(cfg.domeR, cfg.domeH, cfg.domeDetail, 0.28, r, 0);
    const frame = new THREE.Mesh(dome.frame, metalMat);
    frame.name = 'dome-frame';
    this.hideInReflection.push(frame);
    frame.castShadow = true;
    this.group.add(frame);
    this.stats.triangles += dome.frame.index!.count / 3;
    const glass = new THREE.Mesh(dome.glass, makeGlassMaterial(new THREE.Color(0xc4dff2), 0.06));
    glass.renderOrder = 4;
    glass.name = 'glass';
    this.group.add(glass);
    this.hideInReflection.push(glass);

    // ---- water --------------------------------------------------------------------------------------------
    const half = cfg.R + 1;
    this.water = new Water({ radius: cfg.R - 0.1, y: cfg.waterY, heightTex: heightTexture(cfg.height, half, 160, cfg.hLo, cfg.hHi), half, lo: cfg.hLo, hi: cfg.hHi, deep: 0x103c3c, shallow: 0x4d9a86, sunDir: cfg.sunDir });
    this.group.add(this.water.mesh);

    // ---- grass --------------------------------------------------------------------------------------------
    if (cfg.grass > 0) {
      const blade = new GeoBuilder();
      const g0 = hex(0x2a5e24);
      const g1 = hex(0x9ccb52);
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI + 0.3;
        const dx = Math.cos(a) * 0.022;
        const dz = Math.sin(a) * 0.022;
        const lean = V(Math.cos(a + 1.2) * 0.06, 0, Math.sin(a + 1.2) * 0.06);
        const v0 = blade.vert(-dx, 0, -dz, g0, 0.2);
        const v1 = blade.vert(dx, 0, dz, g0, 0.2);
        const v2 = blade.vert(lean.x, 0.26 + i * 0.03, lean.z, g1, 1);
        blade.tri(v0, v1, v2);
      }
      const bladeGeo = blade.build();
      const grass = new THREE.InstancedMesh(bladeGeo, this.plantMat, cfg.grass);
      const m = new THREE.Matrix4();
      const col = new THREE.Color();
      let n = 0;
      for (let tries = 0; tries < cfg.grass * 6 && n < cfg.grass; tries++) {
        const a = r() * TAU;
        const rr = Math.sqrt(r()) * (cfg.R - 0.7);
        const x = Math.cos(a) * rr;
        const z = Math.sin(a) * rr;
        if (cfg.waterDist(x, z) < 0.45 || pathEdge(x, z) < 0.2 || cfg.noGrass?.(x, z)) continue;
        const y = cfg.height(x, z);
        m.compose(V(x, y, z), new THREE.Quaternion().setFromAxisAngle(UP, r() * TAU), V(range(r, 0.7, 1.7), range(r, 0.6, 1.8), range(r, 0.7, 1.7)));
        grass.setMatrixAt(n, m);
        col.copy(mix(hex(0xb8d070), hex(0xffffff), r() * 0.6)).multiplyScalar(range(r, 0.75, 1.15));
        grass.setColorAt(n, col);
        n++;
      }
      grass.count = n;
      grass.receiveShadow = true;
      this.group.add(grass);
      this.hideInReflection.push(grass);
      this.stats.triangles += n * 3;
      this.disposables.push(bladeGeo);
    }

    // ---- lily pads (decorative) -----------------------------------------------------------------------------
    if (cfg.lilies > 0) {
      const lb = new GeoBuilder();
      let lp = 0;
      for (let i = 0; i < cfg.lilies * 30 && lp < cfg.lilies; i++) {
        const a = r() * TAU;
        const rr = Math.sqrt(r()) * (cfg.R - 1);
        const x = Math.cos(a) * rr;
        const z = Math.sin(a) * rr;
        if (cfg.waterDist(x, z) > -0.55) continue;
        const R0 = range(r, 0.16, 0.3);
        const notch = r() * TAU;
        lb.fan(V(x, cfg.waterY + 0.015, z), V(Math.cos(notch), 0, Math.sin(notch)), UP, (th) => R0 * (Math.abs(th - Math.PI) < 0.1 ? 0.2 : 1), hex(0x2d7a3c), hex(0x6cb458), { segs: 18, rings: 2, cup: 0.5 / R0, fl: 0.2 });
        if (r() < 0.32) {
          const pink = r() < 0.5;
          for (let q = 0; q < 8; q++) {
            const a2 = (q / 8) * TAU;
            lb.leafLite(V(x + 0.03, cfg.waterY + 0.03, z), V(Math.cos(a2) * 0.7, 0.55, Math.sin(a2) * 0.7).normalize(), 0.12, 0.06, pink ? hex(0xf2a6c0) : hex(0xf6f1e6), hex(0xffffff), 0.3, 0);
          }
        }
        lp++;
      }
      const lilyMesh = new THREE.Mesh(lb.build(), this.plantMat);
      lilyMesh.receiveShadow = true;
      this.group.add(lilyMesh);
      this.stats.triangles += lb.triangleCount;
    }

    // ---- sunlight shafts under the dome (additive, soft) ---------------------------------------------------
    const shafts = new THREE.Group();
    const shaftMat = new THREE.MeshBasicMaterial({ map: shaftTexture(), color: 0xffeebb, transparent: true, opacity: 0.13, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    const sd = cfg.sunDir.clone().normalize();
    for (let i = 0; i < 9; i++) {
      const a = r() * TAU;
      const rr = range(r, 0.25, 0.8) * cfg.domeR;
      const topY = Math.sqrt(Math.max(0.02, 1 - (rr / cfg.domeR) ** 2)) * cfg.domeH * 0.97;
      const top = V(Math.cos(a) * rr, topY, Math.sin(a) * rr);
      const len = topY / Math.max(0.3, sd.y);
      const bottom = new THREE.Vector3().copy(top).addScaledVector(sd, -len);
      const mid = new THREE.Vector3().addVectors(top, bottom).multiplyScalar(0.5);
      const w = range(r, 1.4, 3.2);
      for (const k of [0, 1]) {
        const q = new THREE.Mesh(new THREE.PlaneGeometry(w, len), shaftMat);
        q.position.copy(mid);
        q.quaternion.setFromUnitVectors(V(0, 1, 0), sd.clone().negate());
        q.rotateY(k * Math.PI / 2 + r());
        shafts.add(q);
      }
    }
    shafts.renderOrder = 3;
    this.group.add(shafts);
    this.hideInReflection.push(shafts);
    this.disposables.push(shaftMat);

    // ---- pollen / dust motes ----------------------------------------------------------------------------------
    const moteN = 260;
    this.moteBase = new Float32Array(moteN * 3);
    for (let i = 0; i < moteN; i++) {
      const a = r() * TAU;
      const rr = Math.sqrt(r()) * cfg.domeR * 0.9;
      const y = range(r, 0.6, cfg.domeH * 0.7);
      this.moteBase.set([Math.cos(a) * rr, y, Math.sin(a) * rr], i * 3);
    }
    this.motes = new THREE.Points(
      new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(this.moteBase.slice(), 3)),
      new THREE.PointsMaterial({ map: glowTexture(), color: 0xfff0c8, size: 0.16, sizeAttenuation: true, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    this.motes.frustumCulled = false;
    this.group.add(this.motes);
    this.hideInReflection.push(this.motes);

    // ---- koi ----------------------------------------------------------------------------------------------------
    if (cfg.koi > 0 && cfg.koiPonds.length) {
      const fish = this.koiGeometry(r);
      const fishMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.05 });
      this.disposables.push(fish, fishMat);
      for (let i = 0; i < cfg.koi; i++) {
        const pond = cfg.koiPonds[i % cfg.koiPonds.length]!;
        const mesh = new THREE.Mesh(fish, fishMat);
        mesh.scale.setScalar(range(r, 0.8, 1.25));
        this.koi.push({ mesh, pond, a: r() * TAU, rad: pond.r * range(r, 0.25, 0.7), speed: range(r, 0.18, 0.42) * (r() < 0.5 ? -1 : 1) });
        this.group.add(mesh);
      }
    }

    this.group.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) this.stats.meshes++;
    });
    this.stats.triangles = Math.round(this.stats.triangles);
  }

  private koiGeometry(r: Rand): THREE.BufferGeometry {
    const b = new GeoBuilder();
    const orange = hex(0xf0701c);
    const white = hex(0xf6f0e6);
    const red = hex(0xd02a1c);
    b.blob(V(0, 0, 0), 0.28, 0.07, 0.1, mix(orange, white, 0.15), mix(white, orange, 0.1), 10, 6, 0);
    b.blob(V(0.1, 0.045, 0), 0.12, 0.035, 0.07, red, orange, 8, 4, 0);
    b.blob(V(-0.12, 0.05, 0.01), 0.09, 0.03, 0.06, hex(0x1d1a1a), hex(0x2a2424), 7, 4, 0);
    // tail and fins
    b.leafLite(V(-0.26, 0, 0), V(-1, 0, 0), 0.2, 0.18, orange, mix(orange, white, 0.5), 0, 0);
    b.leafLite(V(0.0, 0.02, 0), V(0, 0.15, 1).normalize(), 0.12, 0.06, mix(orange, white, 0.4), white, 0, 0);
    b.leafLite(V(0.0, 0.02, 0), V(0, 0.15, -1).normalize(), 0.12, 0.06, mix(orange, white, 0.4), white, 0, 0);
    b.leafLite(V(-0.04, 0.06, 0), V(-0.8, 0.5, 0).normalize(), 0.12, 0.05, orange, mix(orange, white, 0.5), 0, 0);
    b.blob(V(0.26, 0.01, 0.04), 0.012, 0.012, 0.012, hex(0x111111), hex(0x111111), 4, 3, 0);
    b.blob(V(0.26, 0.01, -0.04), 0.012, 0.012, 0.012, hex(0x111111), hex(0x111111), 4, 3, 0);
    void r;
    return b.build({ wind: false });
  }

  update(dt: number, t: number) {
    const pos = this.motes.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      pos.setXYZ(i, this.moteBase[i * 3]! + Math.sin(t * 0.25 + i) * 0.5, this.moteBase[i * 3 + 1]! + Math.sin(t * 0.18 + i * 1.7) * 0.4, this.moteBase[i * 3 + 2]! + Math.cos(t * 0.22 + i * 0.7) * 0.5);
    }
    pos.needsUpdate = true;
    for (const k of this.koi) {
      k.a += k.speed * dt;
      const wob = Math.sin(t * 0.9 + k.rad * 5) * 0.25;
      const rad = k.rad * (1 + 0.15 * Math.sin(t * 0.4 + k.a));
      const x = k.pond.x + Math.cos(k.a) * rad;
      const z = k.pond.z + Math.sin(k.a) * rad;
      const heading = Math.atan2(-Math.cos(k.a) * Math.sign(k.speed), Math.sin(k.a) * Math.sign(k.speed));
      k.mesh.position.set(x, this.cfg.waterY - 0.2 + Math.sin(t * 0.7 + k.a * 3) * 0.03, z);
      k.mesh.rotation.y = heading + wob * 0.3;
    }
    clock.uTime.value = t;
  }

  dispose() {
    this.water.dispose();
    this.group.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh || (o as THREE.Points).isPoints) {
        m.geometry?.dispose();
        const mat = m.material as THREE.Material | THREE.Material[];
        (Array.isArray(mat) ? mat : [mat]).forEach((x) => x.dispose());
      }
    });
    this.disposables.forEach((d) => d.dispose());
  }
}

export { PAL, clamp };
