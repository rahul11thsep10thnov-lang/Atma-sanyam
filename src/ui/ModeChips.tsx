// Two separate, generous chips (not a joined segmented control): a peach
// fill, a bold condensed label in a contrasting ink, 1.75× the height of
// the ordinary segmented control.
import React, { useState } from 'react';
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
const FONT = 30;
const PAD = 12;

/** The largest size, up to 30, at which a label fits on one line of a chip
 * `width` wide. The condensed face runs about 0.42 em a letter plus its
 * letter spacing; native also shrinks the text if this estimate falls short. */
function fitSize(label: string, width: number) {
  if (!width) return FONT;
  const room = width - PAD * 2 - 4;
  return Math.max(16, Math.min(FONT, Math.floor((room / Math.max(1, label.length) - 1.2) / 0.42)));
}

export function ModeChips<T extends string>({ chips, value, onChange, accessibilityLabel }: { chips: ModeChip<T>[]; value: T; onChange: (v: T) => void; accessibilityLabel?: string }) {
  const { isDark } = useTheme();
  const [rowW, setRowW] = useState(0);
  const chipW = chips.length ? (rowW - 12 * (chips.length - 1)) / chips.length : 0;
  // one size for every chip, so the pair reads as a set
  const size = Math.min(...chips.map((c) => fitSize(c.label, chipW)), FONT);
  return (
    <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel} onLayout={(e) => setRowW(e.nativeEvent.layout.width)}>
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
            <Text style={[styles.label, { fontSize: size, lineHeight: Math.round(size * 1.2), color: on ? INK : isDark ? '#F3D9C2' : '#8A5C3C' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
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
  chip: { flex: 1, height: 77, borderRadius: radii.lg, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', paddingHorizontal: PAD },
  label: { fontFamily: CHIP_FONT, fontSize: FONT, letterSpacing: 1.2, lineHeight: 36, textAlign: 'center' },
});
