import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useDadu } from '../../state/DaduContext';
import { ui } from '../../i18n';
import { P, FONT } from '../../ui/palette';
import { Body, Heading, KeyPad } from '../../ui';
import { hashPin } from '../../state/persistence';
import type { DaduStackParamList } from '../../navigation/types';

/** Parental gate: a worded two-digit product, then the parent PIN. Nothing behind it is reachable by a child. */
export function ParentGateScreen() {
  const nav = useNavigation<NativeStackNavigationProp<DaduStackParamList>>();
  const route = useRoute<RouteProp<DaduStackParamList, 'ParentGate'>>();
  const { prefs, parent } = useDadu();
  const [a, b] = useMemo(() => [4 + Math.floor(Math.random() * 6), 4 + Math.floor(Math.random() * 6)], []);
  const [stage, setStage] = useState<'maths' | 'pin'>('maths');
  const [entry, setEntry] = useState('');
  const [wrong, setWrong] = useState(false);
  const [fails, setFails] = useState(0);
  const next = route.params?.next ?? 'ParentDashboard';
  const submit = async (value: string) => {
    if (stage === 'maths') {
      if (Number(value) === a * b) { setStage(parent.pinHash ? 'pin' : 'maths'); setEntry(''); if (!parent.pinHash) nav.replace(next); }
      else { setWrong(true); setEntry(''); setFails((f) => f + 1); }
      return;
    }
    if ((await hashPin(value)) === parent.pinHash) nav.replace(next);
    else { setWrong(true); setEntry(''); setFails((f) => f + 1); }
  };
  const onKey = (k: string) => {
    setWrong(false);
    const max = stage === 'maths' ? String(a * b).length : 4;
    const v = k === '⌫' ? entry.slice(0, -1) : entry.length < max ? entry + k : entry;
    setEntry(v);
    if (v.length === max) void submit(v);
  };
  const locked = fails >= 5;
  return (
    <View style={s.wrap} testID="screen-parent-gate">
      <Heading>{ui('parent.gate', prefs)}</Heading>
      <Body tone="soft" style={{ textAlign: 'center' }}>{stage === 'maths' ? ui('parent.gateQuestion', prefs, { a, b }) : (prefs.primary === 'hi' ? 'अभिभावक पिन' : 'Parent PIN')}</Body>
      <Text style={s.dots} accessibilityLabel="entry">{stage === 'pin' ? '●'.repeat(entry.length).padEnd(4, '○') : entry || ' '}</Text>
      {locked ? <Body style={{ color: P.clay, textAlign: 'center' }}>{prefs.primary === 'hi' ? 'बहुत प्रयास। कुछ देर बाद फिर से।' : 'Too many tries. Please come back in a little while.'}</Body> : <KeyPad onKey={onKey} />}
      {wrong && !locked ? <Body style={{ color: P.clay, textAlign: 'center', marginTop: 8 }}>{ui('parent.gateWrong', prefs)}</Body> : null}
    </View>
  );
}
const s = StyleSheet.create({ wrap: { flex: 1, backgroundColor: P.paper, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 }, dots: { fontFamily: FONT.display, fontSize: 30, letterSpacing: 8, color: P.indigo, minHeight: 44 } });
