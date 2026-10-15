// Checkers (English draughts) on an 8×8 board. Pieces: 1 player man, 2 player
// king, -1 computer man, -2 computer king. Player moves "up" (towards row 0).
// Captures are mandatory and chain; kings move both ways.
export type Piece = 0 | 1 | 2 | -1 | -2;
export type Board = Piece[];
export interface Move {
  from: number;
  to: number;
  captures: number[];
}

export function initialBoard(): Board {
  const b: Board = new Array(64).fill(0);
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    if ((r + c) % 2 === 1) {
      if (r < 3) b[r * 8 + c] = -1;
      else if (r > 4) b[r * 8 + c] = 1;
    }
  }
  return b;
}

const sideOf = (p: Piece) => (p > 0 ? 1 : p < 0 ? -1 : 0);

function dirsFor(p: Piece): [number, number][] {
  if (p === 2 || p === -2) return [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  return p === 1 ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]];
}

function jumpsFrom(board: Board, idx: number, piece: Piece, captured: number[]): Move[] {
  const r = Math.floor(idx / 8), c = idx % 8;
  const out: Move[] = [];
  for (const [dr, dc] of dirsFor(piece)) {
    const mr = r + dr, mc = c + dc, tr = r + dr * 2, tc = c + dc * 2;
    if (tr < 0 || tr > 7 || tc < 0 || tc > 7) continue;
    const mid = mr * 8 + mc, to = tr * 8 + tc;
    if (sideOf(board[mid]!) !== -sideOf(piece) || captured.includes(mid)) continue;
    if (board[to] !== 0 && to !== idx) continue;
    const next = board.slice();
    next[idx] = 0;
    next[mid] = 0;
    next[to] = piece;
    const further = jumpsFrom(next, to, piece, [...captured, mid]);
    if (further.length === 0) out.push({ from: idx, to, captures: [...captured, mid] });
    else for (const f of further) out.push({ from: idx, to: f.to, captures: f.captures });
  }
  return out;
}

export function legalMoves(board: Board, side: 1 | -1): Move[] {
  const jumps: Move[] = [];
  const steps: Move[] = [];
  for (let i = 0; i < 64; i++) {
    const p = board[i]!;
    if (sideOf(p) !== side) continue;
    jumps.push(...jumpsFrom(board, i, p, []).map((m) => ({ ...m, from: i })));
    const r = Math.floor(i / 8), c = i % 8;
    for (const [dr, dc] of dirsFor(p)) {
      const tr = r + dr, tc = c + dc;
      if (tr < 0 || tr > 7 || tc < 0 || tc > 7) continue;
      if (board[tr * 8 + tc] === 0) steps.push({ from: i, to: tr * 8 + tc, captures: [] });
    }
  }
  return jumps.length ? jumps : steps;
}

export function applyMove(board: Board, move: Move): Board {
  const next = board.slice();
  const p = next[move.from]!;
  next[move.from] = 0;
  for (const c of move.captures) next[c] = 0;
  const r = Math.floor(move.to / 8);
  next[move.to] = p === 1 && r === 0 ? 2 : p === -1 && r === 7 ? -2 : p;
  return next;
}

export function evaluate(board: Board): number {
  let s = 0;
  for (let i = 0; i < 64; i++) {
    const p = board[i]!;
    if (!p) continue;
    const r = Math.floor(i / 8);
    const v = Math.abs(p) === 2 ? 3 : 1 + (p === 1 ? (7 - r) * 0.05 : p === -1 ? r * 0.05 : 0);
    s += p < 0 ? v : -v;
  }
  return s; // positive = good for computer
}

function search(board: Board, side: 1 | -1, depth: number, alpha: number, beta: number): number {
  const moves = legalMoves(board, side);
  if (moves.length === 0) return side === -1 ? -100 : 100;
  if (depth === 0) return evaluate(board);
  if (side === -1) {
    let best = -Infinity;
    for (const m of moves) {
      best = Math.max(best, search(applyMove(board, m), 1, depth - 1, alpha, beta));
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  }
  let best = Infinity;
  for (const m of moves) {
    best = Math.min(best, search(applyMove(board, m), -1, depth - 1, alpha, beta));
    beta = Math.min(beta, best);
    if (beta <= alpha) break;
  }
  return best;
}

export function computerMove(board: Board, depth: number, random: () => number): Move | null {
  const moves = legalMoves(board, -1);
  if (moves.length === 0) return null;
  if (depth <= 1) return moves[Math.floor(random() * moves.length)]!;
  let best = moves[0]!;
  let bestV = -Infinity;
  for (const m of moves) {
    const v = search(applyMove(board, m), 1, depth - 1, -Infinity, Infinity) + random() * 0.1;
    if (v > bestV) {
      bestV = v;
      best = m;
    }
  }
  return best;
}

export function countPieces(board: Board, side: 1 | -1): number {
  return board.filter((p) => sideOf(p) === side).length;
}
