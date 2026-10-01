// Button system (PHASE 4): primary / secondary / tertiary / destructive /
// icon. One component, tokens only — never style a Pressable as a button
// elsewhere.
import React from 'react';
import { ActivityIndicator, StyleSheet, View, ViewStyle } from 'react-native';
import { AppText } from './AppText';
import { Icon, IconName } from './Icon';
import { Tactile, TactileProps } from './Pressable';
import { radii } from '../theme/radii';
import { space } from '../theme/spacing';
import { useTheme } from '../theme/ThemeContext';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<TactileProps, 'children'> {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  iconRight?: IconName;
  loading?: boolean;
  fullWidth?: boolean;
}

const HEIGHT: Record<ButtonSize, number> = { sm: 40, md: 52, lg: 56 };
const PAD: Record<ButtonSize, number> = { sm: 14, md: 18, lg: 22 };

export function Button({ label, variant = 'primary', size = 'md', icon, iconRight, loading, fullWidth, disabled, style, ...rest }: ButtonProps) {
  const { colors, shadow } = useTheme();
  const isDisabled = disabled || loading;

  const surface: Record<ButtonVariant, ViewStyle> = {
    primary: { backgroundColor: colors.primary, ...shadow.level2 },
    secondary: { backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.borderStrong },
    tertiary: { backgroundColor: 'transparent' },
    destructive: { backgroundColor: colors.dangerSoft },
  };
  const ink: Record<ButtonVariant, string> = {
    primary: colors.textOnAccent,
    secondary: colors.text,
    tertiary: colors.primary,
    destructive: colors.danger,
  };

  return (
    <Tactile
      {...rest}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      style={[
        styles.base,
        { height: HEIGHT[size], paddingHorizontal: PAD[size], borderRadius: size === 'sm' ? radii.sm : radii.md },
        surface[variant],
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={ink[variant]} />
      ) : (
        <View style={styles.row}>
          {icon && <Icon name={icon} size={size === 'sm' ? 'xs' : 'sm'} color={ink[variant]} />}
          <AppText variant={size === 'sm' ? 'buttonSmall' : 'button'} style={{ color: ink[variant] }} numberOfLines={1}>
            {label}
          </AppText>
          {iconRight && <Icon name={iconRight} size={size === 'sm' ? 'xs' : 'sm'} color={ink[variant]} />}
        </View>
      )}
    </Tactile>
  );
}

export interface IconButtonProps extends Omit<TactileProps, 'children'> {
  icon: IconName;
  label: string; // accessibility
  size?: number; // visual diameter
  variant?: 'plain' | 'filled' | 'tinted' | 'onImage';
  color?: string;
}

export function IconButton({ icon, label, size = 44, variant = 'plain', color, style, ...rest }: IconButtonProps) {
  const { colors } = useTheme();
  const surface: Record<NonNullable<IconButtonProps['variant']>, ViewStyle> = {
    plain: { backgroundColor: 'transparent' },
    filled: { backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border },
    tinted: { backgroundColor: colors.primarySoft },
    onImage: { backgroundColor: 'rgba(20,12,8,0.35)' },
  };
  const ink = color ?? (variant === 'onImage' ? colors.white : variant === 'tinted' ? colors.primary : colors.text);
  const slop = Math.max(0, (space.touchTarget - size) / 2);
  return (
    <Tactile
      {...rest}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={slop}
      style={[styles.iconBtn, { width: size, height: size, borderRadius: size / 2 }, surface[variant], style]}
    >
      <Icon name={icon} size={size >= 48 ? 'md' : 'sm'} color={ink} />
    </Tactile>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' },
  fullWidth: { alignSelf: 'stretch' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  disabled: { opacity: 0.5 },
  iconBtn: { alignItems: 'center', justifyContent: 'center' },
});
