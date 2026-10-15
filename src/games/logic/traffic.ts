// Traffic Logic (Rush Hour style): vehicles on a 6×6 grid slide along their
// axis; get the red car (id 0, row 2, horizontal) to the right edge. The
// solver (BFS) gives the par move count for stars.
export interface Vehicle {
  id: number;
  x: number;
  y: number;
  len: number;
  horizontal: boolean;
}
export const SIZE = 6;

export function occupancy(vs: Vehicle[]): number[] {
  const g = new Array(SIZE * SIZE).fill(-1);
  for (const v of vs) for (let i = 0; i < v.len; i++) g[(v.horizontal ? v.y : v.y + i) * SIZE + (v.horizontal ? v.x + i : v.x)] = v.id;
  return g;
}

export function canSlide(vs: Vehicle[], id: number, delta: number): boolean {
  const v = vs.find((x) => x.id === id)!;
  const g = occupancy(vs);
  const nx = v.horizontal ? v.x + delta : v.x;
  const ny = v.horizontal ? v.y : v.y + delta;
  if (nx < 0 || ny < 0 || (v.horizontal ? nx + v.len > SIZE : ny + v.len > SIZE)) return false;
  for (let i = 0; i < v.len; i++) {
    const cx = v.horizontal ? nx + i : nx;
    const cy = v.horizontal ? ny : ny + i;
    const o = g[cy * SIZE + cx];
    if (o !== -1 && o !== id) return false;
  }
  return true;
}

export function slideVehicle(vs: Vehicle[], id: number, delta: number): Vehicle[] {
  if (!canSlide(vs, id, delta)) return vs;
  return vs.map((v) => (v.id === id ? { ...v, x: v.horizontal ? v.x + delta : v.x, y: v.horizontal ? v.y : v.y + delta } : v));
}

export const isSolved = (vs: Vehicle[]) => {
  const red = vs.find((v) => v.id === 0)!;
  return red.x + red.len >= SIZE;
};

const key = (vs: Vehicle[]) => vs.map((v) => `${v.x},${v.y}`).join('|');

/** Minimum number of single-step slides to free the red car (BFS), or -1. */
export function solve(vs: Vehicle[], maxStates = 200_000): number {
  const seen = new Set<string>([key(vs)]);
  let frontier: Vehicle[][] = [vs];
  let depth = 0;
  while (frontier.length && seen.size < maxStates) {
    const next: Vehicle[][] = [];
    for (const s of frontier) {
      if (isSolved(s)) return depth;
      for (const v of s) for (const d of [-1, 1]) {
        if (!canSlide(s, v.id, d)) continue;
        const n = slideVehicle(s, v.id, d);
        const k = key(n);
        if (seen.has(k)) continue;
        seen.add(k);
        next.push(n);
      }
    }
    frontier = next;
    depth++;
  }
  return -1;
}

export const PUZZLES: Record<string, Vehicle[][]> = {
  easy: [
    [{ id: 0, x: 1, y: 2, len: 2, horizontal: true }, { id: 1, x: 3, y: 0, len: 3, horizontal: false }, { id: 2, x: 4, y: 3, len: 2, horizontal: true }],
    [{ id: 0, x: 0, y: 2, len: 2, horizontal: true }, { id: 1, x: 2, y: 1, len: 2, horizontal: false }, { id: 2, x: 4, y: 2, len: 2, horizontal: false }, { id: 3, x: 0, y: 4, len: 3, horizontal: true }],
  ],
  normal: [
    [{ id: 0, x: 1, y: 2, len: 2, horizontal: true }, { id: 1, x: 0, y: 0, len: 2, horizontal: true }, { id: 2, x: 0, y: 1, len: 3, horizontal: false }, { id: 3, x: 3, y: 1, len: 3, horizontal: false }, { id: 4, x: 5, y: 0, len: 3, horizontal: false }, { id: 5, x: 4, y: 4, len: 2, horizontal: true }, { id: 6, x: 2, y: 5, len: 2, horizontal: true }],
    [{ id: 0, x: 0, y: 2, len: 2, horizontal: true }, { id: 1, x: 2, y: 0, len: 3, horizontal: false }, { id: 2, x: 3, y: 2, len: 2, horizontal: false }, { id: 3, x: 4, y: 1, len: 2, horizontal: false }, { id: 4, x: 0, y: 3, len: 2, horizontal: true }, { id: 5, x: 3, y: 4, len: 3, horizontal: true }, { id: 6, x: 5, y: 3, len: 1, horizontal: false }],
  ],
  hard: [
    [{ id: 0, x: 2, y: 2, len: 2, horizontal: true }, { id: 1, x: 0, y: 0, len: 2, horizontal: false }, { id: 2, x: 1, y: 0, len: 2, horizontal: true }, { id: 3, x: 3, y: 0, len: 2, horizontal: false }, { id: 4, x: 4, y: 0, len: 2, horizontal: true }, { id: 5, x: 0, y: 2, len: 2, horizontal: false }, { id: 6, x: 1, y: 3, len: 2, horizontal: false }, { id: 7, x: 4, y: 1, len: 3, horizontal: false }, { id: 8, x: 5, y: 2, len: 2, horizontal: false }, { id: 9, x: 2, y: 4, len: 2, horizontal: true }, { id: 10, x: 3, y: 5, len: 3, horizontal: true }],
    [{ id: 0, x: 0, y: 2, len: 2, horizontal: true }, { id: 1, x: 2, y: 0, len: 3, horizontal: false }, { id: 2, x: 3, y: 0, len: 2, horizontal: true }, { id: 3, x: 3, y: 1, len: 2, horizontal: false }, { id: 4, x: 5, y: 0, len: 3, horizontal: false }, { id: 5, x: 0, y: 3, len: 2, horizontal: false }, { id: 6, x: 1, y: 3, len: 2, horizontal: true }, { id: 7, x: 3, y: 3, len: 2, horizontal: false }, { id: 8, x: 4, y: 4, len: 2, horizontal: true }, { id: 9, x: 1, y: 5, len: 3, horizontal: true }],
  ],
};
