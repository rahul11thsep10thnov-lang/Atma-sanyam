// Small presentational helpers shared by many games.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppText } from '../../ui';

/** A speech-bubble prompt above a board ("Find the elephant!"). */
export function Prompt({ children, emoji }: { children: React.ReactNode; emoji?: string }) {
  return (
    <View style={styles.prompt}>
      {emoji ? <Text style={{ fontSize: 26 }}>{emoji}</Text> : null}
      <AppText variant="heading" style={{ flex: 1 }} numberOfLines={2}>
        {children}
      </AppText>
    </View>
  );
}

/** A row of large emoji answer buttons. */
export function Scoreboard({ items }: { items: { label: string; value: string | number }[] }) {
  return (
    <View style={styles.scoreboard}>
      {items.map((i) => (
        <View key={i.label} style={styles.score}>
          <AppText variant="caption" tone="muted">{i.label}</AppText>
          <AppText variant="numeralSmall">{String(i.value)}</AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  prompt: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, marginBottom: 10, borderWidth: 3, borderColor: '#FFD6E5' },
  scoreboard: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 16, paddingVertical: 6, marginBottom: 8 },
  score: { alignItems: 'center' },
});
