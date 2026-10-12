// The notification bell beside the sign-in chip: the same small peach disc,
// with the unread count on a terracotta badge.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSocial } from '../../social/SocialContext';
import { Icon } from '../../ui/Icon';
import { CHIP_FONT } from '../../ui/ModeChips';
import { Tactile } from '../../ui/Pressable';
import { useTheme } from '../../theme/ThemeContext';
import { t } from '../../i18n';

const PEACH = '#FBD0AE';
const PEACH_SOFT = '#FBE8D9';
const INK = '#2B2118';

export function BellChip({ onPress }: { onPress: () => void }) {
  const { isDark, colors } = useTheme();
  const { unread } = useSocial();
  const ink = isDark ? '#F3D9C2' : INK;
  return (
    <Tactile
      onPress={onPress}
      scaleTo={0.92}
      accessibilityRole="button"
      accessibilityLabel={unread > 0 ? t('notif.bellA11yCount', { count: unread }) : t('notif.bellA11y')}
      hitSlop={8}
      style={[styles.chip, { backgroundColor: unread > 0 ? PEACH : isDark ? 'rgba(251,208,174,0.18)' : PEACH_SOFT, borderColor: unread > 0 ? '#E8A878' : 'transparent' }]}
    >
      <Icon name={unread > 0 ? 'bellRing' : 'bell'} size="sm" color={unread > 0 ? INK : ink} />
      {unread > 0 && (
        <View style={[styles.badge, { backgroundColor: colors.primary, borderColor: colors.background }]}>
          <Text style={styles.badgeText}>{unread > 99 ? '99+' : String(unread)}</Text>
        </View>
      )}
    </Tactile>
  );
}

const styles = StyleSheet.create({
  chip: { width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: -6, right: -8, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontFamily: CHIP_FONT, fontSize: 12, lineHeight: 14, color: '#FFFFFF', letterSpacing: 0.3 },
});
