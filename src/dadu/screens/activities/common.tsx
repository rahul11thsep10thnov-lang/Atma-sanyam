import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ViewStyle } from 'react-native';
import type { ActivityItem, ActivitySpec, Level } from '../../core/content';
import type { ActivityAnswer, ActivityResult } from '../../engines/activities';
import type { LangPrefs } from '../../i18n';
import { tx } from '../../i18n';
import { P, FONT } from '../../ui/palette';
import { ActivityIcon } from './icons';

export interface ActivityProps {
  spec: ActivitySpec;
  level: Level;
  prefs: LangPrefs;
  onAnswer: (answer: ActivityAnswer) => void;
  result: ActivityResult | null;
  disabled?: boolean;
}

export const isLittle = (level: Level) => level === 'little';

/** A tappable picture-or-label card. `state` colours it after an answer. */
export function ChoiceCard({ item, prefs, little, onPress, state, disabled, testID, badge, compact }: { item: ActivityItem; prefs: LangPrefs; little: boolean; onPress?: () => void; state?: 'ok' | 'no' | 'selected' | null; disabled?: boolean; testID?: string; badge?: string; compact?: boolean }) {
  const label = tx(item.label, prefs);
  const border = state === 'ok' ? P.ok : state === 'no' ? P.retry : state === 'selected' ? P.saffron : P.line;
  const bg = state === 'ok' ? P.okSoft : state === 'no' ? P.retrySoft : state === 'selected' ? '#FFF3D6' : P.card;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled, selected: state === 'selected' }} disabled={disabled || !onPress} onPress={onPress} testID={testID}
      style={({ pressed }) => [s.card, { borderColor: border, backgroundColor: bg, minHeight: compact ? 56 : little ? 120 : 84, opacity: pressed ? 0.85 : 1 }]}>
      {!compact && <ActivityIcon name={item.icon ?? item.key} size={little ? 84 : 48} label={label} />}
      {(!little || compact) && <Text style={[s.label, compact && { fontSize: 14 }]}>{label}</Text>}
      {badge ? <View style={s.badge}><Text style={s.badgeText}>{badge}</Text></View> : null}
    </Pressable>
  );
}

export function Grid({ children, columns = 2, style }: { children: React.ReactNode; columns?: number; style?: ViewStyle }) {
  return <View style={[s.grid, style]}>{React.Children.map(children, (c) => <View style={{ width: columns === 1 ? '100%' : `${100 / columns - 2}%`, flexGrow: 1 }}>{c}</View>)}</View>;
}

export function Hint({ text }: { text: string }) {
  return <Text style={s.hint}>{text}</Text>;
}

export function Zone({ label, onPress, active, children, testID }: { label: string; onPress?: () => void; active?: boolean; children?: React.ReactNode; testID?: string }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} testID={testID} style={[s.zone, active && { borderColor: P.saffron, backgroundColor: '#FFF3D6' }]}>
      <Text style={s.zoneLabel}>{label}</Text>
      <View style={s.zoneItems}>{children}</View>
    </Pressable>
  );
}

export function SmallChip({ label, onPress, tone, testID }: { label: string; onPress?: () => void; tone?: 'ok' | 'muted'; testID?: string }) {
  return <Pressable accessibilityRole="button" onPress={onPress} disabled={!onPress} testID={testID} style={[s.chip, tone === 'ok' && { backgroundColor: P.okSoft, borderColor: P.ok }, tone === 'muted' && { opacity: 0.5 }]}><Text style={s.chipText}>{label}</Text></Pressable>;
}

export const bilingual = (prefs: LangPrefs) => (prefs.primary === 'hi');

export const s = StyleSheet.create({
  card: { borderWidth: 3, borderRadius: 20, padding: 10, alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 8 },
  label: { fontFamily: FONT.display, fontSize: 15, color: P.ink, textAlign: 'center' },
  badge: { position: 'absolute', top: 6, right: 8, backgroundColor: P.indigo, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontFamily: FONT.displayHeavy, color: '#fff', fontSize: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 14 },
  hint: { fontFamily: FONT.body, color: P.inkSoft, fontSize: 13, paddingHorizontal: 14, marginBottom: 6 },
  zone: { flex: 1, minHeight: 96, borderWidth: 3, borderStyle: 'dashed', borderColor: P.line, borderRadius: 18, padding: 8, backgroundColor: P.cream },
  zoneLabel: { fontFamily: FONT.displayHeavy, color: P.indigo, fontSize: 14, marginBottom: 4 },
  zoneItems: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { backgroundColor: P.card, borderWidth: 2, borderColor: P.line, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  chipText: { fontFamily: FONT.display, fontSize: 13, color: P.ink },
});
