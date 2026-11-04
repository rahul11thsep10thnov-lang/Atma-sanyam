// "Planting Record": every session, newest first, grouped by date. Each card
// shows the plant the session earned (the app's own thumbnail), the start and
// end times, and the focused minutes. Records come only from the saved
// history; nothing is generated.
import React, { useMemo, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../../ui/AppText';
import { Icon } from '../../ui/Icon';
import { speciesThumb } from '../../paradise/ui/PlantCatalogSheet';
import { SPECIES_BY_ID, plantName } from '../../paradise/catalog';
import { SIZE_LABEL } from '../../growth/size';
import type { PlantInstance } from '../../paradise/model';
import type { SessionRecord } from '../../types';
import { MONTHS, WEEKDAYS, clock, formatMinutes, type Range } from './stats';
import { GREEN } from './charts';

type Filter = 'period' | 'all';

interface Props {
  visible: boolean;
  onClose: () => void;
  history: SessionRecord[];
  plants: PlantInstance[];
  range: Range;
  periodLabel: string;
}

const dayTitle = (t: number) => {
  const d = new Date(t);
  return `${WEEKDAYS[(d.getDay() + 6) % 7]} / ${MONTHS[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}${d.getFullYear() !== new Date().getFullYear() ? `, ${d.getFullYear()}` : ''}`;
};

export function PlantingRecordSheet({ visible, onClose, history, plants, range, periodLabel }: Props) {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<Filter>('period');
  const [open, setOpen] = useState<string | null>(null);
  const bySession = useMemo(() => new Map(plants.map((p) => [p.sessionId, p])), [plants]);

  const groups = useMemo(() => {
    const rows = [...history].sort((a, b) => b.startedAt - a.startedAt).filter((r) => filter === 'all' || (r.startedAt >= range.start && r.startedAt < range.end));
    const out: { key: string; title: string; rows: SessionRecord[] }[] = [];
    for (const r of rows) {
      const d = new Date(r.startedAt);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const last = out[out.length - 1];
      if (last && last.key === key) last.rows.push(r);
      else out.push({ key, title: dayTitle(r.startedAt), rows: [r] });
    }
    return out;
  }, [history, filter, range]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close planting record" />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 12, maxHeight: '88%' }]}>
          <View style={styles.grab} />
          <View style={styles.head}>
            <AppText variant="heading" style={{ color: '#173A2E', flex: 1 }}>
              Planting Record ({filter === 'all' ? 'All time' : periodLabel})
            </AppText>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" hitSlop={12}>
              <Icon name="close" size={22} color="#173A2E" />
            </Pressable>
          </View>
          <View style={styles.chips}>
            {(['period', 'all'] as Filter[]).map((f) => (
              <Pressable key={f} onPress={() => setFilter(f)} accessibilityRole="button" accessibilityState={{ selected: filter === f }} style={[styles.chip, filter === f && { backgroundColor: GREEN, borderColor: GREEN }]}>
                <AppText variant="caption" style={{ color: filter === f ? '#fff' : '#173A2E' }}>
                  {f === 'period' ? periodLabel : 'All time'}
                </AppText>
              </Pressable>
            ))}
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 12 }}>
            {groups.length === 0 && (
              <AppText variant="bodySmall" style={{ color: '#5A6B63', textAlign: 'center', paddingVertical: 32 }}>
                No sessions in this period yet.
              </AppText>
            )}
            {groups.map((g) => (
              <View key={g.key}>
                <AppText variant="bodyStrong" style={{ color: '#173A2E', marginTop: 14, marginBottom: 6 }}>
                  {g.title}
                </AppText>
                {g.rows.map((r) => {
                  const plant = bySession.get(r.id);
                  const speciesId = plant?.speciesId ?? (r.image.kind === 'plant' ? r.image.speciesId : undefined);
                  const thumb = speciesId && r.outcome === 'completed' ? speciesThumb(speciesId, plant?.size ?? 7) : null;
                  const done = r.outcome === 'completed';
                  const isOpen = open === r.id;
                  return (
                    <Pressable key={r.id} onPress={() => setOpen(isOpen ? null : r.id)} accessibilityRole="button" accessibilityLabel={`Session ${clock(r.startedAt)} to ${clock(r.endedAt)}`} style={styles.card}>
                      <View style={styles.thumb}>{thumb ? <Image source={thumb} style={styles.thumbImg} resizeMode="contain" /> : <Icon name="leaf" size={22} color="#9AAEA5" />}</View>
                      <View style={{ flex: 1 }}>
                        <AppText variant="bodyStrong" style={{ color: '#173A2E' }}>
                          {clock(r.startedAt)} – {clock(r.endedAt)}
                        </AppText>
                        <AppText variant="caption" style={{ color: done ? '#2B3B35' : '#A4573B' }}>
                          {done ? `${formatMinutes(r.durationMinutes)} focused` : 'Stopped early · no plant'} · Unset
                        </AppText>
                        {isOpen && (
                          <View style={{ marginTop: 6, gap: 2 }}>
                            {plant && speciesId && (
                              <AppText variant="caption" style={{ color: '#2B3B35' }}>
                                {plantName(speciesId)} · {SIZE_LABEL[plant.size]} ({SPECIES_BY_ID[speciesId]?.habit === 'tree' ? 'tree' : 'plant'}) · planted {new Date(plant.plantedAt).toLocaleDateString()}
                              </AppText>
                            )}
                            <AppText variant="caption" style={{ color: '#2B3B35' }}>
                              Elapsed {formatMinutes((r.endedAt - r.startedAt) / 60000)} start to end · planned {r.durationMinutes} min
                            </AppText>
                            {!done && (
                              <AppText variant="caption" style={{ color: '#A4573B' }}>
                                {r.failureReason === 'left_app' ? 'You left the app.' : 'You gave up.'}{r.image.kind === 'plant' ? ' A wilted sapling may have been left in the garden.' : ''}
                              </AppText>
                            )}
                          </View>
                        )}
                      </View>
                      <Icon name={isOpen ? 'chevronDown' : 'chevronRight'} size={18} color="#9AAEA5" />
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(8,30,22,0.55)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#F6FAF7', borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 18, paddingTop: 8 },
  grab: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(20,60,45,0.2)', marginBottom: 10 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chips: { flexDirection: 'row', gap: 8, marginTop: 10 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(20,60,45,0.2)' },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 16, padding: 10, marginBottom: 8, shadowColor: '#0a3a2a', shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  thumb: { width: 54, height: 54, borderRadius: 14, backgroundColor: '#EEF5EF', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  thumbImg: { width: '90%', height: '90%' },
});
