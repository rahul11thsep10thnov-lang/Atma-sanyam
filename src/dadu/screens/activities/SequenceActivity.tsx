import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { tx } from '../../i18n';
import { ChoiceCard, Grid, Hint, SmallChip, isLittle, s } from './common';
import type { ActivityProps } from './common';
import { expectedSequence } from '../../engines/activities';

/** sequence, plant, cook: tap the steps in order. The growing sequence is shown; undo removes the last. */
export function SequenceActivity({ spec, level, prefs, onAnswer, result, disabled }: ActivityProps) {
  const little = isLittle(level);
  const [seq, setSeq] = useState<string[]>([]);
  const expected = expectedSequence(spec.items);
  const pool = spec.items.filter((i) => i.order !== undefined);
  const hi = prefs.primary === 'hi';
  const add = (k: string) => {
    const next = [...seq, k];
    setSeq(next);
    if (next.length === expected.length) onAnswer(next);
  };
  const verb = spec.kind === 'cook' ? (hi ? 'पकाने के कदम क्रम में छुओ।' : 'Tap the cooking steps in order.') : spec.kind === 'plant' ? (hi ? 'बोने के कदम क्रम में छुओ।' : 'Tap the planting steps in order.') : hi ? 'क्रम में छुओ।' : 'Tap them in order.';
  return (
    <>
      <Hint text={verb} />
      <View style={[s.grid, { marginBottom: 8, alignItems: 'center' }]}>
        {seq.length === 0 ? <Text style={s.hint}>{hi ? '1 → 2 → 3 …' : '1 → 2 → 3 …'}</Text> : seq.map((k, i) => { const it = spec.items.find((x) => x.key === k); return <SmallChip key={`${k}${i}`} label={`${i + 1}. ${it ? tx(it.label, prefs) : k}`} tone={result ? (expected[i] === k ? 'ok' : 'muted') : undefined} />; })}
        {seq.length > 0 && !result?.ok ? <SmallChip label={hi ? 'पीछे' : 'Undo'} onPress={() => setSeq(seq.slice(0, -1))} testID="seq-undo" /> : null}
      </View>
      <Grid columns={little ? 2 : 3}>
        {pool.filter((i) => !seq.includes(i.key)).map((it) => <ChoiceCard key={it.key} item={it} prefs={prefs} little={little} compact={!little} disabled={disabled || result?.ok === true} testID={`choice-${it.key}`} onPress={() => add(it.key)} />)}
      </Grid>
      {result && !result.ok ? <View style={{ paddingHorizontal: 14 }}><SmallChip label={hi ? 'फिर से शुरू' : 'Start over'} onPress={() => setSeq([])} testID="seq-reset" /></View> : null}
    </>
  );
}
