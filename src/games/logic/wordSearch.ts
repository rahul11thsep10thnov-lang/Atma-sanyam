// Word search grid generation: place words in 8 directions, fill the rest
// with random letters, and check a selected line of cells against the list.
export interface Placement {
  word: string;
  cells: number[];
}
export interface WordGrid {
  size: number;
  letters: string[];
  placements: Placement[];
}

const DIRS: [number, number][] = [[1, 0], [0, 1], [1, 1], [-1, 0], [0, -1], [-1, -1], [1, -1], [-1, 1]];

export function generateWordGrid(words: string[], size: number, random: () => number, allowBackwards: boolean): WordGrid {
  const letters: string[] = new Array(size * size).fill('');
  const placements: Placement[] = [];
  const dirs = allowBackwards ? DIRS : DIRS.slice(0, 3);
  for (const word of [...words].sort((a, b) => b.length - a.length)) {
    let placed = false;
    for (let attempt = 0; attempt < 200 && !placed; attempt++) {
      const [dx, dy] = dirs[Math.floor(random() * dirs.length)]!;
      const x0 = Math.floor(random() * size);
      const y0 = Math.floor(random() * size);
      const cells: number[] = [];
      let ok = true;
      for (let i = 0; i < word.length; i++) {
        const x = x0 + dx * i;
        const y = y0 + dy * i;
        if (x < 0 || y < 0 || x >= size || y >= size) {
          ok = false;
          break;
        }
        const k = y * size + x;
        if (letters[k] && letters[k] !== word[i]) {
          ok = false;
          break;
        }
        cells.push(k);
      }
      if (!ok) continue;
      cells.forEach((k, i) => (letters[k] = word[i]!));
      placements.push({ word, cells });
      placed = true;
    }
  }
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let i = 0; i < letters.length; i++) if (!letters[i]) letters[i] = alphabet[Math.floor(random() * 26)]!;
  return { size, letters, placements: placements.filter((p) => words.includes(p.word)) };
}

/** Cells on the straight line from a to b (inclusive), or null if not straight. */
export function lineCells(size: number, a: number, b: number): number[] | null {
  const ax = a % size, ay = Math.floor(a / size), bx = b % size, by = Math.floor(b / size);
  const dx = Math.sign(bx - ax), dy = Math.sign(by - ay);
  const len = Math.max(Math.abs(bx - ax), Math.abs(by - ay));
  if (dx !== 0 && dy !== 0 && Math.abs(bx - ax) !== Math.abs(by - ay)) return null;
  const out: number[] = [];
  for (let i = 0; i <= len; i++) out.push((ay + dy * i) * size + ax + dx * i);
  return out;
}

export function matchWord(grid: WordGrid, cells: number[]): Placement | null {
  const key = cells.join(',');
  const rev = cells.slice().reverse().join(',');
  return grid.placements.find((p) => p.cells.join(',') === key || p.cells.join(',') === rev) ?? null;
}
