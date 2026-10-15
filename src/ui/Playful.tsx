// The playful layer of the design system: gradient backdrops with floating
// shapes, chunky 3D-looking buttons, colour chips, badges, progress bars and
// confetti. The Guardian Console uses the plainer Card/Button; the Player
// Console uses these on top. Everything respects reduced motion.
import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AppText } from './AppText';
import { Icon, IconName } from './Icon';
import { Tactile } from './Pressable';
import { radii } from '../theme/radii';
import { space } from '../theme/spacing';
import { rainbow } from '../theme/palette';
import { useTheme } from '../theme/ThemeContext';
import { useReducedMotion } from '../hooks/useReducedMotion';

/** Darkens a hex colour by `amount` (0–1) for the chunky button's underside. */
export function darken(hex: string, amount = 0.2): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1]!, 16);
  const f = (c: number) => Math.max(0, Math.round(c * (1 - amount)));
  return `#${[f(n >> 16), f((n >> 8) & 255), f(n & 255)].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

export function lighten(hex: string, amount = 0.6): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1]!, 16);
  const f = (c: number) => Math.min(255, Math.round(c + (255 - c) * amount));
  return `#${[f(n >> 16), f((n >> 8) & 255), f(n & 255)].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

// ---- backdrop ------------------------------------------------------------

