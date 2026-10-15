// Scaffold for Player Console tabs: the playful backdrop, a greeting-style
// header with the avatar and the "grown-ups" door, and scrolling content.
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, Avatar, PlayfulBackdrop, RoundButton, useTabBarInset, OfflineBanner } from '../../ui';
import { usePlayer } from '../../context/PlayerContext';
import { useGuardian } from '../../context/GuardianContext';
import { useConsole } from '../../context/ConsoleContext';
import type { RootStackParamList } from '../../navigation/types';
import { palette } from '../../theme/palette';
import { space } from '../../theme/spacing';
import { t } from '../../i18n';

export function PlayerScreen({ title, emoji, children, right }: { title: string; emoji?: string; children: React.ReactNode; right?: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const inset = useTabBarInset();
  const p = usePlayer();
  const g = useGuardian();
  const { setConsole } = useConsole();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const openGrownUps = () =>
    navigation.navigate('AdultGate', {
      onPass: () => {
        setConsole('guardian');
        navigation.reset({ index: 0, routes: [{ name: g.status === 'signedIn' ? 'GuardianConsole' : 'GuardianLogin' }] });
      },
    });
  return (
    <PlayfulBackdrop>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + space.md, paddingBottom: inset + space.lg }]} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Avatar avatarId={p.child?.avatarId} name={p.child?.displayName} size={48} ring />
          <View style={{ flex: 1 }}>
            <AppText variant="display" numberOfLines={1}>
              {emoji ? `${emoji} ` : ''}{title}
            </AppText>
          </View>
          {right}
          <RoundButton emoji="🛡️" label={t('welcome.guardian')} onPress={openGrownUps} color={palette.indigo} size={44} />
        </View>
        {p.watchers > 0 && (
          <View style={styles.watching} accessibilityRole="alert">
            <Text>👀</Text>
            <AppText variant="caption">{t('home.watching')}</AppText>
          </View>
        )}
        <OfflineBanner visible={p.offline} />
        {children}
      </ScrollView>
    </PlayfulBackdrop>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space.screen, maxWidth: 760, width: '100%', alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.lg },
  watching: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: '#FFF4CC', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, marginBottom: space.md },
});
