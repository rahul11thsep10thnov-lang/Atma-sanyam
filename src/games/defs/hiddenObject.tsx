// Find the Hidden Object: a busy scene of emoji; find the listed ones.
import React from 'react';
import { StyleSheet, Text, View as RNView } from 'react-native';
import type { GameDefinition, GameViewProps } from '../engine';
import { rng, shuffle, pick } from '../engine';
import { Tactile } from '../../ui';
import { Prompt } from '../shared/Board';

const SCENES = [
  { name: 'toy room', bg: '#FFF4CC', fill: ['🧸', '🚂', '🎲', '🪀', '🧩', '🎈', '📚', '🖍️', '🪁', '🎨', '🥁', '🎺', '🧃', '🧦', '🛼', '🪆'], targets: ['🚂', '🎲', '🧩', '🪁', '🥁', '🪆', '🛼', '🧃', '🎺'] },
  { name: 'jungle', bg: '#E6F8DA', fill: ['🌴', '🐒', '🦜', '🐍', '🦋', '🌺', '🐸', '🍌', '🦎', '🐆', '🌿', '🪲', '🦥', '🐘', '🍍', '🦚'], targets: ['🐒', '🦜', '🐸', '🦎', '🪲', '🦥', '🍍', '🐍', '🦚'] },
  { name: 'kitchen', bg: '#FFE7D6', fill: ['🍳', '🥄', '🧁', '🍎', '🥕', '🧀', '🍞', '🥛', '🍪', '🫖', '🍋', '🥦', '🧂', '🍯', '🥚', '🍓'], targets: ['🥄', '🧁', '🧀', '🫖', '🍋', '🧂', '🍯', '🥚', '🍪'] },
];
const COUNT: Record<string, number> = { easy: 4, normal: 6, hard: 9 };

interface Item { emoji: string; x: number; y: number; size: number; target: boolean; found: boolean }
export interface State { scene: number; items: Item[]; wrong: number }
export type Action = { type: 'tap'; index: number };

const def: GameDefinition<State, Action> = {
  id: 'hidden-object',
  init(ctx) {
    const random = rng(ctx.seed);
    const scene = SCENES.indexOf(pick(SCENES, random));
    const sc = SCENES[scene]!;
    const targets = new Set(shuffle(sc.targets, random).slice(0, COUNT[ctx.difficulty] ?? 6));
    const cells = shuffle([...Array(30).keys()], random);
    const items: Item[] = sc.fill.concat(sc.fill.slice(0, 8)).slice(0, 24).map((emoji, i) => {
      const c = cells[i]!;
      return { emoji, x: (c % 6) * 16.6 + 8 + (random() - 0.5) * 6, y: Math.floor(c / 6) * 20 + 10 + (random() - 0.5) * 6, size: 0.6 + random() * 0.5, target: false, found: false };
    });
    // Mark exactly one instance of each target.
    for (const t of targets) {
      const idx = items.findIndex((it) => it.emoji === t && !it.target);
      if (idx >= 0) items[idx]!.target = true;
    }
    return { scene, items, wrong: 0 };
  },
  reduce(state, action) {
    const it = state.items[action.index];
    if (!it || it.found) return state;
    if (!it.target) return { ...state, wrong: state.wrong + 1 };
    return { ...state, items: state.items.map((x, i) => (i === action.index ? { ...x, found: true } : x)) };
  },
  status(state) {
    const total = state.items.filter((i) => i.target).length;
    const found = state.items.filter((i) => i.found).length;
    return { phase: found === total ? 'won' : 'playing', score: found * 10 - state.wrong * 2, stars: state.wrong <= 1 ? 3 : state.wrong <= 4 ? 2 : 1, progress: found / total, hud: `${found}/${total}` };
  },
  View: HiddenView,
};

function HiddenView({ state, dispatch, width, height, readOnly, sfx, say }: GameViewProps<State, Action>) {
  const sc = SCENES[state.scene]!;
  const w = Math.min(width, 520);
  const h = Math.min(w * 1.05, height - 110);
  const remaining = state.items.filter((i) => i.target && !i.found);
  return (
    <RNView style={{ flex: 1, alignItems: 'center' }}>
      <Prompt emoji="🔎">Find: {remaining.map((i) => i.emoji).join(' ')}</Prompt>
      <RNView style={[styles.scene, { width: w, height: h, backgroundColor: sc.bg }]}>
        {state.items.map((it, i) => (
          <Tactile key={i} disabled={readOnly || it.found} haptic={false} onPress={() => { sfx(it.target ? 'good' : 'bad'); if (it.target) say('Found it!'); dispatch({ type: 'tap', index: i }); }} accessibilityRole="button" accessibilityLabel={it.emoji} style={[styles.item, { left: `${it.x - 7}%`, top: `${it.y - 8}%`, width: '14%', height: '16%' }]}>
            <RNView style={[styles.box, it.found && styles.found]}>
              <Text style={{ fontSize: h * 0.07 * it.size, transform: [{ rotate: `${(i * 37) % 40 - 20}deg` }] }}>{it.emoji}</Text>
            </RNView>
          </Tactile>
        ))}
      </RNView>
    </RNView>
  );
}

const styles = StyleSheet.create({
  scene: { borderRadius: 18, borderWidth: 3, borderColor: '#fff', overflow: 'hidden' },
  item: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  box: { borderRadius: 12, padding: 2 },
  found: { borderWidth: 3, borderColor: '#22A06B', backgroundColor: 'rgba(34,160,107,0.2)' },
});

export default def;
