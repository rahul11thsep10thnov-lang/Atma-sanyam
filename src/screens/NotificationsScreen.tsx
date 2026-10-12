// The notification centre: friend requests, acceptances, pokes and group
// invitations, newest first. Opening it marks what is on screen as read.
import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSocial } from '../social/SocialContext';
import { AppNotification, social } from '../social/api';
import { RootStackParamList } from '../navigation/types';
import { AppText } from '../ui/AppText';
import { Button, IconButton } from '../ui/Button';
import { Card } from '../ui/Card';
import { Icon, IconName } from '../ui/Icon';
import { Tactile } from '../ui/Pressable';
import { radii } from '../theme/radii';
import { space } from '../theme/spacing';
import { useTheme } from '../theme/ThemeContext';
import { t, useLanguage } from '../i18n';

const ICON: Record<string, IconName> = { friend_request: 'userPlus', friend_accepted: 'userCheck', poke: 'hand', group_invite: 'users', group: 'users' };

function relative(iso: string): string {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const m = Math.floor(diff / 60_000);
  if (m < 1) return t('notif.justNow');
  if (m < 60) return t('notif.minutesAgo', { n: m });
  const h = Math.floor(m / 60);
  if (h < 24) return t('notif.hoursAgo', { n: h });
  return t('notif.daysAgo', { n: Math.floor(h / 24) });
}

export function NotificationsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  useLanguage();
  const { notifications, unread, refreshNotifications, markRead } = useSocial();
  const [items, setItems] = useState<AppNotification[]>(notifications);
  const [cursor, setCursor] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => setItems(notifications), [notifications]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await refreshNotifications();
    setRefreshing(false);
  }, [refreshNotifications]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // What is on screen counts as seen.
  useEffect(() => {
    const unreadIds = items.filter((n) => !n.readAt).map((n) => n.id);
    if (unreadIds.length === 0) return;
    const timer = setTimeout(() => void markRead(unreadIds).catch(() => undefined), 1200);
    return () => clearTimeout(timer);
  }, [items, markRead]);

  const loadMore = async () => {
    if (loadingMore || items.length === 0) return;
    const before = cursor ?? items[items.length - 1]!.createdAt;
    setLoadingMore(true);
    try {
      const page = await social.notifications(before);
      setItems((cur) => [...cur, ...page.items.filter((n) => !cur.some((c) => c.id === n.id))]);
      setCursor(page.nextCursor);
    } catch {
      // keep what we have
    } finally {
      setLoadingMore(false);
    }
  };

  const open = (n: AppNotification) => {
    const data = (n.data ?? {}) as { type?: string; requestId?: string; sessionId?: string };
    if (n.type === 'friend_request') navigation.navigate('Tabs', { screen: 'Friends', params: { tab: 'requests' } });
    else if (n.type === 'friend_accepted' || n.type === 'poke') navigation.navigate('Tabs', { screen: 'Friends', params: { tab: 'friends' } });
    else if (n.type.startsWith('group') && data.sessionId) navigation.navigate('Tabs', { screen: 'Friends', params: { tab: 'friends' } });
    else return;
    navigation.goBack();
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: insets.top + space.lg }]}>
      <View style={styles.headerRow}>
        <AppText variant="headingLarge" accessibilityRole="header" style={{ flex: 1 }}>
          {t('notif.title')}
        </AppText>
        {unread > 0 && <Button label={t('notif.markAll')} variant="tertiary" size="sm" onPress={() => void markRead('all').catch(() => undefined)} />}
        <IconButton icon="close" label={t('close')} variant="filled" size={40} onPress={() => navigation.goBack()} />
      </View>
      <FlatList
        data={items}
        keyExtractor={(n) => n.id}
        contentContainerStyle={{ paddingHorizontal: space.screen, paddingBottom: insets.bottom + space.xxl, gap: space.sm }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={colors.primary} />}
        onEndReachedThreshold={0.4}
        onEndReached={() => void loadMore()}
        ListEmptyComponent={
          <Card padding="lg" style={styles.empty}>
            <Icon name="bell" size="lg" color="secondary" />
            <AppText variant="bodyStrong" align="center" style={{ marginTop: space.sm }}>{t('notif.emptyTitle')}</AppText>
            <AppText variant="bodySmall" tone="secondary" align="center">{t('notif.emptyBody')}</AppText>
          </Card>
        }
        renderItem={({ item }) => {
          const fresh = !item.readAt;
          return (
            <Tactile onPress={() => open(item)} scaleTo={0.985} accessibilityRole="button" accessibilityLabel={`${item.title}. ${item.body}`}>
              <Card variant={fresh ? 'tinted' : 'base'} padding="md" style={styles.row}>
                <View style={[styles.disc, { backgroundColor: fresh ? colors.primary : colors.primarySoft }]}>
                  <Icon name={ICON[item.type] ?? 'sparkles'} size="sm" color={fresh ? 'onAccent' : 'primary'} />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant={fresh ? 'bodyStrong' : 'body'}>{item.title}</AppText>
                  <AppText variant="bodySmall" tone="secondary">{item.body}</AppText>
                  <AppText variant="caption" tone="muted" style={{ marginTop: 4 }}>{relative(item.createdAt)}</AppText>
                </View>
                {fresh && <View style={[styles.dot, { backgroundColor: colors.primary }]} />}
              </Card>
            </Tactile>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.screen, marginBottom: space.md },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  disc: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  empty: { alignItems: 'center', marginTop: space.xl, borderRadius: radii.lg },
});
