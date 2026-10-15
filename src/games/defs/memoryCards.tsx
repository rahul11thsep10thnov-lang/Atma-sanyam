// Memory Cards: cards face down, flip two, matches stay open.
import React, { useEffect } from 'react';
import { StyleSheet, Text, View as RNView } from 'react-native';
import type { GameDefinition, GameViewProps } from '../engine';
import { rng, shuffle, starsForMoves } from '../engine';
import { Tactile } from '../../ui';
import { rainbow } from '../../theme/palette';

const EMOJI = ['🐥', '🐶', '🐱', '🐸', '🐘', '🦁', '🐼', '🐨', '🦋', '🐢', '🍎', '🍌', '🚗', '⭐', '🌈', '🎈', '🦊', '🐙', '🍓', '🍉', '🚀', '⚽', '🎸', '🌻'];
const PAIRS: Record<string, number> = { easy: 4, normal: 8, hard: 12, expert: 18 };

interface Card { id: number; face: number; up: boolean; matched: boolean }
export interface State { cards: Card[]; open: number[]; moves: number; pairs: number; cols: number; pendingHide: boolean }
export type Action = { type: 'flip'; id: number } | { type: 'hide' };

const def: GameDefinition<State, Action> = {
  id: 'memory-cards',
  init(ctx) {
    const random = rng(ctx.seed);
    const pairs = PAIRS[ctx.difficulty] ?? 8;
    const faces = shuffle([...EMOJI.keys()], random).slice(0, pairs);
    const cards = shuffle(faces.flatMap((f) => [f, f]).map((face, id) => ({ id, face, up: false, matched: false })), random);
    const cols = pairs <= 4 ? 4 : pairs <= 8 ? 4 : pairs <= 12 ? 4 : 6;
    return { cards, open: [], moves: 0, pairs, cols, pendingHide: false };
  },
  reduce(state, action) {
    if (action.type === 'hide') {
      return { ...state, cards: state.cards.map((c) => (state.open.includes(c.id) && !c.matched ? { ...c, up: false } : c)), open: [], pendingHide: false };
    }
    if (state.pendingHide) return state;
    const card = state.cards.find((c) => c.id === action.id);
    if (!card || card.up || card.matched || state.open.length >= 2) return state;
    const open = [...state.open, card.id];
    let cards = state.cards.map((c) => (c.id === card.id ? { ...c, up: true } : c));
    if (open.length === 2) {
      const [a, b] = open.map((id) => cards.find((c) => c.id === id)!);
      const match = a!.face === b!.face;
      if (match) cards = cards.map((c) => (open.includes(c.id) ? { ...c, matched: true } : c));
      return { ...state, cards, open: match ? [] : open, moves: state.moves + 1, pendingHide: !match };
    }
    return { ...state, cards, open };
  },
  status(state) {
    const done = state.cards.every((c) => c.matched);
    const par = Math.round(state.pairs * 1.6);
    return { phase: done ? 'won' : 'playing', score: Math.max(0, state.pairs * 20 - Math.max(0, state.moves - state.pairs) * 3), stars: starsForMoves(state.moves, par), progress: state.cards.filter((c) => c.matched).length / state.cards.length, hud: `Moves ${state.moves}` };
  },
  View: MemoryView,
};

function MemoryView({ state, dispatch, width, height, readOnly, sfx }: GameViewProps<State, Action>) {
  useEffect(() => {
    if (!state.pendingHide || readOnly) return;
    const id = setTimeout(() => dispatch({ type: 'hide' }), 800);
    return () => clearTimeout(id);
  }, [state.pendingHide, dispatch, readOnly]);
  const cols = state.cols;
  const rows = Math.ceil(state.cards.length / cols);
  const gap = 8;
  const size = Math.floor(Math.min((width - gap * (cols + 1)) / cols, (height - gap * (rows + 1)) / rows));
  return (
    <RNView style={[styles.grid, { gap, padding: gap }]}>
      {state.cards.map((c, i) => (
        <Tactile key={c.id} disabled={readOnly || c.up || c.matched} onPress={() => { sfx('tap'); dispatch({ type: 'flip', id: c.id }); }} accessibilityRole="button" accessibilityLabel={c.up || c.matched ? EMOJI[c.face] : 'Face-down card'} style={{ width: size, height: size }}>
          <RNView style={[styles.card, { backgroundColor: c.up || c.matched ? '#fff' : rainbow[i % rainbow.length], borderColor: c.matched ? '#22A06B' : 'rgba(0,0,0,0.12)', opacity: c.matched ? 0.75 : 1 }]}>
            {c.up || c.matched ? <Text style={{ fontSize: size * 0.55 }}>{EMOJI[c.face]}</Text> : <Text style={{ fontSize: size * 0.4, color: 'rgba(255,255,255,0.8)' }}>?</Text>}
          </RNView>
        </Tactile>
      ))}
    </RNView>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignContent: 'center', flex: 1 },
  card: { flex: 1, borderRadius: 16, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
});

export default def;
