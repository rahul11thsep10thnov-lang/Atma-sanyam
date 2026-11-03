// A tiny geometry builder for procedural vegetation and scenery. Everything a
// specimen is made of (stems, leaves, petals, bark) is merged into ONE
// BufferGeometry with per-vertex colour, so a plant costs one draw call and
// needs no textures. Normals are computed at the end; a wind weight per
// vertex (`aWind`) lets one shared shader sway every plant.
import * as THREE from 'three';
import type { Rand } from './rng';

export type V3 = THREE.Vector3;
export const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export const UP = new THREE.Vector3(0, 1, 0);

/** sRGB hex → a linear colour (three converts on construction). */
export const hex = (h: number) => new THREE.Color(h);
export const mix = (a: THREE.Color, b: THREE.Color, t: number) => new THREE.Color().copy(a).lerp(b, t);
export const lerpColor = mix;
export const tint = (c: THREE.Color, k: number) => new THREE.Color(Math.min(1, c.r * k), Math.min(1, c.g * k), Math.min(1, c.b * k));
export function jitter(c: THREE.Color, r: Rand, amt: number): THREE.Color {
  const k = 1 + (r() - 0.5) * 2 * amt;
  const g = 1 + (r() - 0.5) * amt;
  return new THREE.Color(Math.min(1, c.r * k), Math.min(1, c.g * k * g), Math.min(1, c.b * k));
}

/** A frame for a shape growing along `a`: s is sideways, n the face normal. */
export function frame(a: V3, upHint: V3 = UP): { s: V3; n: V3 } {
  const s = new THREE.Vector3().crossVectors(a, upHint);
  if (s.lengthSq() < 1e-8) s.set(1, 0, 0).cross(a);
  s.normalize();
  const n = new THREE.Vector3().crossVectors(s, a).normalize();
  return { s, n };
}

/** [t along the blade, half-width factor] rows, base → tip. */
export type Profile = number[][];
export const PROFILE = {
  oval: [[0, 0.08], [0.22, 0.72], [0.5, 1], [0.8, 0.62], [1, 0]] as Profile,
  lance: [[0, 0.06], [0.25, 0.7], [0.55, 0.85], [0.85, 0.45], [1, 0]] as Profile,
  strap: [[0, 0.5], [0.2, 0.8], [0.7, 0.8], [0.92, 0.45], [1, 0]] as Profile,
  heart: [[0, 0.0], [0.08, 0.7], [0.3, 1], [0.6, 0.78], [0.85, 0.3], [1, 0]] as Profile,
  peepal: [[0, 0.0], [0.1, 0.72], [0.34, 1], [0.58, 0.72], [0.75, 0.32], [0.88, 0.14], [1, 0]] as Profile,
  petal: [[0, 0.18], [0.28, 0.78], [0.62, 1], [0.9, 0.62], [1, 0.1]] as Profile,
  pointed: [[0, 0.22], [0.3, 0.8], [0.62, 0.74], [0.88, 0.34], [1, 0]] as Profile,
  tri: [[0, 0.1], [0.5, 1], [1, 0]] as Profile,
};

export interface BladeOpts {
  p: V3;
  /** Direction the blade grows in. */
  a: V3;
  up?: V3;
  len: number;
  wid: number;
  profile?: Profile;
  /** Edges raised relative to the midrib (cupped) when > 0. */
  fold?: number;
  droop?: number;
  /** Bend along the face normal (petals cup upwards). */
  curl?: number;
  c0: THREE.Color;
  c1: THREE.Color;
  /** Flutter weight for the wind shader: 0 wood, 1 leaf. */
  fl?: number;
}

export class GeoBuilder {
  /** 1 = full detail. Lower values keep that share of the leaves, drawn larger (level of detail). */
  detail = 1;
  private leafCount = 0;
  private pos: number[] = [];
  private col: number[] = [];
  private fl: number[] = [];
  private idx: number[] = [];

  get vertexCount() {
    return this.pos.length / 3;
  }
  get triangleCount() {
    return this.idx.length / 3;
  }

