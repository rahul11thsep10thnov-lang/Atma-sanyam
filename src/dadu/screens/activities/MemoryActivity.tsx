import React, { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { memoryFlip } from '../../engines/activities';
import type { MemoryState } from '../../engines/activities';
import { tx } from '../../i18n';
import { P, FONT } from '../../ui/palette';
import { ActivityIcon } from './icons';
import { Hint, isLittle } from './common';
import type { ActivityProps } from './common';

/** memory: flip two cards; a matching pair stays open. Reports each pair to onAnswer. */
export function MemoryActivity({ spec, level, prefs, onAnswer, disabled }: ActivityProps) {
  const little = isLittle(level);
  const cards = useMemo(() => { const a = [...spec.items]; for (let i = a.length - 1; i > 0; i--) { const j = (i * 7 + 3) % (i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }, [spec]);
  const [st, setSt] = useState<MemoryState>({ revealed: [], matched: [], moves: 0 });
  const [lastPair, setLastPair] = useState<string[]>([]);
  const hi = prefs.primary === 'hi';
  const flip = (k: string) => {
    if (disabled) return;
    const before = st.revealed;
    const r = memoryFlip(spec, st, k);
    setSt(r.state);
    if (before.length === 1) { setLastPair([before[0], k]); if (r.matched !== null) onAnswer([before[0], k]); setTimeout(() => setLastPair([]), 700); }
  };
  const cols = cards.length <= 6 ? 3 : 4;
  return (
    <>
      <Hint text={hi ? `चालें: ${st.moves} · जोड़ियाँ: ${st.matched.length / 2}/${cards.length / 2}` : `Moves: ${st.moves} · Pairs: ${st.matched.length / 2}/${cards.length / 2}`} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 14 }}>
        {cards.map((c) => {
          const open = st.revealed.includes(c.key) || st.matched.includes(c.key) || lastPair.includes(c.key);
          const done = st.matched.includes(c.key);
          return (
            <Pressable key={c.key} accessibilityRole="button" accessibilityLabel={open ? tx(c.label, prefs) : (hi ? 'बंद कार्ड' : 'face-down card')} onPress={() => flip(c.key)} disabled={open} testID={`choice-${c.key}`}
              style={{ width: `${100 / cols - 3}%`, flexGrow: 1, aspectRatio: 1, borderRadius: 16, borderWidth: 3, borderColor: done ? P.ok : open ? P.saffron : P.line, backgroundColor: done ? P.okSoft : open ? P.card : P.indigo, alignItems: 'center', justifyContent: 'center' }}>
              {open ? <ActivityIcon name={c.group ?? c.key} size={little ? 56 : 44} label={tx(c.label, prefs)} /> : <Text style={{ fontFamily: FONT.displayHeavy, color: '#fff', fontSize: 26 }}>?</Text>}
            </Pressable>
          );
        })}
      </View>
    </>
  );
}
