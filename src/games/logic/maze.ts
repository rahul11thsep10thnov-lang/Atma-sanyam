// Maze generation (recursive backtracker) and movement rules. Pure TS so it
// is unit-tested without React.
export interface Maze {
  cols: number;
  rows: number;
  /** Bit flags per cell: 1 = wall north, 2 = east, 4 = south, 8 = west. */
  walls: number[];
}

export const N = 1, E = 2, S = 4, W = 8;

export function generateMaze(cols: number, rows: number, random: () => number): Maze {
  const walls = new Array(cols * rows).fill(N | E | S | W);
  const visited = new Array(cols * rows).fill(false);
  const stack: number[] = [0];
  visited[0] = true;
  while (stack.length) {
    const cur = stack[stack.length - 1]!;
    const x = cur % cols;
    const y = Math.floor(cur / cols);
    const options: [number, number, number][] = [];
    if (y > 0 && !visited[cur - cols]) options.push([cur - cols, N, S]);
    if (x < cols - 1 && !visited[cur + 1]) options.push([cur + 1, E, W]);
    if (y < rows - 1 && !visited[cur + cols]) options.push([cur + cols, S, N]);
    if (x > 0 && !visited[cur - 1]) options.push([cur - 1, W, E]);
    if (options.length === 0) {
      stack.pop();
      continue;
    }
    const [next, wallHere, wallThere] = options[Math.floor(random() * options.length)]!;
    walls[cur] &= ~wallHere;
    walls[next] &= ~wallThere;
    visited[next] = true;
    stack.push(next);
  }
  return { cols, rows, walls };
}

export function canMove(maze: Maze, x: number, y: number, dir: 'up' | 'down' | 'left' | 'right'): boolean {
  const w = maze.walls[y * maze.cols + x]!;
  switch (dir) {
    case 'up':
      return !(w & N);
    case 'right':
      return !(w & E);
    case 'down':
      return !(w & S);
    case 'left':
      return !(w & W);
  }
}

export function step(x: number, y: number, dir: 'up' | 'down' | 'left' | 'right'): [number, number] {
  return dir === 'up' ? [x, y - 1] : dir === 'down' ? [x, y + 1] : dir === 'left' ? [x - 1, y] : [x + 1, y];
}

/** Shortest path length (BFS) from start to goal — the par for stars. */
export function shortestPath(maze: Maze, sx: number, sy: number, gx: number, gy: number): number {
  const dist = new Array(maze.cols * maze.rows).fill(-1);
  const q: number[] = [sy * maze.cols + sx];
  dist[q[0]!] = 0;
  while (q.length) {
    const c = q.shift()!;
    const x = c % maze.cols;
    const y = Math.floor(c / maze.cols);
    if (x === gx && y === gy) return dist[c]!;
    for (const d of ['up', 'right', 'down', 'left'] as const) {
      if (!canMove(maze, x, y, d)) continue;
      const [nx, ny] = step(x, y, d);
      const n = ny * maze.cols + nx;
      if (dist[n] === -1) {
        dist[n] = dist[c]! + 1;
        q.push(n);
      }
    }
  }
  return -1;
}
