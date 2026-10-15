// Chess: full legal move generation (castling, en passant, promotion),
// check, checkmate and stalemate, FEN import, and a small alpha-beta
// computer player. Board is 64 squares, index 0 = a8 … 63 = h1.
// Pieces: uppercase white, lowercase black; '' empty.
export type Sq = string;
export type Board = Sq[];
export type Color = 'w' | 'b';
export interface Position {
  board: Board;
  turn: Color;
  castling: string; // subset of KQkq
  ep: number | null; // en passant target square
  halfmove: number;
}
export interface Move {
  from: number;
  to: number;
  promo?: string;
  capture?: boolean;
  castle?: 'K' | 'Q';
  ep?: boolean;
}

export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export function fromFen(fen: string): Position {
  const [placement, turn, castling, ep, half] = fen.split(' ');
  const board: Board = [];
  for (const ch of placement!.replace(/\//g, '')) {
    if (/\d/.test(ch)) for (let i = 0; i < Number(ch); i++) board.push('');
    else board.push(ch);
  }
  return { board, turn: (turn as Color) ?? 'w', castling: castling === '-' ? '' : castling ?? '', ep: ep && ep !== '-' ? algebraToIndex(ep) : null, halfmove: Number(half ?? 0) };
}

export function algebraToIndex(sq: string): number {
  const file = sq.charCodeAt(0) - 97;
  const rank = Number(sq[1]);
  return (8 - rank) * 8 + file;
}

export function indexToAlgebra(i: number): string {
  return `${String.fromCharCode(97 + (i % 8))}${8 - Math.floor(i / 8)}`;
}

export const colorOf = (p: string): Color | null => (p === '' ? null : p === p.toUpperCase() ? 'w' : 'b');
const row = (i: number) => Math.floor(i / 8);
const col = (i: number) => i % 8;
const inside = (r: number, c: number) => r >= 0 && r < 8 && c >= 0 && c < 8;

const KNIGHT: [number, number][] = [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]];
const KING: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
const BISHOP: [number, number][] = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const ROOK: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];

export function isAttacked(board: Board, idx: number, by: Color): boolean {
  const r = row(idx), c = col(idx);
  const enemy = (p: string, kinds: string) => p !== '' && colorOf(p) === by && kinds.includes(p.toLowerCase());
  // pawns
  const pr = by === 'w' ? r + 1 : r - 1;
  for (const dc of [-1, 1]) if (inside(pr, c + dc) && enemy(board[pr * 8 + c + dc]!, 'p')) return true;
  for (const [dr, dc] of KNIGHT) if (inside(r + dr, c + dc) && enemy(board[(r + dr) * 8 + c + dc]!, 'n')) return true;
  for (const [dr, dc] of KING) if (inside(r + dr, c + dc) && enemy(board[(r + dr) * 8 + c + dc]!, 'k')) return true;
  for (const [dr, dc] of BISHOP) {
    let rr = r + dr, cc = c + dc;
    while (inside(rr, cc)) {
      const p = board[rr * 8 + cc]!;
      if (p) {
        if (enemy(p, 'bq')) return true;
        break;
      }
      rr += dr;
      cc += dc;
    }
  }
  for (const [dr, dc] of ROOK) {
    let rr = r + dr, cc = c + dc;
    while (inside(rr, cc)) {
      const p = board[rr * 8 + cc]!;
      if (p) {
        if (enemy(p, 'rq')) return true;
        break;
      }
      rr += dr;
      cc += dc;
    }
  }
  return false;
}

export function kingSquare(board: Board, color: Color): number {
  return board.indexOf(color === 'w' ? 'K' : 'k');
}

export function inCheck(pos: Position, color = pos.turn): boolean {
  const k = kingSquare(pos.board, color);
  return k >= 0 && isAttacked(pos.board, k, color === 'w' ? 'b' : 'w');
}

