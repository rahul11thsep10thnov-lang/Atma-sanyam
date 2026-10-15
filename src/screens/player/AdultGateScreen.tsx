// A small sum before anything a child should not do alone (opening the
// Guardian Console or signing the player out). Not security — the real
// guard is the guardian's password and code — just a speed bump.
import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../../navigation/types';
import { AppText, BigButton, PlayfulBackdrop, PopIn, RoundButton } from '../../ui';
import { palette } from '../../theme/palette';
import { space } from '../../theme/spacing';
import { t } from '../../i18n';

export function AdultGateScreen({ navigation, route }: NativeStackScreenProps<RootStackParamList, 'AdultGate'>) {
  const insets = useSafeAreaInsets();
  const q = useMemo(() => {
    const a = 12 + Math.floor(Math.random() * 30);
    const b = 13 + Math.floor(Math.random() * 30);
    return { a, b, answer: a * b };
  }, []);
  const [typed, setTyped] = useState('');
  const [wrong, setWrong] = useState(false);
  const press = (d: string) => {
    if (d === '⌫') return setTyped((v) => v.slice(0, -1));
    const next = (typed + d).slice(0, 5);
    setTyped(next);
    if (Number(next) === q.answer) {
      navigation.goBack();
      route.params?.onPass?.();
    } else if (next.length >= String(q.answer).length) {
      setWrong(true);
      setTimeout(() => {
        setWrong(false);
        setTyped('');
      }, 600);
    }
  };
  return (
    <PlayfulBackdrop shapes={false}>
      <View style={[styles.wrap, { paddingTop: insets.top + space.lg, paddingBottom: insets.bottom + space.xl }]}>
        <RoundButton icon="close" label={t('common.close')} onPress={() => navigation.goBack()} color={palette.cherry} size={46} style={{ alignSelf: 'flex-start' }} />
        <PopIn style={{ alignItems: 'center', marginTop: space.xl }}>
          <Text style={{ fontSize: 56 }}>🧑‍🏫</Text>
          <AppText variant="heading" align="center">Grown-ups only</AppText>
          <AppText variant="body" tone="secondary" align="center" style={{ marginTop: space.sm }}>
            What is {q.a} × {q.b}?
          </AppText>
          <AppText variant="numeral" tone={wrong ? 'danger' : 'text'} style={{ marginTop: space.md, minHeight: 64 }}>
            {typed || ' '}
          </AppText>
        </PopIn>
        <View style={styles.pad}>
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((d, i) => (
            <View key={i} style={styles.key}>
              {d ? <BigButton label={d} onPress={() => press(d)} color={d === '⌫' ? palette.tangerine : palette.sky} size="md" fullWidth /> : null}
            </View>
          ))}
        </View>
      </View>
    </PlayfulBackdrop>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: space.screen, maxWidth: 420, width: '100%', alignSelf: 'center' },
  pad: { flexDirection: 'row', flexWrap: 'wrap', marginTop: space.xl },
  key: { width: '33.33%', padding: 6 },
});
