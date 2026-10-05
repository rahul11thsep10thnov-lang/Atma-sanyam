// Exact counting of triangles, squares and rectangles in line drawings.
// The answer to every "how many triangles?" question comes from here; the
// tests cross-check it against a second, independent method and against
// known formulas (grids, chessboard = 1296, …).
import type { Pt } from './model.js';

export interface Seg {
  a: Pt;
  b: Pt;
}

const EPS = 1e-7;
const eq = (a: number, b: number) => Math.abs(a - b) < 1e-6;

function sub(a: Pt, b: Pt): Pt {
  return [a[0] - b[0], a[1] - b[1]];
}
function cross(a: Pt, b: Pt) {
  return a[0] * b[1] - a[1] * b[0];
}

/** Merge collinear segments that overlap or touch, so a line drawn in two pieces counts as one. */
export function mergeSegments(segs: Seg[]): Seg[] {
  const groups = new Map<string, { dir: Pt; origin: Pt; ivals: [number, number][] }>();
  for (const s of segs) {
    let d = sub(s.b, s.a);
    const len = Math.hypot(d[0], d[1]);
    if (len < EPS) continue;
    d = [d[0] / len, d[1] / len];
    if (d[0] < -EPS || (Math.abs(d[0]) < EPS && d[1] < 0)) d = [-d[0], -d[1]];
    // Line identity: direction + signed distance from origin.
    const normalOffset = cross(d, s.a);
    const key = `${d[0].toFixed(6)},${d[1].toFixed(6)},${normalOffset.toFixed(6)}`;
    const g = groups.get(key) ?? { dir: d, origin: s.a, ivals: [] };
    const t1 = (s.a[0] - g.origin[0]) * d[0] + (s.a[1] - g.origin[1]) * d[1];
    const t2 = (s.b[0] - g.origin[0]) * d[0] + (s.b[1] - g.origin[1]) * d[1];
    g.ivals.push([Math.min(t1, t2), Math.max(t1, t2)]);
    groups.set(key, g);
  }
  const out: Seg[] = [];
  for (const g of groups.values()) {
    g.ivals.sort((p, q) => p[0] - q[0]);
    let [lo, hi] = g.ivals[0]!;
    const flush = () => out.push({ a: [g.origin[0] + g.dir[0] * lo, g.origin[1] + g.dir[1] * lo], b: [g.origin[0] + g.dir[0] * hi, g.origin[1] + g.dir[1] * hi] });
    for (const [a, b] of g.ivals.slice(1)) {
      if (a <= hi + 1e-6) hi = Math.max(hi, b);
      else {
        flush();
        lo = a;
        hi = b;
      }
    }
    flush();
  }
  return out;
}

function onSeg(p: Pt, s: Seg): boolean {
  const d = sub(s.b, s.a);
  const len = Math.hypot(d[0], d[1]);
  if (Math.abs(cross(d, sub(p, s.a))) / len > 1e-6) return false;
  const t = ((p[0] - s.a[0]) * d[0] + (p[1] - s.a[1]) * d[1]) / (len * len);
  return t > -1e-9 && t < 1 + 1e-9;
}

/** Intersection point of two segments (not parallel), or null. */
export function intersect(s: Seg, t: Seg): Pt | null {
  const r = sub(s.b, s.a);
  const q = sub(t.b, t.a);
  const den = cross(r, q);
  if (Math.abs(den) < EPS) return null;
  const w = sub(t.a, s.a);
  const u = cross(w, q) / den;
  const v = cross(w, r) / den;
  if (u < -1e-9 || u > 1 + 1e-9 || v < -1e-9 || v > 1 + 1e-9) return null;
  return [s.a[0] + u * r[0], s.a[1] + u * r[1]];
}

function addPoint(points: Pt[], p: Pt): void {
  if (!points.some((q) => eq(q[0], p[0]) && eq(q[1], p[1]))) points.push(p);
}

export interface TriangleCount {
  count: number;
  /** Number of triangles per area class, smallest first. */
  byArea: { area: number; count: number }[];
}

