// Chess against the computer, with legal-move highlights. The tutorial level
// explains each piece as it is selected.
import React, { useEffect } from 'react';
import { StyleSheet, Text, View as RNView } from 'react-native';
import type { GameDefinition, GameViewProps } from '../engine';
import { rng } from '../engine';
import { computerMove, fromFen, inCheck, legalMoves, makeMove, outcome, PIECE_GLYPH, START_FEN, type Move, type Position } from '../logic/chess';
import { Tactile } from '../../ui';
import { Prompt } from '../shared/Board';

const DEPTH: Record<string, number> = { tutorial: 1, easy: 1, normal: 2, hard: 3 };
const PIECE_TIPS: Record<string, string> = { p: 'Pawns move forward one square (two from the start) and capture diagonally.', n: 'Knights jump in an L shape and can hop over pieces.', b: 'Bishops slide diagonally.', r: 'Rooks slide along rows and columns.', q: 'The queen slides in any direction.', k: 'The king moves one square in any direction. Keep it safe!' };

export interface State { pos: Position; selected: number | null; depth: number; seed: number; moves: number; last: Move | null; promo: Move[] | null }
export type Action = { type: 'select'; index: number } | { type: 'promote'; piece: string } | { type: 'ai' };

const def: GameDefinition<State, Action> = {
  id: 'chess',
  init: (ctx) => ({ pos: fromFen(START_FEN), selected: null, depth: DEPTH[ctx.difficulty] ?? 2, seed: ctx.seed, moves: 0, last: null, promo: null }),
  reduce(state, action) {
    if (outcome(state.pos)) return state;
    if (action.type === 'ai') {
      if (state.pos.turn !== 'b') return state;
      const m = computerMove(state.pos, state.depth, rng(state.seed + state.moves));
      return m ? { ...state, pos: makeMove(state.pos, m), moves: state.moves + 1, last: m, selected: null } : state;
    }
    if (state.pos.turn !== 'w') return state;
    if (action.type === 'promote') {
      const m = state.promo?.find((x) => x.promo === action.piece);
      return m ? { ...state, pos: makeMove(state.pos, m), moves: state.moves + 1, last: m, selected: null, promo: null } : state;
    }
    const moves = legalMoves(state.pos);
    if (state.selected !== null) {
      const candidates = moves.filter((m) => m.from === state.selected && m.to === action.index);
      if (candidates.length === 1) return { ...state, pos: makeMove(state.pos, candidates[0]!), moves: state.moves + 1, last: candidates[0]!, selected: null };
      if (candidates.length > 1) return { ...state, promo: candidates };
    }
    const p = state.pos.board[action.index]!;
    if (p && p === p.toUpperCase() && moves.some((m) => m.from === action.index)) return { ...state, selected: action.index };
    return { ...state, selected: null };
  },
  status(state) {
    const o = outcome(state.pos);
    if (o === 'checkmate') return state.pos.turn === 'b' ? { phase: 'won', score: Math.max(10, 200 - state.moves), stars: state.depth >= 3 ? 3 : state.depth >= 2 ? 2 : 1, hud: 'Checkmate! You win' } : { phase: 'lost', score: 0, hud: 'Checkmate' };
    if (o) return { phase: 'won', score: 30, stars: 1, hud: o === 'stalemate' ? 'Stalemate — draw' : 'Draw' };
    return { phase: 'playing', hud: `${state.pos.turn === 'w' ? 'Your move' : 'Robot thinking…'}${inCheck(state.pos) ? ' · check!' : ''}` };
  },
  View: ChessView,
};

function ChessView({ state, dispatch, width, readOnly, sfx, say, ctx }: GameViewProps<State, Action>) {
  useEffect(() => {
    if (readOnly || state.pos.turn !== 'b' || outcome(state.pos)) return;
    const id = setTimeout(() => dispatch({ type: 'ai' }), 500);
    return () => clearTimeout(id);
  }, [state.pos, dispatch, readOnly]);
  const cell = Math.min(width, 520) / 8;
  const moves = state.pos.turn === 'w' ? legalMoves(state.pos) : [];
  const targets = new Set(moves.filter((m) => m.from === state.selected).map((m) => m.to));
  const check = inCheck(state.pos);
  const kingSq = state.pos.board.indexOf(state.pos.turn === 'w' ? 'K' : 'k');
  const selectedPiece = state.selected !== null ? state.pos.board[state.selected]! : '';
  return (
    <RNView style={{ alignItems: 'center' }}>
      <Prompt emoji="♟️">{ctx.difficulty === 'tutorial' && selectedPiece ? PIECE_TIPS[selectedPiece.toLowerCase()] : state.pos.turn === 'w' ? (check ? 'Check! Protect your king.' : 'Your move (white)') : 'Robot is thinking…'}</Prompt>
      <RNView style={[styles.board, { width: cell * 8, height: cell * 8 }]}>
        {state.pos.board.map((p, i) => {
          const dark = (Math.floor(i / 8) + (i % 8)) % 2 === 1;
          const isLast = state.last && (state.last.from === i || state.last.to === i);
          return (
            <Tactile key={i} haptic={false} disabled={readOnly} onPress={() => { sfx('tap'); if (ctx.difficulty === 'tutorial' && p && p === p.toUpperCase()) say(PIECE_TIPS[p.toLowerCase()] ?? ''); dispatch({ type: 'select', index: i }); }} accessibilityRole="button" accessibilityLabel={`${String.fromCharCode(97 + (i % 8))}${8 - Math.floor(i / 8)}${p ? ` ${p}` : ''}`} style={{ width: cell, height: cell }}>
              <RNView style={[styles.cell, { backgroundColor: state.selected === i ? '#FFC93C' : check && i === kingSq ? '#FF5F6D' : isLast ? (dark ? '#9AC2E6' : '#C7E0F5') : dark ? '#7C5CFF' : '#ECE3FF' }]}>
                {targets.has(i) && <RNView style={[styles.dot, { width: cell * 0.28, height: cell * 0.28, backgroundColor: p ? 'rgba(229,72,77,0.7)' : 'rgba(46,42,74,0.35)' }]} />}
                {!!p && <Text style={{ fontSize: cell * 0.72, color: p === p.toUpperCase() ? '#fff' : '#1E1B3A', textShadowColor: p === p.toUpperCase() ? '#1E1B3A' : '#fff', textShadowRadius: 2 }}>{PIECE_GLYPH[p]}</Text>}
              </RNView>
            </Tactile>
          );
        })}
      </RNView>
      {state.promo && (
        <RNView style={styles.promo}>
          <Text style={styles.promoLabel}>Promote to:</Text>
          {['Q', 'R', 'B', 'N'].map((p) => (
            <Tactile key={p} onPress={() => dispatch({ type: 'promote', piece: p })} accessibilityRole="button" accessibilityLabel={p}><Text style={{ fontSize: 36 }}>{PIECE_GLYPH[p]}</Text></Tactile>
          ))}
        </RNView>
      )}
    </RNView>
  );
}

const styles = StyleSheet.create({
  board: { flexDirection: 'row', flexWrap: 'wrap', borderRadius: 10, overflow: 'hidden', borderWidth: 4, borderColor: '#2E2A4A' },
  cell: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', borderRadius: 999 },
  promo: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 16, padding: 10, marginTop: 10 },
  promoLabel: { fontFamily: 'Nunito_700Bold' },
});

export default def;
