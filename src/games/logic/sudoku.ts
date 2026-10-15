// Sudoku for 4×4 (boxes 2×2), 6×6 (boxes 2×3) and 9×9 (boxes 3×3):
// generation by randomised backtracking, then removing cells while the
// puzzle keeps a unique solution (checked by a counting solver).
export interface SudokuPuzzle {
  n: number;
  boxRows: number;
  boxCols: number;
  givens: number[]; // 0 = empty
  solution: number[];
}

export function boxDims(n: number): [number, number] {
  return n === 4 ? [2, 2] : n === 6 ? [2, 3] : [3, 3];
}

export function isValidPlacement(grid: number[], n: number, boxRows: number, boxCols: number, idx: number, v: number): boolean {
  const r = Math.floor(idx / n);
  const c = idx % n;
  for (let i = 0; i < n; i++) {
    if (grid[r * n + i] === v && r * n + i !== idx) return false;
    if (grid[i * n + c] === v && i * n + c !== idx) return false;
  }
  const br = Math.floor(r / boxRows) * boxRows;
  const bc = Math.floor(c / boxCols) * boxCols;
  for (let i = 0; i < boxRows; i++) for (let j = 0; j < boxCols; j++) {
    const k = (br + i) * n + bc + j;
    if (grid[k] === v && k !== idx) return false;
  }
  return true;
}

function solveCount(grid: number[], n: number, boxRows: number, boxCols: number, limit: number, random?: () => number): number {
  const idx = grid.indexOf(0);
  if (idx === -1) return 1;
  let count = 0;
  const values = Array.from({ length: n }, (_, i) => i + 1);
  if (random) values.sort(() => random() - 0.5);
  for (const v of values) {
    if (!isValidPlacement(grid, n, boxRows, boxCols, idx, v)) continue;
    grid[idx] = v;
    count += solveCount(grid, n, boxRows, boxCols, limit - count, random);
    if (count >= limit) {
      grid[idx] = 0;
      return count;
    }
    grid[idx] = 0;
  }
  return count;
}

export function generateSudoku(n: number, cluesFraction: number, random: () => number): SudokuPuzzle {
  const [boxRows, boxCols] = boxDims(n);
  const solution = new Array(n * n).fill(0);
  // Fill with a randomised solver.
  const fill = (g: number[]): boolean => {
    const idx = g.indexOf(0);
    if (idx === -1) return true;
    const values = Array.from({ length: n }, (_, i) => i + 1).sort(() => random() - 0.5);
    for (const v of values) {
      if (!isValidPlacement(g, n, boxRows, boxCols, idx, v)) continue;
      g[idx] = v;
      if (fill(g)) return true;
      g[idx] = 0;
    }
    return false;
  };
  fill(solution);
  const givens = solution.slice();
  const order = [...Array(n * n).keys()].sort(() => random() - 0.5);
  const target = Math.round(n * n * cluesFraction);
  let remaining = n * n;
  for (const idx of order) {
    if (remaining <= target) break;
    const saved = givens[idx]!;
    givens[idx] = 0;
    if (solveCount(givens.slice(), n, boxRows, boxCols, 2) !== 1) givens[idx] = saved;
    else remaining--;
  }
  return { n, boxRows, boxCols, givens, solution };
}

export function isComplete(grid: number[], solution: number[]): boolean {
  return grid.every((v, i) => v === solution[i]);
}

/** Cells whose value breaks a row, column or box rule. */
export function conflicts(grid: number[], n: number, boxRows: number, boxCols: number): Set<number> {
  const bad = new Set<number>();
  grid.forEach((v, i) => {
    if (v && !isValidPlacement(grid, n, boxRows, boxCols, i, v)) bad.add(i);
  });
  return bad;
}
