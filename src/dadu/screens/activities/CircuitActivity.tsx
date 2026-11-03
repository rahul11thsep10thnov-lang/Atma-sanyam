import React, { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Rect } from 'react-native-svg';
import { P } from '../../ui/palette';
import { tx } from '../../i18n';
import { ChoiceCard, Grid, Hint, SmallChip, isLittle } from './common';
import type { ActivityProps } from './common';

/** circuit: choose the parts that make a closed loop; the bulb lights when the engine says the loop is closed. */
export function CircuitActivity({ spec, level, prefs, onAnswer, result, disabled }: ActivityProps) {
  const little = isLittle(level);
  const [chosen, setChosen] = useState<string[]>([]);
  const hi = prefs.primary === 'hi';
  const toggle = (k: string) => setChosen((c) => (c.includes(k) ? c.filter((x) => x !== k) : [...c, k]));
  const lit = !!result?.ok;
  return (
    <>
      <Hint text={hi ? 'घेरा पूरा करने वाले हिस्से चुनो, फिर "जोड़ो"।' : 'Choose the parts that close the loop, then "Connect".'} />
      <View style={{ alignItems: 'center', marginBottom: 8 }}>
        <Svg width={220} height={120} viewBox="0 0 220 120">
          <Rect x={20} y={20} width={180} height={80} rx={10} fill="none" stroke={lit ? P.ok : P.line} strokeWidth={6} strokeDasharray={lit ? undefined : '10 8'} />
          <Rect x={90} y={88} width={40} height={24} rx={4} fill="#3A2E2A" /><Line x1={100} y1={94} x2={120} y2={94} stroke="#4E9F3D" strokeWidth={3} />
          <Circle cx={110} cy={20} r={18} fill={lit ? '#FFE08A' : '#EAD9BF'} stroke={lit ? '#C98310' : P.line} strokeWidth={3} />
        </Svg>
      </View>
      <Grid columns={little ? 2 : 3}>
        {spec.items.map((it) => <ChoiceCard key={it.key} item={it} prefs={prefs} little={little} compact={!little} disabled={disabled || lit} testID={`choice-${it.key}`} state={chosen.includes(it.key) ? (result ? (it.group === 'break' ? 'no' : 'ok') : 'selected') : null} onPress={() => toggle(it.key)} badge={it.group === 'break' && result ? (hi ? 'टूटा' : 'break') : undefined} />)}
      </Grid>
      <View style={{ paddingHorizontal: 14, flexDirection: 'row', gap: 10 }}>
        <SmallChip label={hi ? 'जोड़ो' : 'Connect'} onPress={chosen.length && !lit ? () => onAnswer(chosen) : undefined} tone={chosen.length ? undefined : 'muted'} testID="circuit-connect" />
        {result && !lit ? <SmallChip label={hi ? 'फिर से' : 'Reset'} onPress={() => setChosen([])} /> : null}
      </View>
      {!little && chosen.length ? <Hint text={chosen.map((k) => tx(spec.items.find((i) => i.key === k)!.label, prefs)).join(' → ')} /> : null}
    </>
  );
}
