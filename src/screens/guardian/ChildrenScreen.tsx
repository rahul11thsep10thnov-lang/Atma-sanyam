import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { CompositeScreenProps, useFocusEffect } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { GuardianTabParamList, RootStackParamList } from '../../navigation/types';
import { AppText, Avatar, Button, Card, Icon, Screen, useTabBarInset, EmptyState, Badge } from '../../ui';
import { guardianApi } from '../../api/guardian';
import { useGuardian } from '../../context/GuardianContext';
import { space } from '../../theme/spacing';
import { useTheme } from '../../theme/ThemeContext';
import type { Child } from '../../types';
import { t } from '../../i18n';

type Props = CompositeScreenProps<BottomTabScreenProps<GuardianTabParamList, 'Children'>, NativeStackScreenProps<RootStackParamList>>;

export function ChildrenScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const g = useGuardian();
  const inset = useTabBarInset();
  const [children, setChildren] = useState<Child[]>(g.children);
  useFocusEffect(
    useCallback(() => {
      guardianApi.children().then(setChildren).catch(() => undefined);
      void g.refresh();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );
  return (
    <Screen scroll bottomInset={inset}>
      <View style={styles.title}>
        <AppText variant="dashTitle" style={{ flex: 1 }}>{t('tabs.children')}</AppText>
        <Button label={t('dash.addChild')} size="sm" icon="userPlus" onPress={() => navigation.navigate('ChildEditor', {})} disabled={!g.entitled || children.length >= 8} />
      </View>
      {children.length === 0 ? (
        <EmptyState icon="users" title={t('dash.noChildren')} action={g.entitled ? { label: t('dash.addChild'), onPress: () => navigation.navigate('ChildEditor', {}) } : undefined} />
      ) : (
        children.map((c) => (
          <Card key={c.id} variant="raised" padding="lg" style={styles.card} onPress={() => navigation.navigate('ChildDetail', { childId: c.id })} accessibilityLabel={c.displayName}>
            <View style={styles.row}>
              <Avatar avatarId={c.avatarId} name={c.displayName} size={56} />
              <View style={{ flex: 1 }}>
                <AppText variant="dashHeading">{c.displayName}</AppText>
                <AppText variant="bodySmall" tone="secondary">
                  {c.age} · {t(`bracket.${c.effectiveBracket}` as 'bracket.A')}
                </AppText>
                <View style={styles.badges}>
                  <Badge label={c.playerId} icon="hash" color={colors.primarySoft} />
                  {c.status === 'paused' && <Badge label={t('games.paused')} color={colors.warningSoft} />}
                </View>
              </View>
              <Icon name="chevronRight" color="icon" />
            </View>
          </Card>
        ))
      )}
      {children.length >= 8 && (
        <AppText variant="caption" tone="muted" align="center">{t('child.max')}</AppText>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.lg },
  card: { marginBottom: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  badges: { flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' },
});
