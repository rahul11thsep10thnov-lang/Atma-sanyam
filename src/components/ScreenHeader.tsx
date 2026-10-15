// Title row with a back button, used by stack screens in both consoles.
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AppText } from '../ui/AppText';
import { IconButton } from '../ui/Button';
import { space } from '../theme/spacing';
import { useTheme } from '../theme/ThemeContext';
import { t } from '../i18n';

export function ScreenHeader({ title, subtitle, right, onBack, large }: { title: string; subtitle?: string; right?: React.ReactNode; onBack?: () => void; large?: boolean }) {
  const nav = useNavigation();
  const { mode } = useTheme();
  const back = onBack ?? (() => nav.goBack());
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <IconButton icon="arrowLeft" label={t('common.back')} onPress={back} size={44} />
        <View style={{ flex: 1 }}>
          <AppText variant={mode === 'player' ? (large ? 'display' : 'heading') : large ? 'dashTitle' : 'dashHeading'} numberOfLines={2}>
            {title}
          </AppText>
          {subtitle ? (
            <AppText variant="bodySmall" tone="secondary" numberOfLines={2}>
              {subtitle}
            </AppText>
          ) : null}
        </View>
        {right}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: space.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