function FloatingShape({ color, size, left, top, delay, kind }: { color: string; size: number; left: string; top: string; delay: number; kind: 'circle' | 'square' | 'triangle' | 'star' }) {
  const reduced = useReducedMotion();
  const y = useRef(new Animated.Value(0)).current;
  const r = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(y, { toValue: 1, duration: 3200 + delay, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(y, { toValue: 0, duration: 3200 + delay, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const spin = Animated.loop(Animated.timing(r, { toValue: 1, duration: 14000 + delay * 3, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    spin.start();
    return () => {
      loop.stop();
      spin.stop();
    };
  }, [reduced, y, r, delay]);
  const translateY = y.interpolate({ inputRange: [0, 1], outputRange: [0, -18] });
  const rotate = r.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const shape: ViewStyle =
    kind === 'circle'
      ? { borderRadius: size / 2 }
      : kind === 'square'
        ? { borderRadius: size * 0.22 }
        : { borderRadius: size * 0.1 };
  return (
    <Animated.View pointerEvents="none" style={[styles.shape, { left: left as unknown as number, top: top as unknown as number, transform: [{ translateY }, { rotate }] }]}>
      {kind === 'star' ? (
        <Text style={{ fontSize: size, color, opacity: 0.55 }}>★</Text>
      ) : kind === 'triangle' ? (
        <Text style={{ fontSize: size, color, opacity: 0.5 }}>▲</Text>
      ) : (
        <View style={[{ width: size, height: size, backgroundColor: color, opacity: 0.45 }, shape]} />
      )}
    </Animated.View>
  );
}

const SHAPES: { kind: 'circle' | 'square' | 'triangle' | 'star'; size: number; left: string; top: string; delay: number }[] = [
  { kind: 'circle', size: 70, left: '-6%', top: '8%', delay: 0 },
  { kind: 'star', size: 34, left: '78%', top: '6%', delay: 400 },
  { kind: 'square', size: 44, left: '86%', top: '28%', delay: 900 },
  { kind: 'triangle', size: 30, left: '8%', top: '38%', delay: 1300 },
  { kind: 'circle', size: 26, left: '60%', top: '48%', delay: 600 },
  { kind: 'star', size: 26, left: '14%', top: '68%', delay: 1800 },
  { kind: 'square', size: 56, left: '72%', top: '74%', delay: 200 },
  { kind: 'circle', size: 90, left: '-10%', top: '86%', delay: 1100 },
];

/** Full-screen gradient with slowly drifting shapes; put content on top. */
export function PlayfulBackdrop({ children, style, shapes = true, colors: override }: { children?: React.ReactNode; style?: StyleProp<ViewStyle>; shapes?: boolean; colors?: [string, string, ...string[]] }) {
  const { colors } = useTheme();
  const stops = override ?? colors.gradient;
  return (
    <LinearGradient colors={stops} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.fill, style]}>
      {shapes && SHAPES.map((s, i) => <FloatingShape key={i} {...s} color={rainbow[i % rainbow.length]} />)}
      {children}
    </LinearGradient>
  );
}

// ---- chunky button -------------------------------------------------------

export interface BigButtonProps {
  label: string;
  onPress?: () => void;
  color?: string;
  icon?: IconName;
  emoji?: string;
  size?: 'md' | 'lg' | 'xl';
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

const BIG: Record<NonNullable<BigButtonProps['size']>, { h: number; font: number; pad: number }> = {
  md: { h: 56, font: 18, pad: 20 },
  lg: { h: 68, font: 22, pad: 26 },
  xl: { h: 84, font: 26, pad: 32 },
};

/** A thick, 3D, tap-me button for children. */
export function BigButton({ label, onPress, color, icon, emoji, size = 'lg', disabled, fullWidth, style, accessibilityLabel }: BigButtonProps) {
  const { colors } = useTheme();
  const fill = color ?? colors.primary;
  const d = BIG[size];
  return (
    <Tactile
      onPress={onPress}
      disabled={disabled}
      scaleTo={0.95}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled }}
      style={[{ opacity: disabled ? 0.5 : 1 }, fullWidth && { alignSelf: 'stretch' }, style]}
    >
      <View style={[styles.bigUnder, { backgroundColor: darken(fill, 0.28), borderRadius: d.h / 2 }]}>
        <View style={[styles.bigTop, { backgroundColor: fill, height: d.h, borderRadius: d.h / 2, paddingHorizontal: d.pad }]}>
          {emoji ? <Text style={{ fontSize: d.font + 4 }}>{emoji}</Text> : icon ? <Icon name={icon} size={d.font + 4} color="#fff" strokeWidth={2.4} /> : null}
          <Text style={[styles.bigLabel, { fontSize: d.font }]} numberOfLines={1}>
            {label}
          </Text>
        </View>
      </View>
    </Tactile>
  );
}

/** A round chunky button (icon only): pause, close, sound, hint… */
export function RoundButton({ icon, emoji, onPress, color, size = 52, label, disabled, style }: { icon?: IconName; emoji?: string; onPress?: () => void; color?: string; size?: number; label: string; disabled?: boolean; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  const fill = color ?? colors.secondary;
  return (
    <Tactile onPress={onPress} disabled={disabled} scaleTo={0.9} accessibilityRole="button" accessibilityLabel={label} style={[{ opacity: disabled ? 0.5 : 1 }, style]}>
      <View style={{ backgroundColor: darken(fill, 0.28), borderRadius: size / 2, paddingBottom: 5 }}>
        <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: fill, alignItems: 'center', justifyContent: 'center' }}>
          {emoji ? <Text style={{ fontSize: size * 0.5 }}>{emoji}</Text> : icon ? <Icon name={icon} size={size * 0.5} color="#fff" strokeWidth={2.4} /> : null}
        </View>
      </View>
    </Tactile>
  );
}

// ---- cards, chips, badges ---------------------------------------------------

/** A bold colour card with a thick darker bottom edge, for games and tabs. */
export function CandyCard({ color, children, onPress, style, label, radius = radii.lg }: { color: string; children: React.ReactNode; onPress?: () => void; style?: StyleProp<ViewStyle>; label?: string; radius?: number }) {
  const inner = (
    <View style={[{ backgroundColor: darken(color, 0.25), borderRadius: radius, paddingBottom: 6 }, style]}>
      <View style={{ backgroundColor: color, borderRadius: radius, overflow: 'hidden' }}>{children}</View>
    </View>
  );
  if (!onPress) return inner;
  return (
    <Tactile onPress={onPress} scaleTo={0.96} accessibilityRole="button" accessibilityLabel={label}>
      {inner}
    </Tactile>
  );
}

export function Chip({ label, selected, onPress, color, emoji, icon, small }: { label: string; selected?: boolean; onPress?: () => void; color?: string; emoji?: string; icon?: IconName; small?: boolean }) {
  const { colors } = useTheme();
  const fill = color ?? colors.primary;
  return (
    <Tactile onPress={onPress} scaleTo={0.94} accessibilityRole="button" accessibilityState={{ selected: !!selected }} accessibilityLabel={label}>
      <View style={[styles.chip, small && styles.chipSmall, { backgroundColor: selected ? fill : colors.surfaceRaised, borderColor: selected ? darken(fill, 0.2) : colors.borderStrong }]}>
        {emoji ? <Text style={{ fontSize: small ? 14 : 16 }}>{emoji}</Text> : icon ? <Icon name={icon} size="xs" color={selected ? '#fff' : 'icon'} /> : null}
        <AppText variant={small ? 'caption' : 'bodySmallStrong'} style={{ color: selected ? '#fff' : colors.text }} numberOfLines={1}>
          {label}
        </AppText>
      </View>
    </Tactile>
  );
}

export function Badge({ label, color, textColor, icon, emoji }: { label: string; color?: string; textColor?: string; icon?: IconName; emoji?: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.badge, { backgroundColor: color ?? colors.accentSoft }]}>
      {emoji ? <Text style={{ fontSize: 12 }}>{emoji}</Text> : icon ? <Icon name={icon} size={14} color={textColor ?? colors.text} /> : null}
      <AppText variant="caption" style={{ color: textColor ?? colors.text }}>
        {label}
      </AppText>
    </View>
  );
}

