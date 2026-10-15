// Physics Lab rules: a grid marble run. The ball starts at the top of the
// start column and falls one cell per step. A cell may hold a ramp that
// pushes the ball sideways ('/' sends it right, '\' sends it left), a wall
// that stops it, or a bumper that reverses its sideways motion. The ball
// wins when it leaves the bottom row in the cup column. Players place a
// limited number of ramps/bumpers on free cells; fixed walls make levels.

export type Piece = '' | '/' | '\\' | '#' | 'o' | 'cup';
export interface Level { cols: number; rows: number; start: number; cup: number; walls: [number, number][]; ramps: number; bumpers: number; par: number }

export const LEVELS: Record<string, Level[]> = {
  // Each level was checked by search: the par is the fewest pieces that work.
  easy: [
    { cols: 5, rows: 5, start: 1, cup: 3, walls: [[4, 1], [1, 1]], ramps: 4, bumpers: 0, par: 2 },
    { cols: 5, rows: 5, start: 0, cup: 3, walls: [[3, 1], [4, 0]], ramps: 4, bumpers: 0, par: 2 },
    { cols: 5, rows: 5, start: 1, cup: 3, walls: [[3, 1], [1, 4]], ramps: 4, bumpers: 0, par: 2 },
  ],
  normal: [
    { cols: 6, rows: 7, start: 1, cup: 3, walls: [[3, 0], [1, 1], [6, 0], [1, 3]], ramps: 4, bumpers: 1, par: 2 },
    { cols: 6, rows: 7, start: 3, cup: 0, walls: [[1, 3], [1, 5], [3, 0], [1, 2]], ramps: 4, bumpers: 1, par: 2 },
    { cols: 7, rows: 7, start: 0, cup: 2, walls: [[4, 3], [4, 2], [3, 1], [1, 0], [1, 5]], ramps: 5, bumpers: 1, par: 3 },
  ],
  hard: [
    { cols: 8, rows: 8, start: 0, cup: 3, walls: [[3, 7], [7, 5], [5, 6], [2, 0], [2, 1], [6, 7]], ramps: 5, bumpers: 1, par: 3 },
    { cols: 8, rows: 8, start: 0, cup: 6, walls: [[7, 6], [1, 0], [7, 2], [7, 7], [5, 4], [2, 6]], ramps: 5, bumpers: 1, par: 3 },
    { cols: 8, rows: 8, start: 1, cup: 3, walls: [[3, 0], [6, 0], [1, 1], [6, 5], [4, 6], [5, 6]], ramps: 5, bumpers: 1, par: 3 },
  ],
};

export interface Sim { path: [number, number][]; outcome: 'cup' | 'floor' | 'stuck' | 'edge' }

/** Runs the ball; returns every cell it visited and how the run ended. */
export function simulate(level: Level, grid: Piece[][]): Sim {
  let r = -1, c = level.start, dir = 0; // dir: -1 gliding left, 0 falling, +1 gliding right
  const path: [number, number][] = [];
  for (let step = 0; step < 400; step++) {
    const nr = r + 1;
    let nc = c + dir;
    if (nc < 0 || nc >= level.cols) {
      // The side of the box: drop straight down from here.
      dir = 0;
      nc = c;
    }
    if (nr >= level.rows) {
      path.push([nr, nc]);
      return { path, outcome: nc === level.cup ? 'cup' : 'floor' };
    }
    const piece = grid[nr]?.[nc] ?? '';
    if (piece === '#') {
      if (dir === 0) return { path, outcome: 'stuck' };
      dir = 0; // glided into a wall: fall straight instead
      continue;
    }
    r = nr;
    c = nc;
    path.push([r, c]);
    if (piece === '/') dir = 1; // a ramp starts a diagonal glide…
    else if (piece === '\\') dir = -1;
    else if (piece === 'o') dir = -dir; // …a bumper reverses it
  }
  return { path, outcome: 'stuck' };
}

export function emptyGrid(level: Level): Piece[][] {
  const g: Piece[][] = Array.from({ length: level.rows }, () => Array.from({ length: level.cols }, () => '' as Piece));
  for (const [r, c] of level.walls) g[r]![c] = '#';
  return g;
}

export function countPieces(grid: Piece[][]): { ramps: number; bumpers: number } {
  let ramps = 0, bumpers = 0;
  for (const row of grid) for (const p of row) {
    if (p === '/' || p === '\\') ramps++;
    if (p === 'o') bumpers++;
  }
  return { ramps, bumpers };
}
