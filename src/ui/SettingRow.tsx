// Rows inside a settings card: icon in a tinted disc, label + hint, and a
// switch, a chevron, or a custom trailing control.
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Switch, View } from 'react-native';
import { AppText } from './AppText';
import { Icon, IconName } from './Icon';
import { space } from '../theme/spacing';
import { useTheme } from '../theme/ThemeContext';

interface BaseProps {
  icon: IconName;
  label: string;
  hint?: string;
  tone?: 'default' | 'danger';
  last?: boolean;
}

export function SettingToggle({ icon, label, hint, value, onValueChange, busy, last }: BaseProps & { value: boolean; onValueChange: (v: boolean) => void; busy?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.row, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider }]}>
      <View style={[styles.disc, { backgroundColor: colors.primarySoft }]}>
        <Icon name={icon} size="sm" color="primary" />
      </View>
      <View style={styles.text}>
        <AppText variant="bodyStrong">{label}</AppText>
        {hint ? (
          <AppText variant="bodySmall" tone="secondary" style={styles.hint}>
            {hint}
          </AppText>
        ) : null}
      </View>
      {busy ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ true: colors.primary, false: colors.borderStrong }}
          thumbColor={colors.white}
          ios_backgroundColor={colors.borderStrong}
          accessibilityLabel={label}
        />
      )}
    </View>
  );
}

export function SettingLink({ icon, label, hint, onPress, tone = 'default', last, trailing }: BaseProps & { onPress: () => void; trailing?: React.ReactNode }) {
  const { colors } = useTheme();
  const danger = tone === 'danger';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider }, pressed && { opacity: 0.7 }]}
    >
      <View style={[styles.disc, { backgroundColor: danger ? colors.dangerSoft : colors.primarySoft }]}>
        <Icon name={icon} size="sm" color={danger ? 'danger' : 'primary'} />
      </View>
      <View style={styles.text}>
        <AppText variant="bodyStrong" tone={danger ? 'danger' : 'text'}>
          {label}
        </AppText>
        {hint ? (
          <AppText variant="bodySmall" tone="secondary" style={styles.hint}>
            {hint}
          </AppText>
        ) : null}
      </View>
      {trailing ?? <Icon name="chevronRight" size="sm" color="icon" />}
    </Pressable>
  );
}

export function SettingBlock({ icon, label, hint, children, last }: BaseProps & { children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.block, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider }]}>
      <View style={styles.row}>
        <View style={[styles.disc, { backgroundColor: colors.primarySoft }]}>
          <Icon name={icon} size="sm" color="primary" />
        </View>
        <View style={styles.text}>
          <AppText variant="bodyStrong">{label}</AppText>
          {hint ? (
            <AppText variant="bodySmall" tone="secondary" style={styles.hint}>
              {hint}
            </AppText>
          ) : null}
        </View>
      </View>
      <View style={styles.blockBody}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md, minHeight: 60 },
  disc: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1 },
  hint: { marginTop: 2 },
  block: {},
  blockBody: { paddingBottom: space.md },
});
