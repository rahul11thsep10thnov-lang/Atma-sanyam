// Card surfaces (PHASE 5): base / raised / floating / tinted. Radius and
// elevation come from tokens; content decides the padding.
import React from 'react';
import { StyleProp, StyleSheet, View, ViewProps, ViewStyle } from 'react-native';
import { radii } from '../theme/radii';
import { space } from '../theme/spacing';
import { useTheme } from '../theme/ThemeContext';
import { Tactile, TactileProps } from './Pressable';

export type CardVariant = 'base' | 'raised' | 'floating' | 'tinted' | 'outline';

export interface CardProps extends ViewProps {
  variant?: CardVariant;
  padding?: keyof typeof space | 0;
  radius?: keyof typeof radii;
  style?: StyleProp<ViewStyle>;
  onPress?: TactileProps['onPress'];
  accessibilityLabel?: string;
}

export function useCardStyle(variant: CardVariant): ViewStyle {
  const { colors, shadow } = useTheme();
  const styles: Record<CardVariant, ViewStyle> = {
    base: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
    raised: { backgroundColor: colors.surfaceRaised, ...shadow.level2 },
    floating: { backgroundColor: colors.surfaceRaised, ...shadow.level3 },
    tinted: { backgroundColor: colors.surfaceTinted },
    outline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.borderStrong },
  };
  return styles[variant];
}

export function Card({ variant = 'base', padding = 'card', radius = 'md', style, onPress, children, ...rest }: CardProps) {
  const surface = useCardStyle(variant);
  const box: ViewStyle = { borderRadius: radii[radius], padding: padding === 0 ? 0 : space[padding], overflow: 'hidden' };
  if (onPress) {
    return (
      <Tactile onPress={onPress} scaleTo={0.985} accessibilityRole="button" style={[base.card, surface, box, style]} {...(rest as object)}>
        {children}
      </Tactile>
    );
  }
  return (
    <View style={[base.card, surface, box, style]} {...rest}>
      {children}
    </View>
  );
}

const base = StyleSheet.create({ card: {} });
