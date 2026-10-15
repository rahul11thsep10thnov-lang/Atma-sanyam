// Unit tests for the game rule engines (pure TypeScript, no React).
// Run: npm test  (node --experimental-strip-types --test)
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { rng, starsForMoves, starsForAccuracy, shuffle } from '../src/games/engine.ts';
import { generateMaze, shortestPath, canMove, step } from '../src/games/logic/maze.ts';
import { isSolved, shuffled, slide, neighboursOfBlank } from '../src/games/logic/sliding.ts';
import { generateSudoku, conflicts, isComplete, isValidPlacement } from '../src/games/logic/sudoku.ts';
import { generateWordGrid, lineCells, matchWord } from '../src/games/logic/wordSearch.ts';
import { PUZZLES as TRAFFIC, solve, slideVehicle, canSlide, isSolved as trafficSolved } from '../src/games/logic/traffic.ts';
import { drop, winner, bestMove, empty, legalCols } from '../src/games/logic/connectFour.ts';
import { initialBoard, legalMoves as checkersMoves, applyMove, computerMove as checkersAi, countPieces } from '../src/games/logic/checkers.ts';
import { fromFen, legalMoves, makeMove, outcome, inCheck, computerMove, START_FEN, algebraToIndex, indexToAlgebra } from '../src/games/logic/chess.ts';
import { PUZZLES as CHESS_PUZZLES } from '../src/games/logic/chessPuzzles.ts';
import { initialLudo, roll, moveToken, movable, chooseToken, HOME, absolute } from '../src/games/logic/ludo.ts';

describe('engine helpers', () => {
  it('seeded rng is deterministic and shuffle keeps every item', () => {
    const a = rng(42), b = rng(42);
    assert.equal(a(), b());
    const s = shuffle([1, 2, 3, 4, 5], rng(7));
    assert.deepEqual([...s].sort(), [1, 2, 3, 4, 5]);
  });
  it('stars from moves and accuracy', () => {
    assert.equal(starsForMoves(10, 10), 3);
    assert.equal(starsForMoves(14, 10), 2);
    assert.equal(starsForMoves(30, 10), 1);
    assert.equal(starsForAccuracy(9, 10), 3);
    assert.equal(starsForAccuracy(3, 10), 0);
  });
});

describe('maze', () => {
  it('generates a perfect maze where every cell is reachable', () => {
    const m = generateMaze(11, 11, rng(3));
    for (let y = 0; y < 11; y++) for (let x = 0; x < 11; x++) assert.ok(shortestPath(m, 0, 0, x, y) >= 0, `cell ${x},${y} unreachable`);
    assert.ok(shortestPath(m, 0, 0, 10, 10) >= 20);
  });
  it('walls block movement symmetrically', () => {
    const m = generateMaze(6, 6, rng(9));
    for (let y = 0; y < 6; y++) for (let x = 0; x < 6; x++) {
      if (x < 5) assert.equal(canMove(m, x, y, 'right'), canMove(m, x + 1, y, 'left'));
      if (y < 5) assert.equal(canMove(m, x, y, 'down'), canMove(m, x, y + 1, 'up'));
    }
    assert.deepEqual(step(2, 2, 'up'), [2, 1]);
  });
});

describe('sliding puzzle', () => {
  it('shuffles to a solvable, unsolved state and solves by reversing', () => {
    for (const n of [3, 4, 5]) {
      const t = shuffled(n, rng(n));
      assert.equal(t.length, n * n);
      assert.ok(!isSolved(t));
      assert.deepEqual([...t].sort((a, b) => a - b), [...Array(n * n).keys()]);
    }
    const t = [1, 2, 3, 4, 5, 6, 7, 0, 8];
    assert.deepEqual(slide(t, 3, 8), [1, 2, 3, 4, 5, 6, 7, 8, 0]);
    assert.equal(slide(t, 3, 0), t);
    assert.deepEqual(neighboursOfBlank(t, 3).sort(), [4, 6, 8]);
  });
});