export function Stars({ count, max = 3, size = 28 }: { count: number; max?: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 4 }} accessibilityLabel={`${count} of ${max} stars`}>
      {Array.from({ length: max }, (_, i) => (
        <Text key={i} style={{ fontSize: size, color: i < count ? '#FFC93C' : '#D9D4EC' }}>
          ★
        </Text>
      ))}
    </View>
  );
}

export function ProgressBar({ value, color, height = 14, track }: { value: number; color?: string; height?: number; track?: string }) {
  const { colors } = useTheme();
  const w = useRef(new Animated.Value(0)).current;
  const pct = Math.max(0, Math.min(1, value));
  useEffect(() => {
    Animated.timing(w, { toValue: pct, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [pct, w]);
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: track ?? colors.surfaceMuted, overflow: 'hidden' }} accessibilityRole="progressbar" accessibilityValue={{ now: Math.round(pct * 100), min: 0, max: 100 }}>
      <Animated.View style={{ height, borderRadius: height / 2, backgroundColor: color ?? colors.primary, width: w.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }} />
    </View>
  );
}

// ---- confetti -----------------------------------------------------------

function Particle({ index, play }: { index: number; play: boolean }) {
  const t = useRef(new Animated.Value(0)).current;
  const seed = useMemo(() => ({ x: (index * 61) % 100, drift: ((index * 37) % 60) - 30, delay: (index * 53) % 600, size: 8 + ((index * 7) % 8), color: rainbow[index % rainbow.length] }), [index]);
  useEffect(() => {
    if (!play) return;
    t.setValue(0);
    Animated.timing(t, { toValue: 1, duration: 1800 + seed.delay, delay: seed.delay, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [play, t, seed.delay]);
  const translateY = t.interpolate({ inputRange: [0, 1], outputRange: [-40, 700] });
  const translateX = t.interpolate({ inputRange: [0, 1], outputRange: [0, seed.drift * 3] });
  const rotate = t.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${360 + seed.drift * 6}deg`] });
  const opacity = t.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] });
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', left: `${seed.x}%`, top: 0, width: seed.size, height: seed.size * 0.6, borderRadius: 2, backgroundColor: seed.color, opacity, transform: [{ translateY }, { translateX }, { rotate }] }} />
  );
}

/** Confetti rain over its parent; `play` toggles a burst. */
export function Confetti({ play, count = 36 }: { play: boolean; count?: number }) {
  const reduced = useReducedMotion();
  if (!play || reduced) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {Array.from({ length: count }, (_, i) => (
        <Particle key={i} index={i} play={play} />
      ))}
    </View>
  );
}

/** A gentle bob for mascots and icons. */
export function Bob({ children, amplitude = 6, duration = 1400, style }: { children: React.ReactNode; amplitude?: number; duration?: number; style?: StyleProp<ViewStyle> }) {
  const reduced = useReducedMotion();
  const y = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(y, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(y, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [reduced, y, duration]);
  return <Animated.View style={[style, { transform: [{ translateY: y.interpolate({ inputRange: [0, 1], outputRange: [0, -amplitude] }) }] }]}>{children}</Animated.View>;
}

/** Pops in with a spring when mounted. */
export function PopIn({ children, delay = 0, style }: { children: React.ReactNode; delay?: number; style?: StyleProp<ViewStyle> }) {
  const reduced = useReducedMotion();
  const s = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  useEffect(() => {
    if (reduced) return;
    Animated.spring(s, { toValue: 1, delay, friction: 5, tension: 120, useNativeDriver: true }).start();
  }, [reduced, s, delay]);
  return <Animated.View style={[style, { transform: [{ scale: s }], opacity: s }]}>{children}</Animated.View>;
}

/** Big emoji on a soft coloured disc: the visual for cards and empty states. */
export function EmojiDisc({ emoji, color, size = 64 }: { emoji: string; color: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: lighten(color, 0.7), alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: color }}>
      <Text style={{ fontSize: size * 0.52, lineHeight: size * 0.64 }}>{emoji}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  shape: { position: 'absolute' },
  bigUnder: { paddingBottom: 6 },
  bigTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm },
  bigLabel: { color: '#fff', fontFamily: 'Fredoka_700Bold', letterSpacing: 0.3 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 40, borderRadius: radii.pill, borderWidth: 2 },
  chipSmall: { height: 32, paddingHorizontal: 10 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radii.pill, alignSelf: 'flex-start' },
});
