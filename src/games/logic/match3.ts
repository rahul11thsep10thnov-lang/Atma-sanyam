// Match-3 board rules: swap adjacent gems, find runs of 3+, clear, gravity,
// refill, cascade. Pure so the engine's tests can drive it.
export type Grid = number[]; // gem kinds 1..K, 0 empty

export function makeGrid(size: number, kinds: number, random: () => number): Grid {
  const g: Grid = new Array(size * size).fill(0);
  for (let i = 0; i < g.length; i++) {
    let v: number;
    do v = 1 + Math.floor(random() * kinds);
    while ((i % size >= 2 && g[i - 1] === v && g[i - 2] === v) || (i >= size * 2 && g[i - size] === v && g[i - size * 2] === v));
    g[i] = v;
  }
  return g;
}

export function findMatches(g: Grid, size: number): Set<number> {
  const out = new Set<number>();
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) {
    const i = r * size + c;
    const v = g[i];
    if (!v) continue;
    if (c <= size - 3 && g[i + 1] === v && g[i + 2] === v) {
      let k = c;
      while (k < size && g[r * size + k] === v) out.add(r * size + k++);
    }
    if (r <= size - 3 && g[i + size] === v && g[i + size * 2] === v) {
      let k = r;
      while (k < size && g[k * size + c] === v) out.add(k++ * size + c);
    }
  }
  return out;
}

export function swap(g: Grid, a: number, b: number): Grid {
  const n = g.slice();
  [n[a], n[b]] = [n[b]!, n[a]!];
  return n;
}

export const adjacent = (a: number, b: number, size: number) => (Math.abs(a - b) === 1 && Math.floor(a / size) === Math.floor(b / size)) || Math.abs(a - b) === size;

export function collapse(g: Grid, size: number, kinds: number, random: () => number): Grid {
  const n = g.slice();
  for (let c = 0; c < size; c++) {
    let write = size - 1;
    for (let r = size - 1; r >= 0; r--) {
      const v = n[r * size + c]!;
      if (v) {
        n[write * size + c] = v;
        if (write !== r) n[r * size + c] = 0;
        write--;
      }
    }
    for (let r = write; r >= 0; r--) n[r * size + c] = 1 + Math.floor(random() * kinds);
  }
  return n;
}

/** Resolves all cascades after a move; returns the final grid and points. */
export function resolve(g: Grid, size: number, kinds: number, random: () => number): { grid: Grid; points: number; cleared: number } {
  let grid = g;
  let points = 0;
  let cleared = 0;
  let combo = 1;
  for (let guard = 0; guard < 20; guard++) {
    const m = findMatches(grid, size);
    if (m.size === 0) break;
    cleared += m.size;
    points += m.size * 10 * combo;
    grid = grid.slice();
    for (const i of m) grid[i] = 0;
    grid = collapse(grid, size, kinds, random);
    combo++;
  }
  return { grid, points, cleared };
}

export function hasMove(g: Grid, size: number): boolean {
  for (let i = 0; i < g.length; i++) {
    for (const j of [i + 1, i + size]) {
      if (j >= g.length || !adjacent(i, j, size)) continue;
      if (findMatches(swap(g, i, j), size).size > 0) return true;
    }
  }
  return false;
}
