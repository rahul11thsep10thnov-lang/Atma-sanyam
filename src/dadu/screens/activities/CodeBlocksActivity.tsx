import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { runCodeBlocks } from '../../engines/activities';
import { P, FONT } from '../../ui/palette';
import { Hint, SmallChip, isLittle } from './common';
import type { ActivityProps } from './common';
import { gridCells } from './logic';

const BLOCKS: { t: string; en: string; hi: string; c: string }[] = [
  { t: 'move', en: 'Move', hi: 'चलो', c: '#2E86AB' }, { t: 'left', en: 'Turn left', hi: 'बाएँ मुड़ो', c: '#8E4585' }, { t: 'right', en: 'Turn right', hi: 'दाएँ मुड़ो', c: '#E0901C' },
  { t: 'repeat:2:move', en: 'Repeat 2 × move', hi: '2 बार चलो', c: '#4E9F3D' }, { t: 'repeat:3:move', en: 'Repeat 3 × move', hi: '3 बार चलो', c: '#4E9F3D' },
];

/** code-blocks: build a program from blocks, run it on the grid, watch Buddy walk. */
export function CodeBlocksActivity({ spec, level, prefs, onAnswer, result, disabled }: ActivityProps) {
  const little = isLittle(level);
  const grid = gridCells(spec.items);
  const [program, setProgram] = useState<string[]>([]);
  const [path, setPath] = useState<{ x: number; y: number }[]>([{ ...grid.start }]);
  const [step, setStep] = useState(0);
  const hi = prefs.primary === 'hi';
  useEffect(() => { if (step < path.length - 1) { const t = setTimeout(() => setStep(step + 1), 350); return () => clearTimeout(t); } return undefined; }, [step, path]);
  const run = () => { const r = runCodeBlocks(spec.items, program); setPath(r.path); setStep(0); onAnswer(program); };
  const pos = path[Math.min(step, path.length - 1)];
  const cell = little ? 44 : 36;
  return (
    <>
      <Hint text={hi ? 'ब्लॉक जोड़ो, फिर चलाओ। गाजर तक पहुँचो।' : 'Add blocks, then run. Reach the carrot.'} />
      <View style={{ alignItems: 'center' }}>
        <View style={{ borderWidth: 3, borderColor: P.line, borderRadius: 12, overflow: 'hidden' }}>
          {Array.from({ length: grid.h }, (_, y) => <View key={y} style={{ flexDirection: 'row' }}>{Array.from({ length: grid.w }, (_, x) => { const wall = grid.walls.has(`${x},${y}`); const goal = grid.goal.x === x && grid.goal.y === y; const here = pos.x === x && pos.y === y; return (
            <View key={x} style={{ width: cell, height: cell, backgroundColor: wall ? '#8B5A2B' : (x + y) % 2 ? '#EAF6E4' : '#F6FBF2', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: cell * 0.55 }}>{here ? '🐕' : goal ? '🥕' : ''}</Text></View>); })}</View>)}
        </View>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 14, marginTop: 10, minHeight: 40 }}>
        {program.length === 0 ? <Text style={{ fontFamily: FONT.body, color: P.inkSoft }}>{hi ? 'प्रोग्राम खाली है' : 'Program is empty'}</Text> : program.map((t, i) => { const b = BLOCKS.find((x) => x.t === t); return <SmallChip key={i} label={`${i + 1}. ${b ? (hi ? b.hi : b.en) : t}`} onPress={() => setProgram((p) => p.filter((_, j) => j !== i))} />; })}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 14, marginTop: 8 }}>
        {BLOCKS.map((b) => <Pressable key={b.t} accessibilityRole="button" accessibilityLabel={hi ? b.hi : b.en} testID={`block-${b.t}`} disabled={disabled || program.length >= 12} onPress={() => setProgram((p) => [...p, b.t])} style={{ backgroundColor: b.c, borderRadius: 12, paddingHorizontal: 12, paddingVertical: little ? 14 : 10 }}><Text style={{ fontFamily: FONT.displayHeavy, color: '#fff' }}>{hi ? b.hi : b.en}</Text></Pressable>)}
      </View>
      <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 14, marginTop: 10 }}>
        <SmallChip label={hi ? '▶ चलाओ' : '▶ Run'} onPress={program.length && !result?.ok ? run : undefined} tone={program.length ? undefined : 'muted'} testID="code-run" />
        <SmallChip label={hi ? 'साफ़' : 'Clear'} onPress={() => { setProgram([]); setPath([{ ...grid.start }]); setStep(0); }} />
      </View>
    </>
  );
}
