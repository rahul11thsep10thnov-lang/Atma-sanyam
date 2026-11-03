import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { P, FONT } from '../../ui/palette';
import { Hint, SmallChip, isLittle } from './common';
import type { ActivityProps } from './common';
import { gridCells } from './logic';

const ARROWS: { m: string; glyph: string; en: string; hi: string }[] = [{ m: 'U', glyph: '↑', en: 'up', hi: 'ऊपर' }, { m: 'L', glyph: '←', en: 'left', hi: 'बाएँ' }, { m: 'D', glyph: '↓', en: 'down', hi: 'नीचे' }, { m: 'R', glyph: '→', en: 'right', hi: 'दाएँ' }];

/** maze: arrow buttons move Chikki through the grid; reaching the carrot submits the move list. */
export function MazeActivity({ spec, level, prefs, onAnswer, result, disabled }: ActivityProps) {
  const little = isLittle(level);
  const grid = gridCells(spec.items);
  const [pos, setPos] = useState({ ...grid.start });
  const [moves, setMoves] = useState<string[]>([]);
  const [bump, setBump] = useState(false);
  const hi = prefs.primary === 'hi';
  const go = (m: string) => {
    if (disabled || result?.ok) return;
    const d: Record<string, [number, number]> = { U: [0, -1], R: [1, 0], D: [0, 1], L: [-1, 0] };
    const [dx, dy] = d[m];
    const nx = pos.x + dx, ny = pos.y + dy;
    if (nx < 0 || ny < 0 || nx >= grid.w || ny >= grid.h || grid.walls.has(`${nx},${ny}`)) { setBump(true); setTimeout(() => setBump(false), 300); return; }
    const next = [...moves, m];
    setPos({ x: nx, y: ny }); setMoves(next);
    if (nx === grid.goal.x && ny === grid.goal.y) onAnswer(next);
  };
  const cell = little ? 52 : 40;
  return (
    <>
      <Hint text={hi ? 'तीर दबाकर चिक्की को गाजर तक ले जाओ।' : 'Use the arrows to take Chikki to the carrot.'} />
      <View style={{ alignItems: 'center' }}>
        <View style={{ borderWidth: 3, borderColor: bump ? P.retry : P.line, borderRadius: 12, overflow: 'hidden' }}>
          {Array.from({ length: grid.h }, (_, y) => <View key={y} style={{ flexDirection: 'row' }}>{Array.from({ length: grid.w }, (_, x) => { const wall = grid.walls.has(`${x},${y}`); const goal = grid.goal.x === x && grid.goal.y === y; const here = pos.x === x && pos.y === y; return (
            <View key={x} style={{ width: cell, height: cell, backgroundColor: wall ? '#8B5A2B' : (x + y) % 2 ? '#EAF6E4' : '#F6FBF2', alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: cell * 0.55 }}>{here ? '🐇' : goal ? '🥕' : ''}</Text></View>); })}</View>)}
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
          {ARROWS.map((a) => <Pressable key={a.m} accessibilityRole="button" accessibilityLabel={hi ? a.hi : a.en} testID={`maze-${a.m}`} onPress={() => go(a.m)} style={({ pressed }) => ({ width: little ? 72 : 56, height: little ? 72 : 56, borderRadius: 16, backgroundColor: pressed ? P.saffron : P.card, borderWidth: 3, borderColor: P.line, alignItems: 'center', justifyContent: 'center' })}><Text style={{ fontFamily: FONT.displayHeavy, fontSize: 26, color: P.indigo }}>{a.glyph}</Text></Pressable>)}
        </View>
        {moves.length > 0 && !result?.ok ? <View style={{ marginTop: 8 }}><SmallChip label={hi ? 'शुरू से' : 'Start over'} onPress={() => { setPos({ ...grid.start }); setMoves([]); }} /></View> : null}
      </View>
    </>
  );
}
