// One legal document (Terms, Privacy, Account deletion, Subscription & refund,
// Community guidelines), opened from Settings → Legal or from the sign-in
// screen. The text lives in src/legal/documents.ts.
import React from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { env, isBackendConfigured } from '../config/env';
import { fillLegal, legalDocFor, legalOrderFor, LEGAL_PUBLISHER, LEGAL_UPDATED, LegalDocId } from '../legal/documents';
import { RootStackParamList } from '../navigation/types';
import { Screen } from '../ui/Screen';
import { AppText } from '../ui/AppText';
import { Button, IconButton } from '../ui/Button';
import { Card } from '../ui/Card';
import { space } from '../theme/spacing';
import { StringKey, t, useLanguage } from '../i18n';

export function LegalScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Legal'>>();
  useLanguage();
  // An offline build has no account deletion or community guidelines; fall
  // back to the Terms if one of those is asked for.
  const doc = legalDocFor(route.params.doc, isBackendConfigured) ?? legalDocFor('terms', isBackendConfigured)!;
  const email = env.supportEmail;
  const fill = (text: string) => fillLegal(text, email);
  const others = legalOrderFor(isBackendConfigured).filter((id) => id !== doc.id);

  return (
    <Screen scroll>
      <View style={styles.headerRow}>
        <AppText variant="overline" tone="muted" style={{ flex: 1 }}>
          {t('legal.header').toUpperCase()}
        </AppText>
        <IconButton icon="close" label={t('close')} variant="filled" size={40} onPress={() => navigation.goBack()} />
      </View>

      <AppText variant="headingLarge" accessibilityRole="header">
        {t(`legal.${doc.id}` as StringKey)}
      </AppText>
      <AppText variant="caption" tone="muted" style={styles.meta}>
        {t('legal.updated', { date: LEGAL_UPDATED })} · {LEGAL_PUBLISHER} · {t('legal.englishOnly')}
      </AppText>
      <AppText variant="body" tone="secondary" style={styles.intro}>
        {fill(doc.intro)}
      </AppText>

      {doc.sections.map((section) => (
        <View key={section.heading} style={styles.section} accessible={false}>
          <AppText variant="heading" accessibilityRole="header">
            {section.heading}
          </AppText>
          {section.paragraphs.map((p, i) => (
            <AppText key={i} variant="body" style={styles.paragraph} selectable>
              {fill(p)}
            </AppText>
          ))}
        </View>
      ))}

      <Card variant="tinted" padding="md" style={styles.contact}>
        <AppText variant="bodyStrong">{t('legal.contact')}</AppText>
        <AppText variant="bodySmall" tone="secondary">
          {LEGAL_PUBLISHER} · Tame
        </AppText>
        {email ? <Button label={email} variant="secondary" size="sm" icon="mail" onPress={() => void Linking.openURL(`mailto:${email}`)} style={styles.mailBtn} /> : null}
      </Card>

      <AppText variant="overline" tone="muted" style={styles.moreHead}>
        {t('legal.more').toUpperCase()}
      </AppText>
      <View style={styles.moreRow}>
        {others.map((id: LegalDocId) => (
          <Button key={id} label={t(`legal.${id}` as StringKey)} variant="tertiary" size="sm" onPress={() => navigation.replace('Legal', { doc: id })} />
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: space.md },
  meta: { marginTop: space.xs },
  intro: { marginTop: space.md },
  section: { marginTop: space.xl, gap: space.sm },
  paragraph: { lineHeight: 22 },
  contact: { marginTop: space.xxl, gap: 4 },
  mailBtn: { marginTop: space.sm, alignSelf: 'flex-start' },
  moreHead: { marginTop: space.xl },
  moreRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs, marginLeft: -space.md },
});
