import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { expectedSequence } from '../../engines/activities';
import { tx } from '../../i18n';
import { P, FONT } from '../../ui/palette';
import { Hint, SmallChip, isLittle } from './common';
import type { ActivityProps } from './common';

const KEYS: { k: string; en: string; hi: string; c: string }[] = [
  { k: 'sa', en: 'Sa', hi: 'सा', c: '#E07A95' }, { k: 're', en: 'Re', hi: 'रे', c: '#F4A523' }, { k: 'ga', en: 'Ga', hi: 'गा', c: '#FFC94D' }, { k: 'ma', en: 'Ma', hi: 'मा', c: '#4E9F3D' },
  { k: 'pa', en: 'Pa', hi: 'पा', c: '#2E86AB' }, { k: 'dha', en: 'Dha', hi: 'धा', c: '#2F3C7E' }, { k: 'ni', en: 'Ni', hi: 'नी', c: '#8E4585' },
];

/** play-notes: a seven-key Sa–Ni keyboard (or the spec's own items when they are not swaras, e.g. flute holes). */
export function PlayNotesActivity({ spec, level, prefs, onAnswer, result, disabled }: ActivityProps) {
  const little = isLittle(level);
  const expected = expectedSequence(spec.items);
  const [played, setPlayed] = useState<string[]>([]);
  const hi = prefs.primary === 'hi';
  const swaraMode = expected.every((k) => KEYS.some((x) => x.k === k.replace(/_.*$/, '')));
  const keys = swaraMode ? KEYS : spec.items.filter((i) => i.order !== undefined).map((i) => ({ k: i.key, en: i.label.en, hi: i.label.hi ?? i.label.en, c: '#2E86AB' }));
  const press = (k: string) => {
    if (disabled || result?.ok) return;
    // allow a key to stand for octave variants such as 'sa_high'
    const target = expected[played.length];
    const token = target && target.replace(/_.*$/, '') === k ? target : k;
    const next = [...played, token];
    setPlayed(next);
    if (next.length === expected.length) onAnswer(next);
  };
  return (
    <>
      <Hint text={hi ? 'दिखाया हुआ क्रम बजाओ:' : 'Play the sequence shown:'} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 14, marginBottom: 10 }}>
        {expected.map((k, i) => { const it = spec.items.find((x) => x.key === k); const done = i < played.length; const right = played[i] === k; return <SmallChip key={`${k}${i}`} label={it ? tx(it.label, prefs) : k} tone={done ? (right ? 'ok' : 'muted') : undefined} />; })}
      </View>
      <View style={{ flexDirection: 'row', gap: 4, paddingHorizontal: 14, height: little ? 140 : 110 }}>
        {keys.map((key) => <Pressable key={key.k} accessibilityRole="button" accessibilityLabel={hi ? key.hi : key.en} testID={`choice-${key.k}`} onPress={() => press(key.k)}
          style={({ pressed }) => ({ flex: 1, borderRadius: 12, backgroundColor: pressed ? key.c : P.card, borderWidth: 3, borderColor: key.c, borderBottomWidth: pressed ? 3 : 8, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 8 })}>
          <Text style={{ fontFamily: FONT.displayHeavy, fontSize: little ? 20 : 14, color: P.ink }} numberOfLines={1}>{hi ? key.hi : key.en}</Text></Pressable>)}
      </View>
      {played.length > 0 && !result?.ok ? <View style={{ paddingHorizontal: 14, marginTop: 8 }}><SmallChip label={hi ? 'फिर से बजाओ' : 'Play again'} onPress={() => setPlayed([])} testID="notes-reset" /></View> : null}
    </>
  );
}