/** Every three points that are pairwise joined by drawn lines and not on one line form a triangle. */
export function countTriangles(input: Seg[]): TriangleCount {
  const segs = mergeSegments(input);
  const points: Pt[] = [];
  for (const s of segs) {
    addPoint(points, s.a);
    addPoint(points, s.b);
  }
  for (let i = 0; i < segs.length; i++)
    for (let j = i + 1; j < segs.length; j++) {
      const p = intersect(segs[i]!, segs[j]!);
      if (p) addPoint(points, p);
    }
  const on = segs.map((s) => points.map((p) => onSeg(p, s)));
  const joined = (i: number, j: number) => on.some((row) => row[i] && row[j]);
  const areas: number[] = [];
  for (let i = 0; i < points.length; i++)
    for (let j = i + 1; j < points.length; j++) {
      if (!joined(i, j)) continue;
      for (let k = j + 1; k < points.length; k++) {
        if (!joined(i, k) || !joined(j, k)) continue;
        const area = Math.abs(cross(sub(points[j]!, points[i]!), sub(points[k]!, points[i]!))) / 2;
        if (area > 1e-6) areas.push(area);
      }
    }
  return { count: areas.length, byArea: groupBy(areas) };
}

function groupBy(values: number[]) {
  const groups: { area: number; count: number }[] = [];
  for (const v of [...values].sort((a, b) => a - b)) {
    const g = groups.find((x) => Math.abs(x.area - v) < 1e-4);
    if (g) g.count++;
    else groups.push({ area: v, count: 1 });
  }
  return groups;
}

export interface RectCount {
  count: number;
  bySize: { w: number; h: number; count: number }[];
}

/** Axis-aligned rectangles (or squares) whose four sides are all drawn. */
export function countRectangles(input: Seg[], squaresOnly: boolean): RectCount {
  const segs = mergeSegments(input);
  const H = segs.filter((s) => eq(s.a[1], s.b[1])).map((s) => ({ y: s.a[1], lo: Math.min(s.a[0], s.b[0]), hi: Math.max(s.a[0], s.b[0]) }));
  const V = segs.filter((s) => eq(s.a[0], s.b[0])).map((s) => ({ x: s.a[0], lo: Math.min(s.a[1], s.b[1]), hi: Math.max(s.a[1], s.b[1]) }));
  const uniq = (vals: number[]) => vals.sort((a, b) => a - b).filter((v, i, arr) => i === 0 || !eq(v, arr[i - 1]!));
  const xs = uniq(V.map((v) => v.x));
  const ys = uniq(H.map((h) => h.y));
  const hCovered = (y: number, x1: number, x2: number) => H.some((h) => eq(h.y, y) && h.lo <= x1 + 1e-6 && h.hi >= x2 - 1e-6);
  const vCovered = (x: number, y1: number, y2: number) => V.some((v) => eq(v.x, x) && v.lo <= y1 + 1e-6 && v.hi >= y2 - 1e-6);
  const sizes: { w: number; h: number; count: number }[] = [];
  let count = 0;
  for (let a = 0; a < xs.length; a++)
    for (let b = a + 1; b < xs.length; b++)
      for (let c = 0; c < ys.length; c++)
        for (let d = c + 1; d < ys.length; d++) {
          const [x1, x2, y1, y2] = [xs[a]!, xs[b]!, ys[c]!, ys[d]!];
          const w = x2 - x1;
          const h = y2 - y1;
          if (squaresOnly && !eq(w, h)) continue;
          if (hCovered(y1, x1, x2) && hCovered(y2, x1, x2) && vCovered(x1, y1, y2) && vCovered(x2, y1, y2)) {
            count++;
            const g = sizes.find((s) => eq(s.w, w) && eq(s.h, h));
            if (g) g.count++;
            else sizes.push({ w, h, count: 1 });
          }
        }
  sizes.sort((p, q) => p.w * p.h - q.w * q.h || p.w - q.w);
  return { count, bySize: sizes };
}
