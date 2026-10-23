// Shared board-game polish: a dice that tumbles when rolled, a token that
// glides to its new square, a flash when something is captured, and a
// pass-and-play mode chooser shown before the first move.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { AppText, Tactile } from '../../ui';
import { palette } from '../../theme/palette';
import { useReducedMotion } from '../../hooks/useReducedMotion';

const FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

/** A chunky dice. `rollKey` changes on every roll to replay the tumble. */
export function Dice({ value, rollKey, disabled, onPress, label, color = '#fff' }: { value: number | null; rollKey: number; disabled?: boolean; onPress?: () => void; label: string; color?: string }) {
  const reduced = useReducedMotion();
  const spin = useRef(new Animated.Value(0)).current;
  const [shown, setShown] = useState<number | null>(value);
  useEffect(() => {
    if (value === null) {
      setShown(null);
      return;
    }
    if (reduced) {
      setShown(value);
      return;
    }
    spin.setValue(0);
    // Flicker through random faces while the dice spins, then settle.
    let n = 0;
    const flicker = setInterval(() => {
      n += 1;
      setShown(1 + ((n * 7 + rollKey) % 6));
    }, 70);
    Animated.timing(spin, { toValue: 1, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(() => {
      clearInterval(flicker);
      setShown(value);
    });
    return () => clearInterval(flicker);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rollKey, value, reduced]);
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '720deg'] });
  const scale = spin.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.25, 1] });
  return (
    <Tactile onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label} scaleTo={0.92}>
      <Animated.View style={[styles.dice, { backgroundColor: color, opacity: disabled ? 0.6 : 1, transform: [{ rotate }, { scale }] }]}>
        <Text style={{ fontSize: 40, color: palette.ink }}>{shown ? FACES[shown - 1] : '🎲'}</Text>
      </Animated.View>
    </Tactile>
  );
}

/** Absolutely positioned token that glides between board cells. */
export function GlidingToken({ x, y, size, children, onPress, disabled, label, highlight, captured }: { x: number; y: number; size: number; children: React.ReactNode; onPress?: () => void; disabled?: boolean; label: string; highlight?: boolean; captured?: boolean }) {
  const reduced = useReducedMotion();
  const pos = useRef(new Animated.ValueXY({ x, y })).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const flash = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduced) {
      pos.setValue({ x, y });
      return;
    }
    Animated.spring(pos, { toValue: { x, y }, friction: 7, tension: 60, useNativeDriver: true }).start();
  }, [x, y, pos, reduced]);
  useEffect(() => {
    if (!highlight || reduced) {
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(Animated.sequence([Animated.timing(pulse, { toValue: 1, duration: 450, useNativeDriver: true }), Animated.timing(pulse, { toValue: 0, duration: 450, useNativeDriver: true })]));
    loop.start();
    return () => loop.stop();
  }, [highlight, pulse, reduced]);
  useEffect(() => {
    if (!captured || reduced) return;
    flash.setValue(0);
    Animated.sequence([Animated.timing(flash, { toValue: 1, duration: 120, useNativeDriver: true }), Animated.timing(flash, { toValue: 0, duration: 380, useNativeDriver: true })]).start();
  }, [captured, flash, reduced]);
  const scale = Animated.add(pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.18] }), flash.interpolate({ inputRange: [0, 1], outputRange: [0, 0.5] }));
  return (
    <Animated.View style={{ position: 'absolute', left: 0, top: 0, width: size, height: size, transform: [{ translateX: pos.x }, { translateY: pos.y }, { scale: Animated.add(1, Animated.subtract(scale, 1)) }] }}>
      <Tactile haptic={false} disabled={disabled} onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={{ flex: 1 }}>
        {children}
      </Tactile>
    </Animated.View>
  );
}

/** Brief burst drawn where a piece was captured. */
export function CaptureBurst({ x, y, size, show }: { x: number; y: number; size: number; show: boolean }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!show) return;
    v.setValue(0);
    Animated.timing(v, { toValue: 1, duration: 600, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [show, v]);
  if (!show) return null;
  return (
    <Animated.Text pointerEvents="none" style={{ position: 'absolute', left: x, top: y, fontSize: size, opacity: v.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] }), transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.6] }) }] }}>💥</Animated.Text>
  );
}

/** Shown before the first move: play the computer or pass the device to a friend. */
export function ModeChooser({ onPick, computerLabel = 'Play the computer', friendsLabel = 'Two players on this device', emoji = '🎲' }: { onPick: (mode: 'computer' | 'friends') => void; computerLabel?: string; friendsLabel?: string; emoji?: string }) {
  return (
    <View style={styles.modes}>
      <Text style={{ fontSize: 40 }}>{emoji}</Text>
      <AppText variant="heading" align="center">Who is playing?</AppText>
      <Tactile onPress={() => onPick('computer')} accessibilityRole="button" accessibilityLabel={computerLabel}>
        <View style={[styles.modeBtn, { backgroundColor: palette.sky }]}><Text style={{ fontSize: 26 }}>🤖</Text><AppText variant="bodyStrong" style={{ color: '#fff' }}>{computerLabel}</AppText></View>
      </Tactile>
      <Tactile onPress={() => onPick('friends')} accessibilityRole="button" accessibilityLabel={friendsLabel}>
        <View style={[styles.modeBtn, { backgroundColor: palette.tangerine }]}><Text style={{ fontSize: 26 }}>🧑‍🤝‍🧑</Text><AppText variant="bodyStrong" style={{ color: '#fff' }}>{friendsLabel}</AppText></View>
      </Tactile>
      <AppText variant="caption" tone="secondary" align="center">Pass the device to your friend when it is their turn.</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  dice: { marginTop: 10, width: 68, height: 68, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: palette.ink },
  modes: { alignItems: 'center', gap: 10, padding: 16, backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 24, borderWidth: 3, borderColor: palette.ink, margin: 8 },
  modeBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 999, minWidth: 260, justifyContent: 'center' },
});
