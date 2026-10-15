// First screen: choose the Guardian or the Player door. Web and native
// share it; a household phone shows both signed-in consoles to switch.
import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../navigation/types';
import { AppText, Bob, CandyCard, PlayfulBackdrop, PopIn, Tactile } from '../ui';
import { space } from '../theme/spacing';
import { palette } from '../theme/palette';
import { useGuardian } from '../context/GuardianContext';
import { usePlayer } from '../context/PlayerContext';
import { useConsole } from '../context/ConsoleContext';
import { t } from '../i18n';

const LOGO_COLORS = [palette.bubblegum, palette.sunshine, palette.sky, palette.lime];

export function LojiLogo({ size = 56 }: { size?: number }) {
  return (
    <View style={{ flexDirection: 'row' }} accessibilityRole="header" accessibilityLabel="LoJi">
      {['L', 'o', 'J', 'i'].map((ch, i) => (
        <Bob key={ch} amplitude={4} duration={1200 + i * 150}>
          <Text style={{ fontFamily: 'Fredoka_700Bold', fontSize: size, color: LOGO_COLORS[i], textShadowColor: 'rgba(0,0,0,0.15)', textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 0 }}>{ch}</Text>
        </Bob>
      ))}
    </View>
  );
}

export function WelcomeScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Welcome'>) {
  const insets = useSafeAreaInsets();
  const g = useGuardian();
  const p = usePlayer();
  const { setConsole } = useConsole();
  const openGuardian = () => {
    setConsole('guardian');
    navigation.navigate(g.status === 'signedIn' ? 'GuardianConsole' : 'GuardianLogin');
  };
  const openPlayer = () => {
    setConsole('player');
    navigation.navigate(p.status === 'signedIn' ? 'PlayerConsole' : 'PlayerLogin');
  };
  return (
    <PlayfulBackdrop>
      <View style={[styles.wrap, { paddingTop: insets.top + space.huge, paddingBottom: insets.bottom + space.xxl }]}>
        <PopIn style={styles.center}>
          <LojiLogo size={72} />
          <AppText variant="subheading" tone="secondary" align="center" style={{ marginTop: space.sm }}>
            {t('app.tagline')}
          </AppText>
        </PopIn>
        <PopIn delay={150} style={{ marginTop: space.xxxl }}>
          <AppText variant="heading" align="center">
            {t('welcome.title')}
          </AppText>
          <AppText variant="body" tone="secondary" align="center" style={{ marginTop: space.sm, paddingHorizontal: space.lg }}>
            {t('welcome.subtitle')}
          </AppText>
        </PopIn>
        <View style={styles.doors}>
          <PopIn delay={300}>
            <CandyCard color={palette.sky} onPress={openPlayer} label={t('welcome.player')}>
              <View style={styles.door}>
                <Text style={styles.doorEmoji}>🎮</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.doorTitle}>{t('welcome.player')}</Text>
                  <Text style={styles.doorHint}>{p.status === 'signedIn' && p.child ? t('home.hello', { name: p.child.displayName }) : t('welcome.playerHint')}</Text>
                </View>
              </View>
            </CandyCard>
          </PopIn>
          <PopIn delay={420}>
            <CandyCard color={palette.indigo} onPress={openGuardian} label={t('welcome.guardian')}>
              <View style={styles.door}>
                <Text style={styles.doorEmoji}>🛡️</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.doorTitle}>{t('welcome.guardian')}</Text>
                  <Text style={styles.doorHint}>{g.status === 'signedIn' && g.guardian ? g.guardian.name : t('welcome.guardianHint')}</Text>
                </View>
              </View>
            </CandyCard>
          </PopIn>
        </View>
        {Platform.OS === 'web' && (
          <AppText variant="caption" tone="muted" align="center" style={{ marginTop: space.xl }}>
            {t('welcome.web')}
          </AppText>
        )}
        <Tactile onPress={() => navigation.navigate('Legal', { doc: 'privacy' })} style={{ marginTop: space.lg, alignSelf: 'center' }} accessibilityRole="link">
          <AppText variant="caption" tone="muted">
            {t('settings.privacy')} · {t('settings.terms')}
          </AppText>
        </Tactile>
      </View>
    </PlayfulBackdrop>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: space.screen, maxWidth: 560, width: '100%', alignSelf: 'center' },
  center: { alignItems: 'center' },
  doors: { marginTop: space.xxxl, gap: space.lg },
  door: { flexDirection: 'row', alignItems: 'center', gap: space.lg, padding: space.xl },
  doorEmoji: { fontSize: 44 },
  doorTitle: { fontFamily: 'Fredoka_700Bold', fontSize: 24, color: '#fff' },
  doorHint: { fontFamily: 'Nunito_600SemiBold', fontSize: 14, color: 'rgba(255,255,255,0.9)', marginTop: 2 },
});