  vert(x: number, y: number, z: number, c: THREE.Color, f = 0): number {
    const i = this.pos.length / 3;
    this.pos.push(x, y, z);
    this.col.push(c.r, c.g, c.b);
    this.fl.push(f);
    return i;
  }
  tri(a: number, b: number, c: number) {
    this.idx.push(a, b, c);
  }
  /** A triangle wound so its face normal points towards h. */
  triH(a: number, b: number, c: number, h: V3) {
    const p = this.pos;
    const ux = p[b * 3]! - p[a * 3]!;
    const uy = p[b * 3 + 1]! - p[a * 3 + 1]!;
    const uz = p[b * 3 + 2]! - p[a * 3 + 2]!;
    const vx = p[c * 3]! - p[a * 3]!;
    const vy = p[c * 3 + 1]! - p[a * 3 + 1]!;
    const vz = p[c * 3 + 2]! - p[a * 3 + 2]!;
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    if (nx * h.x + ny * h.y + nz * h.z < 0) this.idx.push(a, c, b);
    else this.idx.push(a, b, c);
  }

  /** A leaf or petal: rows of left/mid/right vertices along a curved axis. */
  blade(o0: BladeOpts): void {
    if (this.thin(o0.fl ?? 1)) return;
    const k = (o0.fl ?? 1) >= 1 && this.detail < 1 ? 1 / Math.sqrt(this.detail) : 1;
    const o = k === 1 ? o0 : { ...o0, len: o0.len * k, wid: o0.wid * k };
    const profile = o.profile ?? PROFILE.oval;
    const { s, n } = frame(o.a, o.up ?? UP);
    const fold = o.fold ?? 0.12;
    const curl = o.curl ?? 0;
    const droop = o.droop ?? 0;
    const fl = o.fl ?? 1;
    const rows: number[][] = [];
    for (const [t, w] of profile) {
      const hw = (w! * o.wid) / 2;
      const along = o.len * t!;
      const bend = curl * o.len * t! * t!;
      const cx = o.p.x + o.a.x * along + n.x * bend;
      const cy = o.p.y + o.a.y * along + n.y * bend - droop * o.len * t! * t!;
      const cz = o.p.z + o.a.z * along + n.z * bend;
      const f = fold * hw;
      const c = mix(o.c0, o.c1, Math.pow(t!, 0.85));
      const rib = tint(c, 1.14);
      const L = this.vert(cx + s.x * hw + n.x * f, cy + s.y * hw + n.y * f, cz + s.z * hw + n.z * f, c, fl);
      const M = this.vert(cx, cy, cz, rib, fl);
      const R = this.vert(cx - s.x * hw + n.x * f, cy - s.y * hw + n.y * f, cz - s.z * hw + n.z * f, c, fl);
      rows.push([L, M, R]);
    }
    for (let i = 0; i < rows.length - 1; i++) {
      const [L0, M0, R0] = rows[i]!;
      const [L1, M1, R1] = rows[i + 1]!;
      this.triH(L0!, M0!, L1!, n);
      this.triH(M0!, M1!, L1!, n);
      this.triH(M0!, R0!, M1!, n);
      this.triH(R0!, R1!, M1!, n);
    }
  }

  /** True if this leaf is dropped at the current level of detail (leaves only, never petals). */
  private thin(fl: number): boolean {
    if (this.detail >= 1 || fl < 1) return false;
    this.leafCount++;
    return (this.leafCount * 0.6180339887) % 1 > this.detail;
  }

  /** The cheapest leaf: a folded diamond of 4 triangles, for canopies. */
  leafLite(p: V3, a: V3, len0: number, wid0: number, c0: THREE.Color, c1: THREE.Color, fl = 1, droop = 0.12): void {
    if (this.thin(fl)) return;
    const k = fl >= 1 && this.detail < 1 ? 1 / Math.sqrt(this.detail) : 1;
    const len = len0 * k;
    const wid = wid0 * k;
    const { s, n } = frame(a);
    const B = this.vert(p.x, p.y, p.z, c0, fl);
    const mx = p.x + a.x * len * 0.5 + n.x * wid * 0.12;
    const my = p.y + a.y * len * 0.5 + n.y * wid * 0.12;
    const mz = p.z + a.z * len * 0.5 + n.z * wid * 0.12;
    const mc = mix(c0, c1, 0.5);
    const L = this.vert(p.x + a.x * len * 0.42 + s.x * wid * 0.5, p.y + a.y * len * 0.42 + s.y * wid * 0.5, p.z + a.z * len * 0.42 + s.z * wid * 0.5, mc, fl);
    const R = this.vert(p.x + a.x * len * 0.42 - s.x * wid * 0.5, p.y + a.y * len * 0.42 - s.y * wid * 0.5, p.z + a.z * len * 0.42 - s.z * wid * 0.5, mc, fl);
    const M = this.vert(mx, my, mz, tint(mc, 1.12), fl);
    const T = this.vert(p.x + a.x * len * 0.98, p.y + a.y * len * 0.98 - droop * len, p.z + a.z * len * 0.98, c1, fl);
    this.triH(B, L, M, n);
    this.triH(B, M, R, n);
    this.triH(L, T, M, n);
    this.triH(M, T, R, n);
  }

