import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { expectedSequence } from '../../engines/activities';
import { P, FONT } from '../../ui/palette';
import { Hint, SmallChip, isLittle } from './common';
import type { ActivityProps } from './common';

/** balance: tap Left / Right following the prompt (the expected order comes from the items). */
export function BalanceActivity({ spec, level, prefs, onAnswer, result, disabled }: ActivityProps) {
  const little = isLittle(level);
  const expected = expectedSequence(spec.items);
  const [steps, setSteps] = useState<string[]>([]);
  const hi = prefs.primary === 'hi';
  const tap = (k: string) => {
    if (disabled || result?.ok) return;
    const next = [...steps, k];
    setSteps(next);
    if (next.length === expected.length) onAnswer(next);
  };
  const labelOf = (k: string) => { const it = spec.items.find((i) => i.key === k); return it ? (hi ? it.label.hi ?? it.label.en : it.label.en) : k; };
  const sides = [...new Set(expected)];
  return (
    <>
      <Hint text={hi ? `बीम पर चलो: ${steps.length}/${expected.length} कदम` : `Walk the beam: ${steps.length}/${expected.length} steps`} />
      <View style={{ height: 12, marginHorizontal: 30, borderRadius: 6, backgroundColor: '#8B5A2B' }} />
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginVertical: 10, flexWrap: 'wrap', paddingHorizontal: 14 }}>
        {expected.map((k, i) => <View key={i} style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: i < steps.length ? (steps[i] === k ? P.ok : P.retry) : P.line }} />)}
      </View>
      <View style={{ flexDirection: 'row', gap: 16, paddingHorizontal: 14 }}>
        {sides.map((k) => <Pressable key={k} accessibilityRole="button" accessibilityLabel={labelOf(k)} testID={`choice-${k}`} onPress={() => tap(k)} style={({ pressed }) => ({ flex: 1, height: little ? 120 : 90, borderRadius: 24, backgroundColor: pressed ? P.saffron : P.marigold, borderBottomWidth: 6, borderBottomColor: '#C98310', alignItems: 'center', justifyContent: 'center' })}><Text style={{ fontFamily: FONT.displayHeavy, fontSize: little ? 24 : 18, color: '#2A1A05' }}>{labelOf(k)}</Text></Pressable>)}
      </View>
      {result && !result.ok ? <View style={{ paddingHorizontal: 14, marginTop: 10 }}><SmallChip label={hi ? 'फिर से चलो' : 'Walk again'} onPress={() => setSteps([])} /></View> : null}
    </>
  );
}
