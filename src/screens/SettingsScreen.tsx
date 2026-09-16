import React from 'react';
import { Alert, StyleSheet, Switch, Text, View, Pressable } from 'react-native';
import { colors, radius, spacing, typography, buttonHeight } from '../theme/colors';
import { useSettings } from '../context/SettingsContext';
import { clearHistory } from '../storage/history';
import { requestNotificationPermissionsAsync } from '../notifications/safeNotifications';

export function SettingsScreen() {
  const { settings, updateSettings } = useSettings();

  const toggleNotifications = async (value: boolean) => {
    if (value) {
      const perm = await requestNotificationPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          'Permission denied',
          'Enable notifications for FOCUS in your device settings to get away-from-app warnings.'
        );
        return;
      }
    }
    updateSettings({ notificationsEnabled: value });
  };

  const toggleSound = (value: boolean) => {
    updateSettings({ soundEnabled: value });
  };

  const handleClearHistory = () => {
    Alert.alert('Clear history?', 'This removes all saved sessions from your garden.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          await clearHistory();
          Alert.alert('History cleared');
        },
      },
    ]);
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Settings</Text>

      <View style={styles.row}>
        <View style={styles.rowText}>
          <Text style={styles.rowLabel}>Away-from-app warnings</Text>
          <Text style={styles.rowHint}>Send a notification if you leave mid-session</Text>
        </View>
        <Switch
          value={settings.notificationsEnabled}
          onValueChange={toggleNotifications}
          trackColor={{ true: colors.primary, false: colors.border }}
          thumbColor={colors.white}
        />
      </View>

      <View style={styles.row}>
        <View style={styles.rowText}>
          <Text style={styles.rowLabel}>Sound & haptics</Text>
          <Text style={styles.rowHint}>Play a cue when a session completes or fails</Text>
        </View>
        <Switch
          value={settings.soundEnabled}
          onValueChange={toggleSound}
          trackColor={{ true: colors.primary, false: colors.border }}
          thumbColor={colors.white}
        />
      </View>

      <Pressable style={styles.dangerBtn} onPress={handleClearHistory}>
        <Text style={styles.dangerBtnText}>Clear history</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.screenPadding, paddingTop: 24 },
  title: { ...typography.heading, color: colors.text, marginBottom: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.cardPadding,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowText: { flex: 1, paddingRight: 12 },
  rowLabel: { ...typography.title, color: colors.text },
  rowHint: { ...typography.caption, color: colors.textSecondary, marginTop: 4 },
  dangerBtn: {
    marginTop: 24,
    height: buttonHeight,
    borderRadius: radius.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.danger,
  },
  dangerBtnText: { ...typography.title, color: colors.danger },
});
