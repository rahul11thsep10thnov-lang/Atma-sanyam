// Block Puzzle: place polyomino pieces on a 10×10 grid; full rows/columns clear.
export type Shape = [number, number][]; // cells relative to origin
export const SHAPES: Shape[] = [
  [[0, 0]],
  [[0, 0], [1, 0]],
  [[0, 0], [0, 1]],
  [[0, 0], [1, 0], [2, 0]],
  [[0, 0], [0, 1], [0, 2]],
  [[0, 0], [1, 0], [0, 1], [1, 1]],
  [[0, 0], [1, 0], [2, 0], [3, 0]],
  [[0, 0], [0, 1], [0, 2], [0, 3]],
  [[0, 0], [1, 0], [1, 1]],
  [[0, 0], [0, 1], [1, 1]],
  [[0, 0], [1, 0], [2, 0], [0, 1]],
  [[0, 0], [1, 0], [2, 0], [2, 1]],
  [[0, 0], [0, 1], [0, 2], [1, 2]],
  [[0, 0], [1, 0], [2, 0], [0, 1], [0, 2]],
  [[0, 0], [1, 0], [2, 0], [1, 1], [1, 2]],
  [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [0, 2], [1, 2], [2, 2]],
];
export const BIG = SHAPES.length; // all shapes used on hard

export const SIZE = 10;

export function canPlace(grid: number[], shape: Shape, x: number, y: number): boolean {
  return shape.every(([dx, dy]) => {
    const cx = x + dx, cy = y + dy;
    return cx >= 0 && cy >= 0 && cx < SIZE && cy < SIZE && grid[cy * SIZE + cx] === 0;
  });
}

export function place(grid: number[], shape: Shape, x: number, y: number, colour: number): { grid: number[]; cleared: number } {
  const g = grid.slice();
  for (const [dx, dy] of shape) g[(y + dy) * SIZE + x + dx] = colour;
  let cleared = 0;
  const fullRows = [...Array(SIZE).keys()].filter((r) => [...Array(SIZE).keys()].every((c) => g[r * SIZE + c]));
  const fullCols = [...Array(SIZE).keys()].filter((c) => [...Array(SIZE).keys()].every((r) => g[r * SIZE + c]));
  for (const r of fullRows) for (let c = 0; c < SIZE; c++) g[r * SIZE + c] = 0;
  for (const c of fullCols) for (let r = 0; r < SIZE; r++) g[r * SIZE + c] = 0;
  cleared = fullRows.length + fullCols.length;
  return { grid: g, cleared };
}

export function anyFits(grid: number[], shapes: Shape[]): boolean {
  return shapes.some((s) => {
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) if (canPlace(grid, s, x, y)) return true;
    return false;
  });
}