  /** A smooth tube along a path with a radius profile; optional per-vertex colour. */
  tube(
    path: V3[],
    radius: (t: number) => number,
    radial: number,
    c0: THREE.Color,
    c1: THREE.Color,
    fl = 0,
    opt: { noise?: Rand; rough?: number; colorFn?: (t: number, th: number) => THREE.Color } = {},
  ): void {
    const n = path.length;
    if (n < 2) return;
    const T = new THREE.Vector3();
    const N = new THREE.Vector3();
    const B = new THREE.Vector3();
    T.subVectors(path[1]!, path[0]!).normalize();
    N.crossVectors(T, Math.abs(T.y) > 0.95 ? V(1, 0, 0) : UP).normalize();
    const base = this.vertexCount;
    for (let i = 0; i < n; i++) {
      const a = path[Math.max(0, i - 1)]!;
      const b = path[Math.min(n - 1, i + 1)]!;
      T.subVectors(b, a).normalize();
      N.addScaledVector(T, -N.dot(T)).normalize();
      B.crossVectors(T, N).normalize();
      const t = i / (n - 1);
      const r = Math.max(0.0005, radius(t));
      for (let j = 0; j < radial; j++) {
        const th = (j / radial) * Math.PI * 2;
        const rr = opt.noise && opt.rough ? r * (1 + (opt.noise() - 0.5) * opt.rough) : r;
        const c = opt.colorFn ? opt.colorFn(t, th) : mix(c0, c1, t);
        this.vert(
          path[i]!.x + (Math.cos(th) * N.x + Math.sin(th) * B.x) * rr,
          path[i]!.y + (Math.cos(th) * N.y + Math.sin(th) * B.y) * rr,
          path[i]!.z + (Math.cos(th) * N.z + Math.sin(th) * B.z) * rr,
          c,
          fl,
        );
      }
    }
    for (let i = 0; i < n - 1; i++) {
      for (let j = 0; j < radial; j++) {
        const j1 = (j + 1) % radial;
        const a0 = base + i * radial + j;
        const a1 = base + i * radial + j1;
        const b0 = base + (i + 1) * radial + j;
        const b1 = base + (i + 1) * radial + j1;
        this.tri(a0, a1, b0);
        this.tri(a1, b1, b0);
      }
    }
  }

  /** An ellipsoid: blossoms, fruit, buds, moss cushions. */
  blob(c: V3, rx: number, ry: number, rz: number, cTop: THREE.Color, cBottom: THREE.Color, seg = 8, rings = 5, fl = 0.3, noise?: Rand, rough = 0): void {
    const base = this.vertexCount;
    for (let i = 0; i <= rings; i++) {
      const v = i / rings;
      const phi = v * Math.PI;
      const y = Math.cos(phi);
      const rr = Math.sin(phi);
      for (let j = 0; j < seg; j++) {
        const th = (j / seg) * Math.PI * 2;
        const k = noise && rough ? 1 + (noise() - 0.5) * rough : 1;
        this.vert(c.x + Math.cos(th) * rr * rx * k, c.y + y * ry * k, c.z + Math.sin(th) * rr * rz * k, mix(cBottom, cTop, (y + 1) / 2), fl);
      }
    }
    for (let i = 0; i < rings; i++) {
      for (let j = 0; j < seg; j++) {
        const j1 = (j + 1) % seg;
        const a0 = base + i * seg + j;
        const a1 = base + i * seg + j1;
        const b0 = base + (i + 1) * seg + j;
        const b1 = base + (i + 1) * seg + j1;
        this.tri(a0, b0, a1);
        this.tri(a1, b0, b1);
      }
    }
  }

