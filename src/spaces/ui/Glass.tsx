// Controls that float over the photograph: a smoked, warm translucent pill
// so the balcony stays the subject and the controls read on any part of it.
import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { AppText } from '../../ui/AppText';
import { Icon, IconName } from '../../ui/Icon';
import { Tactile } from '../../ui/Pressable';
import { radii } from '../../theme/radii';

export const GLASS = 'rgba(28,20,14,0.44)';
export const GLASS_EDGE = 'rgba(255,248,238,0.16)';
export const CREAM = '#FBF5EC';
export const INK = '#2B2118';

export function GlassPill({
  icon,
  label,
  onPress,
  emphasis,
  active,
  compact,
  style,
  accessibilityLabel,
}: {
  icon?: IconName;
  label?: string;
  onPress?: () => void;
  emphasis?: boolean;
  active?: boolean;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const light = emphasis || active;
  const ink = light ? INK : '#FFFFFF';
  return (
    <Tactile
      onPress={onPress}
      disabled={!onPress}
      scaleTo={0.95}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected: !!active }}
      style={[styles.pill, compact && styles.compact, !label && styles.round, { backgroundColor: light ? CREAM : GLASS, borderColor: light ? 'transparent' : GLASS_EDGE }, style]}
    >
      {icon && <Icon name={icon} size="xs" color={ink} />}
      {label ? (
        <AppText variant="bodySmallStrong" style={{ color: ink }} numberOfLines={1}>
          {label}
        </AppText>
      ) : null}
    </Tactile>
  );
}

export function GlassChip({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.chip, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  pill: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  compact: { height: 38, paddingHorizontal: 13 },
  round: { width: 44, paddingHorizontal: 0 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: GLASS,
    borderColor: GLASS_EDGE,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    height: 32,
  },
});
