import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppText } from '../../ui/AppText';
import { space } from '../../theme/spacing';
import { useTheme } from '../../theme/ThemeContext';
import { t } from '../../i18n';

/** The greeting's handwritten face (Caveat). */
export const GREETING_FONT = 'Caveat_700Bold';

function partOfDay(hour: number) {
  if (hour < 5) return 'night';
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

/** "Good morning, Rahul" in a handwritten face + one quiet line. */
export function Greeting({ name, tagline }: { name?: string | null; tagline?: string }) {
  const { colors } = useTheme();
  const part = partOfDay(new Date().getHours());
  const first = name?.trim().split(/\s+/)[0];
  const greeting = part === 'morning' ? t('home.greetingMorning') : part === 'afternoon' ? t('home.greetingAfternoon') : t('home.greetingEvening');
  return (
    <View style={styles.wrap} accessibilityRole="header">
      <Text style={[styles.greeting, { color: colors.text }]} numberOfLines={2} allowFontScaling maxFontSizeMultiplier={1.4}>
        {`${greeting}${first ? `, ${first}` : ''}`}
      </Text>
      <AppText variant="body" tone="secondary" style={styles.tagline}>
        {tagline ?? t('home.tagline')}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: space.lg },
  greeting: { fontFamily: GREETING_FONT, fontSize: 44, lineHeight: 52, letterSpacing: 0.2 },
  tagline: { marginTop: space.xs },
});
