// Sliding puzzle: an n×n grid of tiles 1..n²-1 plus a blank (0). The start
// position is reached by random legal moves from the solved state, so it is
// always solvable.
export interface SlidingState {
  n: number;
  tiles: number[];
  moves: number;
}

export function solved(n: number): number[] {
  return Array.from({ length: n * n }, (_, i) => (i + 1) % (n * n));
}

export function isSolved(tiles: number[]): boolean {
  return tiles.every((t, i) => t === (i + 1) % tiles.length);
}

export function neighboursOfBlank(tiles: number[], n: number): number[] {
  const b = tiles.indexOf(0);
  const x = b % n;
  const y = Math.floor(b / n);
  const out: number[] = [];
  if (y > 0) out.push(b - n);
  if (y < n - 1) out.push(b + n);
  if (x > 0) out.push(b - 1);
  if (x < n - 1) out.push(b + 1);
  return out;
}

/** Slides the tile at `index` into the blank if adjacent; returns the same array otherwise. */
export function slide(tiles: number[], n: number, index: number): number[] {
  if (!neighboursOfBlank(tiles, n).includes(index)) return tiles;
  const b = tiles.indexOf(0);
  const next = tiles.slice();
  next[b] = tiles[index]!;
  next[index] = 0;
  return next;
}

export function shuffled(n: number, random: () => number, steps = n * n * 12): number[] {
  let tiles = solved(n);
  let last = -1;
  for (let i = 0; i < steps; i++) {
    const options = neighboursOfBlank(tiles, n).filter((o) => o !== last);
    const pickIdx = options[Math.floor(random() * options.length)]!;
    last = tiles.indexOf(0);
    tiles = slide(tiles, n, pickIdx);
  }
  if (isSolved(tiles)) return shuffled(n, random, steps + 3);
  return tiles;
}