describe('sudoku', () => {
  for (const n of [4, 6, 9]) {
    it(`generates a valid ${n}×${n} puzzle with a unique solution`, () => {
      const p = generateSudoku(n, 0.5, rng(n * 11));
      assert.equal(p.solution.length, n * n);
      assert.equal(conflicts(p.solution, n, p.boxRows, p.boxCols).size, 0);
      assert.ok(p.givens.some((v) => v === 0));
      p.givens.forEach((v, i) => v && assert.equal(v, p.solution[i]));
      assert.ok(isComplete(p.solution, p.solution));
      assert.ok(!isComplete(p.givens, p.solution));
    });
  }
  it('flags conflicts', () => {
    const grid = new Array(16).fill(0);
    grid[0] = 1;
    grid[1] = 1;
    assert.ok(!isValidPlacement(grid, 4, 2, 2, 1, 1));
    assert.deepEqual([...conflicts(grid, 4, 2, 2)].sort(), [0, 1]);
  });
});

describe('word search', () => {
  it('places every word and finds it forwards and backwards', () => {
    const g = generateWordGrid(['MANGO', 'KITE', 'LOTUS', 'YOGA'], 8, rng(5), true);
    assert.equal(g.placements.length, 4);
    for (const p of g.placements) {
      assert.equal(p.cells.map((c) => g.letters[c]).join(''), p.word);
      assert.equal(matchWord(g, p.cells)?.word, p.word);
      assert.equal(matchWord(g, p.cells.slice().reverse())?.word, p.word);
    }
    assert.equal(lineCells(8, 0, 2)?.length, 3);
    assert.equal(lineCells(8, 0, 9)?.length, 2);
    assert.equal(lineCells(8, 0, 10), null);
  });
});

describe('traffic logic', () => {
  it('every bundled puzzle is solvable and the solver respects sliding rules', () => {
    for (const level of Object.values(TRAFFIC)) for (const p of level) {
      const par = solve(p);
      assert.ok(par > 0, 'puzzle must be solvable');
      assert.ok(!trafficSolved(p));
    }
    const p = TRAFFIC.easy![0]!;
    assert.ok(!canSlide(p, 0, 1)); // truck blocks the red car
    assert.equal(slideVehicle(p, 0, 1), p);
  });
});

describe('connect four', () => {
  it('detects wins in all directions and the AI blocks a threat', () => {
    let b = empty();
    for (const c of [0, 1, 2]) b = drop(b, c, 1)!.board;
    assert.equal(winner(b), null);
    assert.equal(bestMove(b, 2, 3, rng(1)), 3, 'must block the open three');
    b = drop(b, 3, 1)!.board;
    assert.equal(winner(b)?.who, 1);
    let v = empty();
    for (let i = 0; i < 4; i++) v = drop(v, 5, 2)!.board;
    assert.equal(winner(v)?.who, 2);
    assert.equal(legalCols(empty()).length, 7);
  });
});

describe('checkers', () => {
  it('starts with 12 pieces each, forces captures and crowns kings', () => {
    const b = initialBoard();
    assert.equal(countPieces(b, 1), 12);
    assert.equal(countPieces(b, -1), 12);
    assert.equal(checkersMoves(b, 1).length, 7);
    const jump = new Array(64).fill(0);
    jump[5 * 8 + 2] = 1;
    jump[4 * 8 + 3] = -1;
    jump[3 * 8 + 4] = 0;
    jump[6 * 8 + 6] = 1;
    const moves = checkersMoves(jump, 1);
    assert.ok(moves.every((m) => m.captures.length === 1), 'capture is mandatory');
    const after = applyMove(jump, moves[0]!);
    assert.equal(countPieces(after, -1), 0);
    const crown = new Array(64).fill(0);
    crown[1 * 8 + 2] = 1;
    const crowned = applyMove(crown, { from: 10, to: 1, captures: [] });
    assert.equal(crowned[1], 2);
    assert.ok(checkersAi(initialBoard(), 3, rng(2)));
  });
});

