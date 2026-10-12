// The small sign-in chip at the top right of Home: the mode chips' peach and
// condensed face, a third of their height. Signed out it says "Sign in";
// signed in it shows the avatar and username (or "Finish set-up" while the
// account is incomplete).
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../../ui/Avatar';
import { Icon } from '../../ui/Icon';
import { CHIP_FONT } from '../../ui/ModeChips';
import { Tactile } from '../../ui/Pressable';
import { radii } from '../../theme/radii';
import { useTheme } from '../../theme/ThemeContext';
import { t } from '../../i18n';

const PEACH = '#FBD0AE';
const PEACH_SOFT = '#FBE8D9';
const INK = '#2B2118';

export function SignInChip({ onPress }: { onPress: () => void }) {
  const { isDark } = useTheme();
  const { status, user, onboarding } = useAuth();
  const signedIn = status === 'signedIn' && !!user;
  const incomplete = signedIn && !!onboarding && (onboarding.needsPassword || onboarding.needsUsername);
  const label = !signedIn ? t('auth.chip.signIn') : incomplete ? t('auth.chip.finish') : user.username ? `@${user.username}` : t('auth.chip.profile');
  const ink = isDark && !signedIn ? '#F3D9C2' : INK;
  return (
    <Tactile
      onPress={onPress}
      scaleTo={0.95}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={[styles.chip, { backgroundColor: signedIn ? PEACH : isDark ? 'rgba(251,208,174,0.18)' : PEACH_SOFT, borderColor: signedIn ? '#E8A878' : 'transparent' }]}
    >
      {signedIn ? (
        <Avatar avatarId={user.avatarId} name={user.username ?? user.displayName ?? user.phoneMasked ?? '·'} size={22} />
      ) : (
        <View style={styles.iconWrap}>
          <Icon name="user" size="xs" color={ink} />
        </View>
      )}
      <Text style={[styles.label, { color: ink }]} numberOfLines={1}>
        {label}
      </Text>
    </Tactile>
  );
}

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 34, maxWidth: 150, paddingLeft: 7, paddingRight: 12, borderRadius: radii.lg, borderWidth: 1.5 },
  iconWrap: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: CHIP_FONT, fontSize: 17, letterSpacing: 1, lineHeight: 20, flexShrink: 1 },
});
