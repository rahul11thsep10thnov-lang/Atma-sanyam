// Every time the app opens, a small card asks for the language: English or
// हिन्दी. Picking one closes it and the app carries on in that language.
// The card is shown in both languages at once, so it reads either way.
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '../ui/AppText';
import { Icon } from '../ui/Icon';
import { Tactile } from '../ui/Pressable';
import { radii } from '../theme/radii';
import { space } from '../theme/spacing';
import { useTheme } from '../theme/ThemeContext';
import { Language, LANGUAGES } from '../i18n';

export function LanguagePopup({ current, onChoose }: { current: Language; onChoose: (l: Language) => void }) {
  const { colors, shadow } = useTheme();
  const appear = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(appear, { toValue: 1, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [appear]);

  return (
    <View style={StyleSheet.absoluteFill} accessibilityViewIsModal>
      <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, { opacity: appear }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => onChoose(current)} accessibilityLabel="Close" />
      </Animated.View>
      <View style={styles.center} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.card,
            { backgroundColor: colors.surfaceRaised, borderColor: colors.border },
            shadow.level3,
            { opacity: appear, transform: [{ translateY: appear.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }, { scale: appear.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }] },
          ]}
        >
          <View style={[styles.badge, { backgroundColor: colors.accentSoft }]}>
            <Icon name="quote" size="sm" color="primary" />
          </View>
          <AppText variant="heading" align="center" accessibilityRole="header">
            Language · भाषा
          </AppText>
          <AppText variant="bodySmall" tone="secondary" align="center" style={styles.sub}>
            Choose your language · अपनी भाषा चुनें
          </AppText>
          <View style={styles.list}>
            {LANGUAGES.map((l) => {
              const on = l.id === current;
              return (
                <Tactile
                  key={l.id}
                  onPress={() => onChoose(l.id)}
                  accessibilityRole="button"
                  accessibilityLabel={l.name}
                  accessibilityState={{ selected: on }}
                  style={[styles.row, { backgroundColor: on ? colors.accentSoft : colors.background, borderColor: on ? colors.primary : colors.border }]}
                >
                  <View style={{ flex: 1 }}>
                    <AppText variant="bodyStrong">{l.native}</AppText>
                    {l.native !== l.name && (
                      <AppText variant="caption" tone="secondary">
                        {l.name}
                      </AppText>
                    )}
                  </View>
                  {on ? <Icon name="check" size="sm" color="primary" /> : <Icon name="chevronRight" size="xs" color="secondary" />}
                </Tactile>
              );
            })}
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: { backgroundColor: 'rgba(30,18,10,0.42)' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl },
  card: { width: '100%', maxWidth: 380, borderRadius: radii.xl, borderWidth: StyleSheet.hairlineWidth, padding: space.xl, alignItems: 'stretch' },
  badge: { alignSelf: 'center', width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: space.md },
  sub: { marginTop: space.xs, marginBottom: space.lg },
  list: { gap: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md, paddingHorizontal: space.lg, borderRadius: radii.md, borderWidth: 1.5 },
});
