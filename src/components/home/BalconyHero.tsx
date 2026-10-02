// The Home hero: the person's own balcony — composited from the same
// photographic layers as the Balcony tab, so it is always current — with a
// slow, barely-there drift, a soft bottom gradient and one quiet call to
// explore.
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AppText } from '../../ui/AppText';
import { Icon } from '../../ui/Icon';
import { Tactile } from '../../ui/Pressable';
import { radii } from '../../theme/radii';
import { space } from '../../theme/spacing';
import { useTheme } from '../../theme/ThemeContext';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { BalconyPreview } from '../../photoBalcony/ui/BalconyPreview';
const DRIFT_MS = 18000;

export function BalconyHero({ onPress, height = 232 }: { onPress: () => void; height?: number }) {
  const { colors, shadow } = useTheme();
  const reduced = useReducedMotion();
  const drift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, { toValue: 1, duration: DRIFT_MS, useNativeDriver: true }),
        Animated.timing(drift, { toValue: 0, duration: DRIFT_MS, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [drift, reduced]);

  const scale = drift.interpolate({ inputRange: [0, 1], outputRange: [1.04, 1.1] });
  const translateX = drift.interpolate({ inputRange: [0, 1], outputRange: [6, -6] });

  return (
    <Tactile
      onPress={onPress}
      scaleTo={0.985}
      accessibilityRole="button"
      accessibilityLabel="Open your balcony"
      style={[styles.card, { height, borderRadius: radii.hero, backgroundColor: colors.surfaceMuted }, shadow.level3]}
    >
      <Animated.View style={[StyleSheet.absoluteFill, { transform: reduced ? [{ scale: 1.04 }] : [{ scale }, { translateX }] }]}>
        <BalconyPreview width="100%" height="100%" focus={[0.42, 0.6]} />
      </Animated.View>
      <LinearGradient colors={['rgba(30,18,12,0)', 'rgba(30,18,12,0.55)']} locations={[0.45, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />
      <View style={styles.topRow} pointerEvents="none">
        <View style={styles.pill}>
          <Icon name="sprout" size="xs" color="#FFFFFF" />
          <AppText variant="overline" style={styles.pillText}>
            MY BALCONY
          </AppText>
        </View>
      </View>
      <View style={styles.bottomRow} pointerEvents="none">
        <AppText variant="subheading" style={styles.white}>
          Your balcony
        </AppText>
        <View style={styles.exploreRow}>
          <AppText variant="bodySmallStrong" style={styles.white}>
            Explore
          </AppText>
          <Icon name="chevronRight" size="xs" color="#FFFFFF" />
        </View>
      </View>
    </Tactile>
  );
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden' },
  topRow: { position: 'absolute', top: space.md, left: space.md },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(30,18,12,0.38)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  pillText: { color: '#FFFFFF' },
  bottomRow: { position: 'absolute', left: space.lg, right: space.lg, bottom: space.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  exploreRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  white: { color: '#FFFFFF' },
});