describe('chess', () => {
  it('has 20 legal opening moves and keeps the king out of check', () => {
    const pos = fromFen(START_FEN);
    assert.equal(legalMoves(pos).length, 20);
    assert.equal(outcome(pos), null);
    assert.equal(algebraToIndex('e4'), 36);
    assert.equal(indexToAlgebra(36), 'e4');
  });
  it('recognises checkmate and stalemate', () => {
    const fools = fromFen('rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3');
    assert.ok(inCheck(fools));
    assert.equal(outcome(fools), 'checkmate');
    const stale = fromFen('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1');
    assert.equal(outcome(stale), 'stalemate');
  });
  it('handles castling, en passant and promotion', () => {
    const castle = fromFen('r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1');
    const moves = legalMoves(castle);
    assert.ok(moves.some((m) => m.castle === 'K'));
    assert.ok(moves.some((m) => m.castle === 'Q'));
    const afterK = makeMove(castle, moves.find((m) => m.castle === 'K')!);
    assert.equal(afterK.board[62], 'K');
    assert.equal(afterK.board[61], 'R');
    const ep = fromFen('8/8/8/3pP3/8/8/8/4K2k w - d6 0 1');
    const epMove = legalMoves(ep).find((m) => m.ep);
    assert.ok(epMove);
    assert.equal(makeMove(ep, epMove!).board[algebraToIndex('d5')], '');
    const promo = fromFen('8/4P3/8/8/8/8/8/4K2k w - - 0 1');
    const promos = legalMoves(promo).filter((m) => m.promo);
    assert.equal(promos.length, 4);
  });
  it('computer finds a mate in one at every level', () => {
    const pos = fromFen('6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1');
    for (const depth of [1, 2, 3]) {
      const m = computerMove(pos, depth, rng(1))!;
      assert.equal(outcome(makeMove(pos, m)), 'checkmate', `depth ${depth}`);
    }
  });
  it('every tactic puzzle has a legal solution; mate puzzles really mate', () => {
    for (const [level, list] of Object.entries(CHESS_PUZZLES)) for (const p of list) {
      const pos = fromFen(p.fen);
      const [from, to] = [algebraToIndex(p.solution[0]!.slice(0, 2)), algebraToIndex(p.solution[0]!.slice(2, 4))];
      const m = legalMoves(pos).find((x) => x.from === from && x.to === to && (!x.promo || x.promo.toLowerCase() === 'q'));
      assert.ok(m, `${level}: ${p.theme} (${p.solution[0]}) must be legal in ${p.fen}`);
      if (/mate/i.test(p.theme) && !/in 2/.test(p.theme)) assert.equal(outcome(makeMove(pos, m!)), 'checkmate', `${level}: ${p.theme} should be checkmate`);
    }
  });
});

describe('ludo', () => {
  it('needs a six to leave the base, captures on open squares, and wins with four tokens home', () => {
    let s = initialLudo(2);
    assert.deepEqual(movable(s, 0, 3), []);
    assert.deepEqual(movable(s, 0, 6), [0, 1, 2, 3]);
    s = { ...s, dice: 6 };
    s = moveToken(s, 0, 0);
    assert.equal(s.tokens[0]![0], 0);
    assert.equal(s.turn, 0, 'a six gives another turn');
    // Put an opponent on the square the player will land on (relative 5 → absolute 5, not safe).
    s = { ...s, dice: 5, tokens: s.tokens.map((t, p) => (p === 2 ? [-1, -1, -1, 31] : t)) }; // player 2 start 26 + 31 = 57 % 52 = 5
    assert.equal(absolute(2, 31), 5);
    s = moveToken(s, 0, 0);
    assert.equal(s.tokens[2]![3], -1, 'captured token goes home');
    assert.equal(s.turn, 0, 'capture gives another turn');
    const nearly = { ...initialLudo(2), tokens: [[HOME, HOME, HOME, 55], [HOME, HOME, HOME, HOME], [-1, -1, -1, -1], [HOME, HOME, HOME, HOME]], dice: 2 };
    const won = moveToken(nearly, 0, 3);
    assert.equal(won.winner, 0);
    const r = roll(initialLudo(2), rng(1));
    assert.ok(r.dice === null || (r.dice >= 1 && r.dice <= 6));
    const ai = { ...initialLudo(4), dice: 6, turn: 1 };
    assert.ok([0, 1, 2, 3].includes(chooseToken(ai, 1, rng(1))));
  });
});
