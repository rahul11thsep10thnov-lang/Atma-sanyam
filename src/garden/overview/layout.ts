// Where each plant stands on the miniature island: a stable, natural scatter
// (never rows) inside the square, kept off the little stone path. A plant's
// place depends only on its own id and the plants placed before it, so the
// same garden always looks the same, and (up to 40 plants) adding a plant
// never moves the others.
export interface Spot {
  id: string;
  /** Position on the island floor, 0..1 each way (u runs along the right edge, v along the left). */
  u: number;
  v: number;
  /** Clearance it asks of its neighbours, in the same units. */
  r: number;
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function rng(seed: number): () => number {
  let a = seed || 1;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The stone path: a gentle S from the front corner towards the back. Distance to it, in island units. */
export function pathDistance(u: number, v: number): number {
  const along = (u + v) / 2;
  const centre = 0.5 + 0.13 * Math.sin(along * Math.PI * 2);
  return Math.abs((u - v) / 2 + 0.5 - centre) * 1.2;
}

const EDGE = 0.1;

/** `items` oldest first; trees ask for more room than flowers. */
export function arrange(items: { id: string; radius: number }[]): Spot[] {
  const placed: Spot[] = [];
  // spacing only tightens once the island is busy (beyond 40 plants), so a small garden is stable as it grows
  const n = Math.max(40, items.length);
  const base = 0.9 / Math.sqrt(n * 1.7);
  for (const it of items) {
    const rand = rng(hash(it.id));
    const r = Math.min(0.2, base * it.radius);
    let best: Spot | null = null;
    let bestScore = -Infinity;
    for (let k = 0; k < 28; k++) {
      const u = EDGE + rand() * (1 - 2 * EDGE);
      const v = EDGE + rand() * (1 - 2 * EDGE);
      if (pathDistance(u, v) < 0.045) continue;
      let nearest = Infinity;
      for (const p of placed) nearest = Math.min(nearest, Math.hypot(p.u - u, p.v - v) - (p.r + r) * 0.5);
      if (nearest > bestScore) {
        bestScore = nearest;
        best = { id: it.id, u, v, r };
      }
      if (nearest > 0.02) break;
    }
    placed.push(best ?? { id: it.id, u: 0.5, v: 0.5, r });
  }
  return placed;
}