  /** A radial leaf (lily pad, monstera, sunflower head): a polar grid with a radius function. */
  fan(
    center: V3,
    forward: V3,
    up: V3,
    radius: (theta: number) => number,
    c0: THREE.Color,
    c1: THREE.Color,
    opts: { segs?: number; rings?: number; cup?: number; droopEdge?: number; fl?: number; colorFn?: (ring: number, theta: number) => THREE.Color } = {},
  ): void {
    const segs = opts.segs ?? 28;
    const rings = opts.rings ?? 3;
    const cup = opts.cup ?? 0;
    const f = frame(forward, up);
    const base = this.vertexCount;
    const centre = this.vert(center.x, center.y, center.z, c0, opts.fl ?? 1);
    for (let i = 1; i <= rings; i++) {
      const u = i / rings;
      for (let j = 0; j < segs; j++) {
        const th = (j / segs) * Math.PI * 2;
        const r = radius(th) * u;
        const x = Math.cos(th) * r; // along forward
        const y = Math.sin(th) * r; // along side
        const lift = cup * r * r;
        const px = center.x + forward.x * x + f.s.x * y + f.n.x * lift;
        const py = center.y + forward.y * x + f.s.y * y + f.n.y * lift - (opts.droopEdge ?? 0) * r * r;
        const pz = center.z + forward.z * x + f.s.z * y + f.n.z * lift;
        this.vert(px, py, pz, opts.colorFn ? opts.colorFn(u, th) : mix(c0, c1, u), opts.fl ?? 1);
      }
    }
    const ringStart = (i: number) => base + 1 + (i - 1) * segs;
    for (let j = 0; j < segs; j++) {
      const j1 = (j + 1) % segs;
      this.triH(centre, ringStart(1) + j, ringStart(1) + j1, f.n);
    }
    for (let i = 1; i < rings; i++) {
      for (let j = 0; j < segs; j++) {
        const j1 = (j + 1) % segs;
        const a0 = ringStart(i) + j;
        const a1 = ringStart(i) + j1;
        const b0 = ringStart(i + 1) + j;
        const b1 = ringStart(i + 1) + j1;
        this.triH(a0, b0, a1, f.n);
        this.triH(a1, b0, b1, f.n);
      }
    }
  }

  /** Merge an existing three geometry, colouring each vertex with colorFn. */
  addGeometry(g: THREE.BufferGeometry, m: THREE.Matrix4, colorFn: (p: V3, n: V3) => THREE.Color, fl = 0): void {
    const src = g.index ? g : g.clone();
    const posA = src.getAttribute('position');
    const norA = src.getAttribute('normal');
    const base = this.vertexCount;
    const p = new THREE.Vector3();
    const nrm = new THREE.Vector3();
    const nm = new THREE.Matrix3().getNormalMatrix(m);
    for (let i = 0; i < posA.count; i++) {
      p.fromBufferAttribute(posA, i).applyMatrix4(m);
      nrm.fromBufferAttribute(norA, i).applyMatrix3(nm).normalize();
      const c = colorFn(p, nrm);
      this.vert(p.x, p.y, p.z, c, fl);
    }
    if (g.index) for (let i = 0; i < g.index.count; i += 3) this.tri(base + g.index.getX(i), base + g.index.getX(i + 1), base + g.index.getX(i + 2));
    else for (let i = 0; i < posA.count; i += 3) this.tri(base + i, base + i + 1, base + i + 2);
  }

  /** Finish: normals, bounds, and the wind weight (more sway higher up and on leaves). */
  build(opts: { wind?: boolean; flat?: boolean } = {}): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setIndex(this.idx);
    g.computeVertexNormals();
    g.computeBoundingBox();
    g.computeBoundingSphere();
    if (opts.wind !== false) {
      const bb = g.boundingBox!;
      const H = Math.max(0.15, bb.max.y - bb.min.y);
      const amp = Math.min(0.1, Math.max(0.01, 0.02 * H));
      const wind = new Float32Array(this.fl.length);
      for (let i = 0; i < wind.length; i++) {
        const w = Math.pow(Math.max(0, (this.pos[i * 3 + 1]! - bb.min.y) / H), 1.6);
        wind[i] = w * amp * (0.5 + 0.9 * this.fl[i]!);
      }
      g.setAttribute('aWind', new THREE.BufferAttribute(wind, 1));
    }
    return g;
  }
}

// ---- paths ---------------------------------------------------------------------

export function bezier(p0: V3, p1: V3, p2: V3, p3: V3, n: number): V3[] {
  const out: V3[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    out.push(
      new THREE.Vector3(
        u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
        u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
        u * u * u * p0.z + 3 * u * u * t * p1.z + 3 * u * t * t * p2.z + t * t * t * p3.z,
      ),
    );
  }
  return out;
}

export function polar(angle: number, elevation: number): V3 {
  return V(Math.cos(angle) * Math.cos(elevation), Math.sin(elevation), Math.sin(angle) * Math.cos(elevation));
}
