import React, { useCallback, useState } from 'react';
import { Dimensions, FlatList, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, typography } from '../theme/colors';
import { loadHistory } from '../storage/history';
import { SessionRecord } from '../types';
import { SessionThumb } from '../components/SessionThumb';

const COLUMNS = 3;
const SCREEN_WIDTH = Dimensions.get('window').width;
const GAP = 12;
const PADDING = spacing.screenPadding;
const THUMB_SIZE = (SCREEN_WIDTH - PADDING * 2 - GAP * (COLUMNS - 1)) / COLUMNS;

function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function HistoryScreen() {
  const [history, setHistory] = useState<SessionRecord[]>([]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      loadHistory().then((h) => {
        if (active) setHistory(h);
      });
      return () => {
        active = false;
      };
    }, [])
  );

  const completedCount = history.filter((h) => h.outcome === 'completed').length;

  return (
    <View style={styles.screen}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Garden</Text>
        <Text style={styles.subtitle}>
          {completedCount} completed · {history.length - completedCount} incomplete
        </Text>
      </View>
      {history.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No sessions yet. Start a focus session to grow your garden.</Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id}
          numColumns={COLUMNS}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={{ gap: GAP, marginBottom: GAP }}
          renderItem={({ item }) => (
            <View style={{ width: THUMB_SIZE }}>
              <SessionThumb session={item} size={THUMB_SIZE} />
              <Text style={styles.itemMeta} numberOfLines={1}>
                {item.durationMinutes}m · {formatDate(item.startedAt)}
              </Text>
              {item.outcome === 'failed' && (
                <Text style={styles.itemFailed}>
                  {item.failureReason === 'left_app' ? 'left app' : 'gave up'}
                </Text>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, paddingHorizontal: PADDING, paddingTop: 24 },
  headerRow: { marginBottom: 20 },
  title: { ...typography.heading, color: colors.text },
  subtitle: { ...typography.caption, color: colors.textSecondary, marginTop: 4 },
  listContent: { paddingBottom: 40 },
  itemMeta: { ...typography.caption, color: colors.textSecondary, marginTop: 6 },
  itemFailed: { ...typography.caption, color: colors.danger, fontWeight: '700', marginTop: 2 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyText: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
});
