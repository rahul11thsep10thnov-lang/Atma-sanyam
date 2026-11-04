// Small life under the glass: butterflies that wander between the beds and
// petals that drift down from the flowering trees. Both are single draw calls
// (one instanced mesh, one point cloud) and stop when time stops (reduce motion).
import * as THREE from 'three';
import { rng } from './rng';

const TAU = Math.PI * 2;

export class Wildlife {
  readonly group = new THREE.Group();
  private flies: THREE.InstancedMesh;
  private fly: { cx: number; cz: number; r: number; h: number; ph: number; sp: number }[] = [];
  private petals: THREE.Points;
  private petalBase: Float32Array;
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private s = new THREE.Vector3();
  private p = new THREE.Vector3();
  private disposables: { dispose(): void }[] = [];

  constructor(radius: number, ground: (x: number, z: number) => number, opts: { butterflies?: number; petals?: number; ceiling?: number; seed?: number } = {}) {
    const r = rng(opts.seed ?? 21);
    // a butterfly: two wings, each a pair of triangles, hinged on the body axis
    const g = new THREE.BufferGeometry();
    const w = 0.09;
    const pos = new Float32Array([0, 0, 0, w, 0, w * 0.7, w * 1.05, 0, -w * 0.35, 0, 0, 0, -w, 0, w * 0.7, -w * 1.05, 0, -w * 0.35]);
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide, roughness: 0.6, emissive: 0x221a08 });
    const n = opts.butterflies ?? 12;
    this.flies = new THREE.InstancedMesh(g, mat, n);
    const cols = [0xf2a33a, 0xf7f1e0, 0x6ab0e8, 0xf0d040, 0xe86a9a];
    for (let i = 0; i < n; i++) {
      const a = r() * TAU;
      const d = Math.sqrt(r()) * radius * 0.8;
      this.fly.push({ cx: Math.cos(a) * d, cz: Math.sin(a) * d, r: 0.6 + r() * 1.6, h: ground(Math.cos(a) * d, Math.sin(a) * d) + 0.4 + r() * 0.9, ph: r() * TAU, sp: 0.25 + r() * 0.35 });
      this.flies.setColorAt(i, new THREE.Color(cols[i % cols.length]!));
    }
    this.flies.frustumCulled = false;
    this.group.add(this.flies);
    this.disposables.push(g, mat);

    // petals: a slow fall with a sideways flutter, recycled at the top
    const pn = opts.petals ?? 140;
    const pp = new Float32Array(pn * 3);
    this.petalBase = new Float32Array(pn * 4);
    const top = opts.ceiling ?? 6;
    for (let i = 0; i < pn; i++) {
      const a = r() * TAU;
      const d = Math.sqrt(r()) * radius * 0.85;
      this.petalBase[i * 4] = Math.cos(a) * d;
      this.petalBase[i * 4 + 1] = Math.sin(a) * d;
      this.petalBase[i * 4 + 2] = r() * top;
      this.petalBase[i * 4 + 3] = r() * TAU;
    }
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(pp, 3));
    const pm = new THREE.PointsMaterial({ color: 0xf6b8c8, size: 0.07, sizeAttenuation: true, transparent: true, opacity: 0.85, depthWrite: false });
    this.petals = new THREE.Points(pg, pm);
    this.petals.frustumCulled = false;
    this.petals.userData.top = top;
    this.petals.userData.ground = ground;
    this.group.add(this.petals);
    this.disposables.push(pg, pm);
  }

  update(t: number) {
    for (let i = 0; i < this.fly.length; i++) {
      const f = this.fly[i]!;
      const a = t * f.sp + f.ph;
      this.p.set(f.cx + Math.cos(a) * f.r + Math.sin(a * 2.3) * 0.25, f.h + Math.sin(a * 3.1) * 0.18, f.cz + Math.sin(a) * f.r * 0.7);
      const heading = Math.atan2(-Math.sin(a) * f.r * 0.7, -Math.cos(a) * f.r);
      this.q.setFromEuler(new THREE.Euler(0, heading, 0));
      const flap = 0.25 + 0.75 * Math.abs(Math.sin(t * 14 + f.ph));
      this.s.set(flap, 1, 1);
      this.m.compose(this.p, this.q, this.s);
      this.flies.setMatrixAt(i, this.m);
    }
    this.flies.instanceMatrix.needsUpdate = true;
    const pos = this.petals.geometry.getAttribute('position') as THREE.BufferAttribute;
    const top = this.petals.userData.top as number;
    const ground = this.petals.userData.ground as (x: number, z: number) => number;
    for (let i = 0; i < pos.count; i++) {
      const b = i * 4;
      const x = this.petalBase[b]!;
      const z = this.petalBase[b + 1]!;
      const ph = this.petalBase[b + 3]!;
      const fall = (this.petalBase[b + 2]! + top - ((t * 0.22) % top)) % top;
      const y = Math.max(ground(x, z) + 0.02, fall);
      pos.setXYZ(i, x + Math.sin(t * 0.9 + ph) * 0.3, y, z + Math.cos(t * 0.7 + ph) * 0.3);
    }
    pos.needsUpdate = true;
  }

  dispose() {
    for (const d of this.disposables) d.dispose();
    this.flies.dispose();
  }
}
