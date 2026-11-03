import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { mixColours } from '../../engines/activities';
import { tx } from '../../i18n';
import { P, FONT } from '../../ui/palette';
import { Hint, SmallChip, isLittle } from './common';
import type { ActivityProps } from './common';

const SWATCH: Record<string, string> = { red: '#D9663D', blue: '#2E86AB', yellow: '#FFC94D', white: '#FFF8EE', orange: '#F4A523', green: '#4E9F3D', purple: '#8E4585', brown: '#8B5A2B', pink: '#F28DA6' };
const NAMES: Record<string, [string, string]> = { orange: ['Orange', 'नारंगी'], green: ['Green', 'हरा'], purple: ['Purple', 'बैंगनी'], brown: ['Brown', 'भूरा'], pink: ['Pink', 'गुलाबी'], red: ['Red', 'लाल'], blue: ['Blue', 'नीला'], yellow: ['Yellow', 'पीला'] };

/** mix-colours: choose two pots, see the mixed swatch, confirm. */
export function MixColoursActivity({ spec, level, prefs, onAnswer, result, disabled }: ActivityProps) {
  const little = isLittle(level);
  const [chosen, setChosen] = useState<string[]>([]);
  const pots = spec.items.filter((i) => !i.ok || SWATCH[i.key]).filter((i) => ['red', 'blue', 'yellow', 'white'].includes(i.key));
  const mixed = chosen.length ? mixColours(chosen) : null;
  const hi = prefs.primary === 'hi';
  const toggle = (k: string) => setChosen((c) => (c.includes(k) ? c.filter((x) => x !== k) : c.length < 3 ? [...c, k] : c));
  return (
    <>
      <Hint text={hi ? 'दो रंग चुनो और मिलाओ।' : 'Pick two colours and mix.'} />
      <View style={{ flexDirection: 'row', gap: 12, justifyContent: 'center', paddingHorizontal: 14 }}>
        {pots.map((p) => <Pressable key={p.key} accessibilityRole="button" accessibilityLabel={tx(p.label, prefs)} accessibilityState={{ selected: chosen.includes(p.key) }} testID={`choice-${p.key}`} disabled={disabled} onPress={() => toggle(p.key)}
          style={{ alignItems: 'center', gap: 4 }}><View style={{ width: little ? 84 : 64, height: little ? 84 : 64, borderRadius: 20, backgroundColor: SWATCH[p.key], borderWidth: 4, borderColor: chosen.includes(p.key) ? P.indigo : P.line }} /><Text style={{ fontFamily: FONT.display, color: P.ink }}>{tx(p.label, prefs)}</Text></Pressable>)}
      </View>
      <View style={{ alignItems: 'center', marginTop: 14, gap: 8 }}>
        <View style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: mixed ? SWATCH[mixed] : P.cream, borderWidth: 4, borderColor: result ? (result.ok ? P.ok : P.retry) : P.line, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: FONT.displayHeavy, color: mixed === 'yellow' || mixed === 'white' ? P.ink : '#fff', fontSize: 18 }}>{mixed ? (NAMES[mixed] ? NAMES[mixed][hi ? 1 : 0] : mixed) : '?'}</Text>
        </View>
        <SmallChip label={hi ? 'मिलाओ!' : 'Mix!'} onPress={chosen.length >= 2 && !result?.ok ? () => onAnswer(chosen) : undefined} tone={chosen.length < 2 ? 'muted' : undefined} testID="mix-go" />
        {result && !result.ok ? <SmallChip label={hi ? 'रंग बदलो' : 'Change colours'} onPress={() => setChosen([])} /> : null}
      </View>
    </>
  );
}
