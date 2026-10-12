// Two separate, generous chips (not a joined segmented control): a peach
// fill, a bold condensed label in a contrasting ink, 1.75× the height of
// the ordinary segmented control.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Tactile } from './Pressable';
import { radii } from '../theme/radii';
import { useTheme } from '../theme/ThemeContext';

export interface ModeChip<T extends string> {
  value: T;
  label: string;
}

export const CHIP_FONT = 'BebasNeue_400Regular';
const PEACH = '#FBD0AE';
const PEACH_SOFT = '#FBE8D9';
const INK = '#2B2118';

export function ModeChips<T extends string>({ chips, value, onChange, accessibilityLabel }: { chips: ModeChip<T>[]; value: T; onChange: (v: T) => void; accessibilityLabel?: string }) {
  const { isDark } = useTheme();
  return (
    <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel}>
      {chips.map((c) => {
        const on = c.value === value;
        return (
          <Tactile
            key={c.value}
            scaleTo={0.96}
            onPress={() => {
              if (on) return;
              Haptics.selectionAsync().catch(() => undefined);
              onChange(c.value);
            }}
            accessibilityRole="radio"
            accessibilityState={{ selected: on, checked: on }}
            accessibilityLabel={c.label}
            style={[styles.chip, { backgroundColor: on ? PEACH : isDark ? 'rgba(251,208,174,0.18)' : PEACH_SOFT, borderColor: on ? '#E8A878' : 'transparent' }]}
          >
            <Text style={[styles.label, { color: on ? INK : isDark ? '#F3D9C2' : '#8A5C3C' }]} numberOfLines={1}>
              {c.label}
            </Text>
          </Tactile>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12 },
  chip: { flex: 1, height: 77, borderRadius: radii.lg, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  label: { fontFamily: CHIP_FONT, fontSize: 30, letterSpacing: 1.2, lineHeight: 36, textAlign: 'center' },
});
