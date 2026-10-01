// End-of-session sheet (PHASE 8 / 15-16 of the design spec): a warm bloom
// of light and a sprout for a completed session; a calm, never-shaming
// note when focus paused. Replaces the OS alert.
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../../ui/AppText';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { radii } from '../../theme/radii';
import { space } from '../../theme/spacing';
import { duration, easing } from '../../theme/motion';
import { useTheme } from '../../theme/ThemeContext';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface Props {
  outcome: 'completed' | 'failed';
  title: string;
  message: string;
  primaryLabel: string;
  onPrimary: () => void;
}

export function SessionResultSheet({ outcome, title, message, primaryLabel, onPrimary }: Props) {
  const { colors, shadow } = useTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const enter = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  const bloom = useRef(new Animated.Value(reduced ? 1 : 0)).current;

  useEffect(() => {
    if (reduced) return;
    Animated.parallel([
      Animated.timing(enter, { toValue: 1, duration: duration.expressive, easing: easing.standard, useNativeDriver: true }),
      Animated.timing(bloom, { toValue: 1, duration: 1800, easing: easing.decelerate, useNativeDriver: true }),
    ]).start();
  }, [enter, bloom, reduced]);

  const done = outcome === 'completed';
  const translateY = enter.interpolate({ inputRange: [0, 1], outputRange: [48, 0] });
  const bloomScale = bloom.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.6] });
  const bloomOpacity = bloom.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0.55, 0] });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim, opacity: enter }]} />
      {done && (
        <Animated.View
          pointerEvents="none"
          style={[styles.bloom, { backgroundColor: colors.accent, opacity: bloomOpacity, transform: [{ scale: bloomScale }] }]}
        />
      )}
      <Animated.View
        style={[
          styles.sheet,
          { backgroundColor: colors.surfaceRaised, paddingBottom: insets.bottom + space.xxl, opacity: enter, transform: [{ translateY }] },
          shadow.level4,
        ]}
        accessibilityViewIsModal
        accessibilityLiveRegion="polite"
      >
        <View style={[styles.badge, { backgroundColor: done ? colors.growthSoft : colors.surfaceTinted }]}>
          <Icon name={done ? 'sprout' : 'leaf'} size="xl" color={done ? colors.growth : colors.textSecondary} strokeWidth={1.6} />
        </View>
        <AppText variant="heading" align="center">
          {title}
        </AppText>
        <AppText variant="body" tone="secondary" align="center" style={styles.message}>
          {message}
        </AppText>
        <Button label={primaryLabel} icon={done ? 'sprout' : undefined} size="lg" fullWidth onPress={onPrimary} style={styles.button} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  bloom: { position: 'absolute', alignSelf: 'center', top: '28%', width: 320, height: 320, borderRadius: 160 },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: radii.hero,
    borderTopRightRadius: radii.hero,
    paddingHorizontal: space.xxl,
    paddingTop: space.xxl,
    alignItems: 'center',
  },
  badge: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: space.lg },
  message: { marginTop: space.sm },
  button: { marginTop: space.xxl },
});
