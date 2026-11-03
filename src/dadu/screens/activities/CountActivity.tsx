import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { tx } from '../../i18n';
import { P, FONT } from '../../ui/palette';
import { ActivityIcon } from './icons';
import { Hint, SmallChip, isLittle } from './common';
import type { ActivityProps } from './common';

/** count: tap each object once (it gets a number), then choose how many. */
export function CountActivity({ spec, level, prefs, onAnswer, result, disabled }: ActivityProps) {
  const little = isLittle(level);
  const [tapped, setTapped] = useState<string[]>([]);
  const [answer, setAnswer] = useState<number | null>(null);
  const total = spec.items.length;
  const expected = spec.items.filter((i) => i.ok).length;
  const options = Array.from(new Set([expected, Math.max(1, expected - 1), expected + 1, expected + 2])).sort((a, b) => a - b).slice(0, little ? 3 : 4);
  const hi = prefs.primary === 'hi';
  return (
    <>
      <Hint text={hi ? 'हर चीज़ को एक बार छुओ, फिर संख्या चुनो।' : 'Tap each one once, then choose the number.'} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 14, justifyContent: 'center' }}>
        {spec.items.map((it) => { const n = tapped.indexOf(it.key); return (
          <Pressable key={it.key} accessibilityRole="button" accessibilityLabel={tx(it.label, prefs)} testID={`choice-${it.key}`} disabled={disabled} onPress={() => setTapped((t) => (t.includes(it.key) ? t.filter((x) => x !== it.key) : [...t, it.key]))}
            style={{ width: total > 6 ? 64 : little ? 96 : 76, alignItems: 'center', borderRadius: 16, borderWidth: 3, borderColor: n >= 0 ? P.saffron : P.line, backgroundColor: n >= 0 ? '#FFF3D6' : P.card, padding: 4, opacity: it.ok === false ? 0.6 : 1 }}>
            <ActivityIcon name={it.icon ?? it.label.en.toLowerCase()} size={total > 6 ? 44 : little ? 72 : 56} label={tx(it.label, prefs)} />
            {n >= 0 ? <Text style={{ fontFamily: FONT.displayHeavy, color: P.indigo, fontSize: 18 }}>{n + 1}</Text> : null}
          </Pressable>); })}
      </View>
      <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 14, marginTop: 12, justifyContent: 'center' }}>
        {options.map((o) => <Pressable key={o} accessibilityRole="button" accessibilityLabel={String(o)} testID={`choice-${o}`} disabled={disabled || result?.ok === true} onPress={() => { setAnswer(o); onAnswer(o); }}
          style={{ width: little ? 72 : 60, height: little ? 72 : 60, borderRadius: 18, borderWidth: 3, alignItems: 'center', justifyContent: 'center', borderColor: answer === o ? (result ? (result.ok ? P.ok : P.retry) : P.saffron) : P.line, backgroundColor: answer === o ? (result ? (result.ok ? P.okSoft : P.retrySoft) : '#FFF3D6') : P.card }}>
          <Text style={{ fontFamily: FONT.displayHeavy, fontSize: little ? 30 : 24, color: P.ink }}>{o}</Text></Pressable>)}
      </View>
      {tapped.length > 0 && !result?.ok ? <View style={{ paddingHorizontal: 14, marginTop: 8 }}><SmallChip label={hi ? 'फिर से गिनो' : 'Count again'} onPress={() => { setTapped([]); setAnswer(null); }} /></View> : null}
    </>
  );
}
