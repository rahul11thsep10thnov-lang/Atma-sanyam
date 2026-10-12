// A friend's poke: a large hand taps the screen exactly three times, with a
// haptic on each tap, then fades with the friend's name. Shown only to a
// signed-in person with the app open; otherwise the poke is a notification.
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSocial } from '../../social/SocialContext';
import { AppText } from '../../ui/AppText';
import { Avatar } from '../../ui/Avatar';
import { Icon } from '../../ui/Icon';
import { radii } from '../../theme/radii';
import { space } from '../../theme/spacing';
import { useTheme } from '../../theme/ThemeContext';
import { t } from '../../i18n';

const POKES = 3;
const TAP_MS = 260;

export function PokeOverlay() {
  const { poke, clearPoke } = useSocial();
  const { colors, isDark } = useTheme();
  const tap = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!poke) return;
    tap.setValue(0);
    fade.setValue(0);
    const taps = Array.from({ length: POKES }, () =>
      Animated.sequence([
        Animated.timing(tap, { toValue: 1, duration: TAP_MS / 2, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(tap, { toValue: 0, duration: TAP_MS / 2, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        Animated.delay(140),
      ])
    );
    const anim = Animated.sequence([
      Animated.timing(fade, { toValue: 1, duration: 180, useNativeDriver: true }),
      ...taps,
      Animated.delay(900),
      Animated.timing(fade, { toValue: 0, duration: 320, useNativeDriver: true }),
    ]);
    const haptics = Array.from({ length: POKES }, (_, i) =>
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => undefined), 180 + i * (TAP_MS + 140))
    );
    anim.start(({ finished }) => {
      if (finished) clearPoke();
    });
    return () => {
      anim.stop();
      haptics.forEach(clearTimeout);
    };
  }, [poke, tap, fade, clearPoke]);

  if (!poke) return null;
  const name = poke.from.username ? `@${poke.from.username}` : poke.from.displayName || t('friends.someone');
  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.wrap, { opacity: fade }]} pointerEvents="none" accessibilityLiveRegion="polite">
      <View style={[styles.scrim, { backgroundColor: isDark ? 'rgba(20,14,10,0.55)' : 'rgba(251,232,217,0.72)' }]} />
      <Animated.View
        style={{
          transform: [
            { translateY: tap.interpolate({ inputRange: [0, 1], outputRange: [0, 46] }) },
            { scale: tap.interpolate({ inputRange: [0, 1], outputRange: [1, 0.88] }) },
            { rotate: '-12deg' },
          ],
        }}
      >
        <Icon name="hand" size={168} color={colors.primary} strokeWidth={1.4} />
      </Animated.View>
      <View style={[styles.card, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}>
        <Avatar avatarId={poke.from.avatarId} name={poke.from.username ?? poke.from.displayName} size={32} />
        <View style={{ flexShrink: 1 }}>
          <AppText variant="bodyStrong">{t('friends.pokedYou', { name })}</AppText>
          <AppText variant="bodySmall" tone="secondary">{t('friends.pokeNudge')}</AppText>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', zIndex: 50, elevation: 50 },
  scrim: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  card: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.xl, paddingVertical: space.md, paddingHorizontal: space.lg, borderRadius: radii.lg, borderWidth: StyleSheet.hairlineWidth, maxWidth: '82%' },
});
