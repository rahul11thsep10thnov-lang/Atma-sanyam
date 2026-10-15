import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../navigation/types';
import { AppText, Card } from '../ui';
import { ScreenHeader } from '../components/ScreenHeader';
import { fillLegal, LEGAL_DOCS, LEGAL_UPDATED } from '../legal/documents';
import { env } from '../config/env';
import { space } from '../theme/spacing';
import { useTheme } from '../theme/ThemeContext';

export function LegalScreen({ route }: NativeStackScreenProps<RootStackParamList, 'Legal'>) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const doc = LEGAL_DOCS[route.params.doc];
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: space.screen, paddingTop: insets.top + space.lg, paddingBottom: insets.bottom + space.xxxl, maxWidth: 720, width: '100%', alignSelf: 'center' }}>
      <ScreenHeader title={doc.title} subtitle={`Last updated ${LEGAL_UPDATED}`} />
      <Card variant="raised" padding="xl">
        <AppText variant="body" tone="secondary">
          {fillLegal(doc.intro, env.supportEmail)}
        </AppText>
        {doc.sections.map((s) => (
          <View key={s.heading} style={styles.section}>
            <AppText variant="subheading">{s.heading}</AppText>
            {s.paragraphs.map((p, i) => (
              <AppText key={i} variant="body" style={{ marginTop: space.sm }}>
                {fillLegal(p, env.supportEmail)}
              </AppText>
            ))}
          </View>
        ))}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({ section: { marginTop: space.xl } });