function pseudoMoves(pos: Position): Move[] {
  const { board, turn } = pos;
  const out: Move[] = [];
  const push = (from: number, to: number, extra: Partial<Move> = {}) => out.push({ from, to, capture: board[to] !== '', ...extra });
  for (let i = 0; i < 64; i++) {
    const p = board[i]!;
    if (!p || colorOf(p) !== turn) continue;
    const r = row(i), c = col(i);
    const kind = p.toLowerCase();
    if (kind === 'p') {
      const dir = turn === 'w' ? -1 : 1;
      const startRow = turn === 'w' ? 6 : 1;
      const lastRow = turn === 'w' ? 0 : 7;
      const fr = r + dir;
      if (inside(fr, c) && board[fr * 8 + c] === '') {
        if (fr === lastRow) for (const promo of ['q', 'r', 'b', 'n']) push(i, fr * 8 + c, { promo: turn === 'w' ? promo.toUpperCase() : promo });
        else push(i, fr * 8 + c);
        if (r === startRow && board[(r + dir * 2) * 8 + c] === '') push(i, (r + dir * 2) * 8 + c);
      }
      for (const dc of [-1, 1]) {
        if (!inside(fr, c + dc)) continue;
        const t = fr * 8 + c + dc;
        const target = board[t]!;
        if (target && colorOf(target) !== turn) {
          if (fr === lastRow) for (const promo of ['q', 'r', 'b', 'n']) push(i, t, { promo: turn === 'w' ? promo.toUpperCase() : promo, capture: true });
          else push(i, t, { capture: true });
        } else if (pos.ep === t) push(i, t, { ep: true, capture: true });
      }
    } else if (kind === 'n' || kind === 'k') {
      for (const [dr, dc] of kind === 'n' ? KNIGHT : KING) {
        if (!inside(r + dr, c + dc)) continue;
        const t = (r + dr) * 8 + c + dc;
        if (board[t] === '' || colorOf(board[t]!) !== turn) push(i, t);
      }
      if (kind === 'k') {
        const enemy: Color = turn === 'w' ? 'b' : 'w';
        const home = turn === 'w' ? 60 : 4;
        if (i === home && !isAttacked(board, home, enemy)) {
          if (pos.castling.includes(turn === 'w' ? 'K' : 'k') && board[home + 1] === '' && board[home + 2] === '' && board[home + 3]?.toLowerCase() === 'r' && !isAttacked(board, home + 1, enemy) && !isAttacked(board, home + 2, enemy)) push(i, home + 2, { castle: 'K' });
          if (pos.castling.includes(turn === 'w' ? 'Q' : 'q') && board[home - 1] === '' && board[home - 2] === '' && board[home - 3] === '' && board[home - 4]?.toLowerCase() === 'r' && !isAttacked(board, home - 1, enemy) && !isAttacked(board, home - 2, enemy)) push(i, home - 2, { castle: 'Q' });
        }
      }
    } else {
      const dirs = kind === 'b' ? BISHOP : kind === 'r' ? ROOK : [...BISHOP, ...ROOK];
      for (const [dr, dc] of dirs) {
        let rr = r + dr, cc = c + dc;
        while (inside(rr, cc)) {
          const t = rr * 8 + cc;
          if (board[t] === '') push(i, t);
          else {
            if (colorOf(board[t]!) !== turn) push(i, t);
            break;
          }
          rr += dr;
          cc += dc;
        }
      }
    }
  }
  return out;
}

