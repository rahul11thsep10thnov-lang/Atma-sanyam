// First launch: choose a language. Also reachable from Settings.
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSettings } from '../context/SettingsContext';
import { RootStackParamList } from '../navigation/types';
import { AppText } from '../ui/AppText';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { Tactile } from '../ui/Pressable';
import { radii } from '../theme/radii';
import { space } from '../theme/spacing';
import { useTheme } from '../theme/ThemeContext';
import { Language, LANGUAGES, normaliseLanguage, t, getLanguage } from '../i18n';
import { AnimatedWallpaper } from '../components/AnimatedWallpaper';

export function LanguageScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { colors, shadow } = useTheme();
  const { settings, updateSettings } = useSettings();
  const [choice, setChoice] = useState<Language>(normaliseLanguage(settings.language) ?? getLanguage());

  // The app switches language by remounting the navigator (RootNavigator applies
  // settings.language), so leave this screen first and save the choice after:
  // the remount then restores the screen being returned to, in the new language.
  const confirm = async () => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.replace('Tabs', { screen: 'Home' });
    await new Promise((r) => setTimeout(r, 350));
    await updateSettings({ language: choice });
  };

  return (
    <AnimatedWallpaper style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + space.huge, paddingBottom: insets.bottom + space.xl, paddingHorizontal: space.screen }}>
        <AppText variant="headingLarge" accessibilityRole="header">
          {t('language.title')}
        </AppText>
        <AppText variant="bodySmall" tone="secondary" style={{ marginTop: space.xs, marginBottom: space.xl }}>
          {t('language.body')}
        </AppText>
        <View style={styles.list}>
          {LANGUAGES.map((l) => {
            const on = l.id === choice;
            return (
              <Tactile
                key={l.id}
                onPress={() => setChoice(l.id)}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                accessibilityLabel={l.name}
                style={[styles.row, { backgroundColor: colors.surfaceRaised, borderColor: on ? colors.primary : colors.border }, on && shadow.level2]}
              >
                <View style={{ flex: 1 }}>
                  <AppText variant="bodyStrong">{l.native}</AppText>
                  <AppText variant="caption" tone="secondary">
                    {l.name}
                  </AppText>
                </View>
                {on && <Icon name="check" size="sm" color="primary" />}
              </Tactile>
            );
          })}
        </View>
        <Button label={t('language.continue')} size="lg" fullWidth onPress={() => void confirm()} style={{ marginTop: space.xl }} />
      </ScrollView>
    </AnimatedWallpaper>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  list: { gap: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radii.md, borderWidth: 1.5 },
});
