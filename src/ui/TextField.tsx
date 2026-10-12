// Text input with label, hint and error, on the theme.
import React, { useState } from 'react';
import { StyleSheet, TextInput, TextInputProps, View } from 'react-native';
import { AppText } from './AppText';
import { Icon, IconName } from './Icon';
import { radii } from '../theme/radii';
import { space } from '../theme/spacing';
import { typography } from '../theme/typography';
import { useTheme } from '../theme/ThemeContext';

export interface TextFieldProps extends TextInputProps {
  label?: string;
  hint?: string;
  error?: string | null;
  icon?: IconName;
}

export const TextField = React.forwardRef<TextInput, TextFieldProps>(function TextField({ label, hint, error, icon, style, editable = true, ...rest }, ref) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const border = error ? colors.danger : focused ? colors.primary : colors.border;
  return (
    <View style={styles.wrap}>
      {label ? (
        <AppText variant="bodySmallStrong" tone="secondary" style={styles.label}>
          {label}
        </AppText>
      ) : null}
      <View style={[styles.field, { borderColor: border, backgroundColor: editable ? colors.surfaceRaised : colors.surfaceMuted }]}>
        {icon ? <Icon name={icon} size="sm" color={focused ? 'primary' : 'icon'} /> : null}
        <TextInput
          ref={ref}
          {...rest}
          editable={editable}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          placeholderTextColor={colors.textMuted}
          style={[styles.input, typography.body, { color: colors.text }, style]}
        />
      </View>
      {error ? (
        <AppText variant="caption" tone="danger" style={styles.hint}>
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption" tone="muted" style={styles.hint}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { marginTop: space.md },
  label: { marginBottom: 6 },
  field: { flexDirection: 'row', alignItems: 'center', gap: space.sm, height: 52, borderRadius: radii.md, borderWidth: 1, paddingHorizontal: space.md },
  input: { flex: 1, height: '100%', paddingVertical: 0 },
  hint: { marginTop: 6 },
});