export function makeMove(pos: Position, m: Move): Position {
  const board = pos.board.slice();
  const p = board[m.from]!;
  const kind = p.toLowerCase();
  board[m.to] = m.promo ?? p;
  board[m.from] = '';
  if (m.ep) board[m.to + (pos.turn === 'w' ? 8 : -8)] = '';
  if (m.castle === 'K') {
    board[m.to - 1] = board[m.to + 1]!;
    board[m.to + 1] = '';
  } else if (m.castle === 'Q') {
    board[m.to + 1] = board[m.to - 2]!;
    board[m.to - 2] = '';
  }
  let castling = pos.castling;
  if (kind === 'k') castling = castling.replace(pos.turn === 'w' ? /[KQ]/g : /[kq]/g, '');
  const rookSquares: Record<number, string> = { 63: 'K', 56: 'Q', 7: 'k', 0: 'q' };
  for (const sq of [m.from, m.to]) if (rookSquares[sq]) castling = castling.replace(rookSquares[sq]!, '');
  const ep = kind === 'p' && Math.abs(m.to - m.from) === 16 ? (m.from + m.to) / 2 : null;
  return { board, turn: pos.turn === 'w' ? 'b' : 'w', castling, ep, halfmove: kind === 'p' || m.capture ? 0 : pos.halfmove + 1 };
}

export function legalMoves(pos: Position): Move[] {
  return pseudoMoves(pos).filter((m) => !inCheck(makeMove(pos, m), pos.turn));
}

export type Outcome = 'checkmate' | 'stalemate' | 'draw' | null;
export function outcome(pos: Position): Outcome {
  if (legalMoves(pos).length === 0) return inCheck(pos) ? 'checkmate' : 'stalemate';
  if (pos.halfmove >= 100) return 'draw';
  const pieces = pos.board.filter((p) => p && p.toLowerCase() !== 'k');
  if (pieces.length === 0 || (pieces.length === 1 && 'bn'.includes(pieces[0]!.toLowerCase()))) return 'draw';
  return null;
}

const VALUE: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
// Simple centre bonus table.
const CENTRE = [0, 1, 2, 3, 3, 2, 1, 0];

export function evaluate(pos: Position): number {
  let s = 0;
  for (let i = 0; i < 64; i++) {
    const p = pos.board[i]!;
    if (!p) continue;
    const v = VALUE[p.toLowerCase()]! + CENTRE[row(i)]! * CENTRE[col(i)]! * 2;
    s += colorOf(p) === 'w' ? v : -v;
  }
  return s;
}

function search(pos: Position, depth: number, alpha: number, beta: number): number {
  const moves = legalMoves(pos);
  if (moves.length === 0) return inCheck(pos) ? (pos.turn === 'w' ? -50_000 - depth : 50_000 + depth) : 0;
  if (depth === 0) return evaluate(pos);
  moves.sort((a, b) => Number(!!b.capture) - Number(!!a.capture));
  if (pos.turn === 'w') {
    let best = -Infinity;
    for (const m of moves) {
      best = Math.max(best, search(makeMove(pos, m), depth - 1, alpha, beta));
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  }
  let best = Infinity;
  for (const m of moves) {
    best = Math.min(best, search(makeMove(pos, m), depth - 1, alpha, beta));
    beta = Math.min(beta, best);
    if (beta <= alpha) break;
  }
  return best;
}

/** Computer move for the side to move. depth 1 = beginner (captures/random), 2 = club, 3 = advanced. */
export function computerMove(pos: Position, depth: number, random: () => number): Move | null {
  const moves = legalMoves(pos);
  if (moves.length === 0) return null;
  if (depth <= 1) {
    const mates = moves.filter((m) => outcome(makeMove(pos, m)) === 'checkmate');
    if (mates.length) return mates[0]!;
    const captures = moves.filter((m) => m.capture);
    const pool = captures.length && random() < 0.7 ? captures : moves;
    return pool[Math.floor(random() * pool.length)]!;
  }
  let best = moves[0]!;
  let bestV = pos.turn === 'w' ? -Infinity : Infinity;
  for (const m of moves) {
    const v = search(makeMove(pos, m), depth - 1, -Infinity, Infinity) + (random() - 0.5) * 10;
    if (pos.turn === 'w' ? v > bestV : v < bestV) {
      bestV = v;
      best = m;
    }
  }
  return best;
}

export const PIECE_GLYPH: Record<string, string> = { K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙', k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
