// Spot the Difference: two scenes built from emoji sprites; a few sprites in
// the bottom scene are changed. Tap a changed one.
import React from 'react';
import { StyleSheet, Text, View as RNView } from 'react-native';
import type { GameDefinition, GameViewProps } from '../engine';
import { rng, shuffle, pick } from '../engine';
import { Tactile } from '../../ui';
import { Prompt } from '../shared/Board';

const SCENES: { name: string; bg: string; sprites: string[] }[] = [
  { name: 'farm', bg: '#E6F8DA', sprites: ['🐄', '🐓', '🌻', '🚜', '🐑', '🌳', '🏠', '🐖', '🌾', '🦆', '🐕', '☀️'] },
  { name: 'ocean', bg: '#DDEEFF', sprites: ['🐟', '🐙', '🐬', '🐚', '🦀', '🌊', '⛵', '🐠', '🪸', '🐢', '🦑', '🏝️'] },
  { name: 'space', bg: '#ECE3FF', sprites: ['🚀', '🪐', '⭐', '👩‍🚀', '🛸', '🌙', '☄️', '🛰️', '🌍', '👽', '🔭', '✨'] },
  { name: 'party', bg: '#FFE3EC', sprites: ['🎈', '🎂', '🎁', '🎉', '🧁', '🎀', '🪅', '🍭', '🎊', '🧸', '🍬', '🎈'] },
];
const ALT = ['🍎', '🐸', '🦋', '🌈', '🍄', '🐞', '🎃', '🧩', '🐥', '⚽', '🪁', '🍉'];
const DIFFS: Record<string, number> = { easy: 3, normal: 5, hard: 7 };

interface Sprite { emoji: string; x: number; y: number; changed: boolean; found: boolean }
export interface State { scene: number; sprites: Sprite[]; wrong: number; lives: number }
export type Action = { type: 'tap'; index: number };

const def: GameDefinition<State, Action> = {
  id: 'spot-the-difference',
  init(ctx) {
    const random = rng(ctx.seed);
    const scene = SCENES.indexOf(pick(SCENES, random));
    const n = DIFFS[ctx.difficulty] ?? 5;
    const cells = shuffle([...Array(12).keys()], random);
    const changedIdx = new Set(cells.slice(0, n));
    const sprites = SCENES[scene]!.sprites.map((emoji, i) => ({ emoji, x: (i % 4) * 25 + 12.5 + (random() - 0.5) * 8, y: Math.floor(i / 4) * 33 + 16 + (random() - 0.5) * 8, changed: changedIdx.has(i), found: false }));
    return { scene, sprites, wrong: 0, lives: n + 2 };
  },
  reduce(state, action) {
    const s = state.sprites[action.index];
    if (!s || s.found) return state;
    if (!s.changed) return { ...state, wrong: state.wrong + 1, lives: state.lives - 1 };
    return { ...state, sprites: state.sprites.map((x, i) => (i === action.index ? { ...x, found: true } : x)) };
  },
  status(state) {
    const total = state.sprites.filter((s) => s.changed).length;
    const found = state.sprites.filter((s) => s.found).length;
    return { phase: found === total ? 'won' : state.lives <= 0 ? 'lost' : 'playing', score: found * 10 - state.wrong * 3, stars: state.wrong === 0 ? 3 : state.wrong <= 2 ? 2 : 1, progress: found / total, hud: `${found}/${total} · ${'❤️'.repeat(Math.max(0, state.lives))}` };
  },
  View: SpotView,
};

function Scene({ state, width, altered, onTap, readOnly }: { state: State; width: number; altered: boolean; onTap?: (i: number) => void; readOnly?: boolean }) {
  const scene = SCENES[state.scene]!;
  const h = width * 0.48;
  const random = rng(state.scene * 999 + 7);
  const alts = ALT.slice();
  return (
    <RNView style={[styles.scene, { width, height: h, backgroundColor: scene.bg }]}>
      {state.sprites.map((s, i) => {
        const show = altered && s.changed ? alts[(i * 5 + Math.floor(random() * 3)) % alts.length]! : s.emoji;
        return (
          <Tactile key={i} disabled={!altered || readOnly || s.found} onPress={() => onTap?.(i)} accessibilityRole="button" accessibilityLabel={show} haptic={false} style={[styles.sprite, { left: `${s.x - 8}%`, top: `${s.y - 12}%`, width: '16%', height: '24%' }]}>
            <RNView style={[styles.spriteBox, s.found && styles.found]}>
              <Text style={{ fontSize: h * 0.16 }}>{show}</Text>
            </RNView>
          </Tactile>
        );
      })}
    </RNView>
  );
}

function SpotView({ state, dispatch, width, readOnly, sfx }: GameViewProps<State, Action>) {
  const w = Math.min(width, 520);
  return (
    <RNView style={{ flex: 1, alignItems: 'center' }}>
      <Prompt emoji="👀">Tap what changed in the bottom picture</Prompt>
      <Scene state={state} width={w} altered={false} />
      <RNView style={{ height: 10 }} />
      <Scene state={state} width={w} altered readOnly={readOnly} onTap={(i) => { sfx(state.sprites[i]!.changed ? 'good' : 'bad'); dispatch({ type: 'tap', index: i }); }} />
    </RNView>
  );
}

const styles = StyleSheet.create({
  scene: { borderRadius: 16, borderWidth: 3, borderColor: '#fff', overflow: 'hidden' },
  sprite: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  spriteBox: { borderRadius: 12, padding: 2 },
  found: { borderWidth: 3, borderColor: '#22A06B', backgroundColor: 'rgba(34,160,107,0.15)' },
});

export default def;
