import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '../../ui/AppText';
import { space } from '../../theme/spacing';

function partOfDay(hour: number) {
  if (hour < 5) return 'night';
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

/** "Good evening, Rahul" + one quiet line. Never more text than this. */
export function Greeting({ name, tagline = 'Your world grows when you focus.' }: { name?: string | null; tagline?: string }) {
  const part = partOfDay(new Date().getHours());
  const first = name?.trim().split(/\s+/)[0];
  return (
    <View style={styles.wrap} accessibilityRole="header">
      <AppText variant="headingLarge">{`Good ${part}${first ? `, ${first}` : ''}`}</AppText>
      <AppText variant="body" tone="secondary" style={styles.tagline}>
        {tagline}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: space.lg },
  tagline: { marginTop: space.xs },
});
