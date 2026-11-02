// DADU UI kit: the few components every screen uses. Little mode gets
// bigger targets automatically through `useDadu().mode`.
import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View, ViewStyle, TextStyle, Easing } from 'react-native';
import { P, FONT } from './palette';
import { useDadu } from '../state/DaduContext';
import { CharacterFace } from '../render';
import type { CharacterKey } from '../core/characters';
import { characterName } from '../core/characters';

export function useLittle() {
  const { mode } = useDadu();
  return mode !== 'explorer';
}

export function Heading({ children, colour, size }: { children: React.ReactNode; colour?: string; size?: number }) {
  return <Text style={[s.heading, { color: colour ?? P.indigo, fontSize: size ?? 22 }]} accessibilityRole="header">{children}</Text>;
}

export function Body({ children, tone, size, style }: { children: React.ReactNode; tone?: 'ink' | 'soft'; size?: number; style?: TextStyle }) {
  return <Text style={[s.body, { color: tone === 'soft' ? P.inkSoft : P.ink, fontSize: size ?? 15 }, style]}>{children}</Text>;
}

export function BigButton({ label, onPress, kind, disabled, icon, style, testID }: { label: string; onPress: () => void; kind?: 'primary' | 'ghost' | 'green' | 'danger'; disabled?: boolean; icon?: React.ReactNode; style?: ViewStyle; testID?: string }) {
  const little = useLittle();
  const bg = kind === 'ghost' ? P.card : kind === 'green' ? P.peepal : kind === 'danger' ? P.clay : P.saffron;
  const shadow = kind === 'ghost' ? P.line : kind === 'green' ? '#35702A' : kind === 'danger' ? '#A8452A' : '#C98310';
  const fg = kind === 'ghost' ? P.indigo : kind === 'primary' || !kind ? '#2A1A05' : '#fff';
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} testID={testID}
      style={({ pressed }) => [s.btn, { backgroundColor: bg, borderColor: kind === 'ghost' ? P.line : bg, minHeight: little ? 72 : 56, opacity: disabled ? 0.45 : 1, shadowColor: shadow, transform: [{ translateY: pressed ? 3 : 0 }] }, !pressed && { borderBottomWidth: 4, borderBottomColor: shadow }, style]}>
      {icon}
      <Text style={[s.btnText, { color: fg, fontSize: little ? 20 : 17 }]}>{label}</Text>
    </Pressable>
  );
}

export function Card({ children, style, accent }: { children: React.ReactNode; style?: ViewStyle; accent?: string }) {
  return <View style={[s.card, accent ? { borderColor: accent } : null, style]}>{children}</View>;
}

export function Chip({ label, colour, onPress, selected, testID }: { label: string; colour?: string; onPress?: () => void; selected?: boolean; testID?: string }) {
  const inner = <Text style={[s.chipText, selected ? { color: '#fff' } : colour ? { color: '#fff' } : null]}>{label}</Text>;
  const style = [s.chip, selected ? { backgroundColor: P.indigo, borderColor: P.indigo } : colour ? { backgroundColor: colour, borderColor: colour } : null];
  if (!onPress) return <View style={style}>{inner}</View>;
  return <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={style} testID={testID}>{inner}</Pressable>;
}

export function Progress({ value, colour }: { value: number; colour?: string }) {
  return <View style={s.progress} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}><View style={[s.progressFill, { width: `${Math.max(0, Math.min(100, value * 100))}%`, backgroundColor: colour ?? P.peepal }]} /></View>;
}

/** A character speaks. In Little mode the text is larger and bolder. */
export function SpeechBubble({ who, text, helper, children }: { who: CharacterKey | 'you'; text: string; helper?: string | null; children?: React.ReactNode }) {
  const little = useLittle();
  const { prefs } = useDadu();
  const key: CharacterKey = who === 'you' ? 'chintu' : who;
  const name = who === 'you' ? (prefs.primary === 'hi' ? 'आपकी बारी' : 'Your turn') : characterName(key, prefs.primary);
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => { fade.setValue(0); Animated.timing(fade, { toValue: 1, duration: 240, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(); }, [text, fade]);
  return (
    <Animated.View style={[s.bubble, { opacity: fade }]} accessibilityLabel={`${name}: ${text}`}>
      <View style={s.avatar}><CharacterFace characterKey={key} size={52} expression={who === 'you' ? 'happy' : 'talk'} /></View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={s.who}>{name}</Text>
        <Text style={[s.bubbleText, little ? { fontSize: 19, fontFamily: FONT.bodyBold } : null]}>{text}</Text>
        {helper ? <Text style={s.helper}>{helper}</Text> : null}
        {children}
      </View>
    </Animated.View>
  );
}

export function SectionTile({ label, sub, colour, onPress, icon, testID }: { label: string; sub?: string; colour: string; onPress: () => void; icon?: React.ReactNode; testID?: string }) {
  const little = useLittle();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} testID={testID} style={({ pressed }) => [s.tile, { backgroundColor: colour, minHeight: little ? 150 : 118, alignItems: little ? 'center' : 'flex-start', opacity: pressed ? 0.9 : 1 }]}>
      {icon}
      <Text style={[s.tileText, { fontSize: little ? 19 : 15, textAlign: little ? 'center' : 'left' }]}>{label}</Text>
      {!little && sub ? <Text style={s.tileSub}>{sub}</Text> : null}
    </Pressable>
  );
}

