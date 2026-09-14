import React, { useCallback, useState } from 'react';
import { Dimensions, FlatList, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { loadHistory } from '../storage/history';
import { SessionRecord } from '../types';
import { SessionThumb } from '../components/SessionThumb';

const COLUMNS = 3;
const SCREEN_WIDTH = Dimensions.get('window').width;
const GAP = 12;
const PADDING = 20;
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
  title: { fontSize: 26, fontWeight: '800', color: colors.text },
  subtitle: { color: colors.textMuted, marginTop: 4, fontSize: 13 },
  listContent: { paddingBottom: 40 },
  itemMeta: { color: colors.textMuted, fontSize: 11, marginTop: 6 },
  itemFailed: { color: colors.danger, fontSize: 10, fontWeight: '700', marginTop: 2 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyText: { color: colors.textFaint, textAlign: 'center', fontSize: 14 },
});
