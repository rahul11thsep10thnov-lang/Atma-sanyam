// Connect Four rules and a minimax computer player.
export const COLS = 7;
export const ROWS = 6;
export type Cell = 0 | 1 | 2; // 0 empty, 1 player, 2 computer
export type Board = Cell[];

export const empty = (): Board => new Array(COLS * ROWS).fill(0);

export function drop(board: Board, col: number, who: Cell): { board: Board; row: number } | null {
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r * COLS + col] === 0) {
      const next = board.slice();
      next[r * COLS + col] = who;
      return { board: next, row: r };
    }
  }
  return null;
}

export function legalCols(board: Board): number[] {
  return [...Array(COLS).keys()].filter((c) => board[c] === 0);
}

const DIRS: [number, number][] = [[1, 0], [0, 1], [1, 1], [1, -1]];

export function winner(board: Board): { who: Cell; cells: number[] } | null {
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const w = board[r * COLS + c];
    if (!w) continue;
    for (const [dc, dr] of DIRS) {
      const cells = [r * COLS + c];
      for (let k = 1; k < 4; k++) {
        const rr = r + dr * k, cc = c + dc * k;
        if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS || board[rr * COLS + cc] !== w) break;
        cells.push(rr * COLS + cc);
      }
      if (cells.length === 4) return { who: w, cells };
    }
  }
  return null;
}

export const isFull = (board: Board) => board.every((c) => c !== 0);

function score(board: Board, me: Cell): number {
  const other: Cell = me === 1 ? 2 : 1;
  let s = 0;
  const line = (cells: Cell[]) => {
    const mine = cells.filter((c) => c === me).length;
    const theirs = cells.filter((c) => c === other).length;
    if (mine && theirs) return 0;
    if (mine === 3) return 50;
    if (mine === 2) return 5;
    if (theirs === 3) return -60;
    if (theirs === 2) return -5;
    return 0;
  };
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) for (const [dc, dr] of DIRS) {
    const cells: Cell[] = [];
    for (let k = 0; k < 4; k++) {
      const rr = r + dr * k, cc = c + dc * k;
      if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS) break;
      cells.push(board[rr * COLS + cc]!);
    }
    if (cells.length === 4) s += line(cells);
  }
  // centre preference
  for (let r = 0; r < ROWS; r++) if (board[r * COLS + 3] === me) s += 3;
  return s;
}

function minimax(board: Board, depth: number, alpha: number, beta: number, maximizing: boolean, me: Cell): number {
  const w = winner(board);
  if (w) return w.who === me ? 10_000 + depth : -10_000 - depth;
  if (depth === 0 || isFull(board)) return score(board, me);
  const other: Cell = me === 1 ? 2 : 1;
  const cols = legalCols(board).sort((a, b) => Math.abs(3 - a) - Math.abs(3 - b));
  if (maximizing) {
    let best = -Infinity;
    for (const c of cols) {
      const v = minimax(drop(board, c, me)!.board, depth - 1, alpha, beta, false, me);
      best = Math.max(best, v);
      alpha = Math.max(alpha, v);
      if (beta <= alpha) break;
    }
    return best;
  }
  let best = Infinity;
  for (const c of cols) {
    const v = minimax(drop(board, c, other)!.board, depth - 1, alpha, beta, true, me);
    best = Math.min(best, v);
    beta = Math.min(beta, v);
    if (beta <= alpha) break;
  }
  return best;
}

/** Computer move. depth 1 = friendly (mostly random with blocks), 3 = clever, 5 = master. */
export function bestMove(board: Board, me: Cell, depth: number, random: () => number): number {
  const cols = legalCols(board);
  if (depth <= 1) {
    // Win if possible, block if needed, else random-ish centre bias.
    const other: Cell = me === 1 ? 2 : 1;
    for (const c of cols) if (winner(drop(board, c, me)!.board)?.who === me) return c;
    for (const c of cols) if (winner(drop(board, c, other)!.board)?.who === other) return c;
    const weighted = cols.flatMap((c) => Array(4 - Math.abs(3 - c)).fill(c));
    return weighted[Math.floor(random() * weighted.length)]!;
  }
  let best = cols[0]!;
  let bestV = -Infinity;
  for (const c of cols) {
    const v = minimax(drop(board, c, me)!.board, depth - 1, -Infinity, Infinity, false, me) + random() * 0.5;
    if (v > bestV) {
      bestV = v;
      best = c;
    }
  }
  return best;
}
