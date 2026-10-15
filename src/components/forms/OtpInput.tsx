// Six big boxes for a one-time code. One hidden TextInput receives the
// digits (so the keyboard, paste and autofill all work); the boxes mirror it.
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { AppText } from '../../ui/AppText';
import { radii } from '../../theme/radii';
import { useTheme } from '../../theme/ThemeContext';

export function OtpInput({ value, onChange, length = 6, autoFocus = true, onComplete }: { value: string; onChange: (v: string) => void; length?: number; autoFocus?: boolean; onComplete?: (code: string) => void }) {
  const { colors } = useTheme();
  const ref = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (value.length === length) onComplete?.(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <Pressable onPress={() => ref.current?.focus()} accessibilityLabel="One-time code" accessibilityRole="none">
      <View style={styles.row}>
        {Array.from({ length }, (_, i) => {
          const active = focused && value.length === i;
          return (
            <View key={i} style={[styles.box, { borderColor: active ? colors.primary : value[i] ? colors.borderStrong : colors.border, backgroundColor: colors.surfaceRaised }]}>
              <AppText variant="numeralSmall">{value[i] ?? ''}</AppText>
            </View>
          );
        })}
      </View>
      <TextInput
        ref={ref}
        value={value}
        onChangeText={(v) => onChange(v.replace(/\D/g, '').slice(0, length))}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        autoFocus={autoFocus}
        maxLength={length}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={styles.hidden}
        caretHidden
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  box: { width: 46, height: 60, borderRadius: radii.sm, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  hidden: { position: 'absolute', opacity: 0, height: 1, width: 1 },
});
