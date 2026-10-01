// Typographic text: one of the scale's variants plus a colour role, so a
// screen never hand-picks a font size or an ink colour.
import React from 'react';
import { Text, TextProps, TextStyle } from 'react-native';
import { typography, TypographyVariant } from '../theme/typography';
import { useTheme } from '../theme/ThemeContext';

export type TextRole = 'text' | 'secondary' | 'muted' | 'onAccent' | 'inverse' | 'primary' | 'accent' | 'success' | 'warning' | 'danger';

export interface AppTextProps extends TextProps {
  variant?: TypographyVariant;
  /** Ink colour role (not the accessibility `role`). */
  tone?: TextRole;
  align?: TextStyle['textAlign'];
  children?: React.ReactNode;
}

export function AppText({ variant = 'body', tone = 'text', align, style, ...rest }: AppTextProps) {
  const { colors } = useTheme();
  const ink: Record<TextRole, string> = {
    text: colors.text,
    secondary: colors.textSecondary,
    muted: colors.textMuted,
    onAccent: colors.textOnAccent,
    inverse: colors.textInverse,
    primary: colors.primary,
    accent: colors.accent,
    success: colors.success,
    warning: colors.warning,
    danger: colors.danger,
  };
  return <Text {...rest} style={[typography[variant], { color: ink[tone] }, align ? { textAlign: align } : null, style]} />;
}