export function Toast({ text }: { text: string | null }) {
  const y = useRef(new Animated.Value(40)).current;
  useEffect(() => { if (text) Animated.spring(y, { toValue: 0, useNativeDriver: true }).start(); else y.setValue(40); }, [text, y]);
  if (!text) return null;
  return <Animated.View style={[s.toast, { transform: [{ translateY: y }] }]} accessibilityLiveRegion="polite"><Text style={s.toastText}>{text}</Text></Animated.View>;
}

export function Row({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[s.row, style]}>{children}</View>;
}

export function KeyPad({ onKey }: { onKey: (k: string) => void }) {
  return (
    <View style={s.keys}>
      {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((k, i) => (
        <Pressable key={i} accessibilityRole="button" accessibilityLabel={k === '⌫' ? 'delete' : k} disabled={!k} onPress={() => onKey(k)} style={[s.key, !k && { opacity: 0 }]} testID={`key-${k}`}>
          <Text style={s.keyText}>{k}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  heading: { fontFamily: FONT.display, lineHeight: 28 },
  body: { fontFamily: FONT.body, lineHeight: 22 },
  btn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 22, paddingHorizontal: 18, paddingVertical: 12, borderWidth: 2 },
  btnText: { fontFamily: FONT.displayHeavy },
  card: { backgroundColor: P.card, borderWidth: 2, borderColor: P.line, borderRadius: 20, padding: 12, marginHorizontal: 14, marginVertical: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: P.card, borderWidth: 2, borderColor: P.line, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 5 },
  chipText: { fontFamily: FONT.display, fontSize: 13, color: P.ink },
  progress: { height: 10, borderRadius: 999, backgroundColor: P.cream, borderWidth: 1, borderColor: P.line, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 999 },
  bubble: { marginHorizontal: 14, marginVertical: 6, backgroundColor: P.card, borderWidth: 3, borderColor: P.line, borderRadius: 22, padding: 12, flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: P.cream, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  who: { fontFamily: FONT.displayHeavy, fontSize: 12, color: P.clay, textTransform: 'uppercase', letterSpacing: 0.5 },
  bubbleText: { fontFamily: FONT.body, fontSize: 15, lineHeight: 21, color: P.ink, marginTop: 2 },
  helper: { fontFamily: FONT.body, fontSize: 13, color: P.inkSoft, marginTop: 3 },
  tile: { flex: 1, minWidth: 140, borderRadius: 24, padding: 12, justifyContent: 'center', gap: 6, borderBottomWidth: 5, borderBottomColor: 'rgba(0,0,0,.18)' },
  tileText: { fontFamily: FONT.displayHeavy, color: '#fff', lineHeight: 20 },
  tileSub: { fontFamily: FONT.bodyBold, color: '#fff', fontSize: 11, opacity: 0.9 },
  toast: { position: 'absolute', left: 14, right: 14, bottom: 90, backgroundColor: P.indigo, borderRadius: 18, padding: 12, zIndex: 9 },
  toastText: { fontFamily: FONT.display, color: '#fff', fontSize: 15, textAlign: 'center' },
  row: { flexDirection: 'row', gap: 10, paddingHorizontal: 14, flexWrap: 'wrap' },
  keys: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, width: 232, alignSelf: 'center' },
  key: { width: 64, height: 56, borderRadius: 18, borderWidth: 2, borderColor: P.line, backgroundColor: P.card, alignItems: 'center', justifyContent: 'center' },
  keyText: { fontFamily: FONT.display, fontSize: 22, color: P.ink },
});
