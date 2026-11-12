// The Garden tab's overview: a miniature island that grows with every
// completed focus session, and (tap the island) the chronological Planting Record.
// Focus statistics live in the Progress tab (FocusInsights).
//
// Data: the saved session history (src/storage/history) and the saved plants
// (src/paradise). This screen only reads them. The painted garden scene is
// still one tap away ("Open the garden scene").
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../../ui/AppText';
import { Icon } from '../../ui/Icon';
import { TAB_BAR_HEIGHT, TAB_BAR_MARGIN } from '../../ui/TabBar';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { loadHistory } from '../../storage/history';
import { SPECIES_BY_ID } from '../../paradise/catalog';
import { isKnown } from '../../paradise/model';
import { useParadise } from '../../paradise/repository';
import type { SessionRecord } from '../../types';
import { GardenIsland, IslandPlant } from './GardenIsland';
import { PlantingRecordSheet } from './PlantingRecordSheet';
import { Period, isCurrentOrFuture, periodLabel, rangeOf, shiftAnchor } from './stats';

const FOREST = '#0F3B2C';
const FOREST_2 = '#165240';
const CARD = '#FBFDFB';
const INK = '#173A2E';
const PERIODS: { id: Period; label: string }[] = [
  { id: 'day', label: 'Day' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'year', label: 'Year' },
];

export function GardenOverviewScreen({ onOpenScene }: { onOpenScene: () => void }) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const reduced = useReducedMotion();
  const focused = useIsFocused();
  const [paradise] = useParadise();
  const [history, setHistory] = useState<SessionRecord[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [period, setPeriod] = useState<Period>('month');
  const [anchor, setAnchor] = useState(() => new Date());
  const [record, setRecord] = useState(false);
  const enter = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  const swap = useRef(new Animated.Value(1)).current;

  // reload the history each time the tab is shown (a session may just have finished)
  useEffect(() => {
    if (!focused) return;
    let alive = true;
    loadHistory().then((h) => {
      if (alive) {
        setHistory(h);
        setLoaded(true);
      }
    });
    return () => {
      alive = false;
    };
  }, [focused, paradise?.version]);

  useEffect(() => {
    if (reduced) return enter.setValue(1);
    Animated.timing(enter, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [enter, reduced]);

  const changePeriod = useCallback(
    (next: Period, nextAnchor: Date) => {
      setPeriod(next);
      setAnchor(nextAnchor);
      if (reduced) return;
      swap.setValue(0.25);
      Animated.timing(swap, { toValue: 1, duration: 360, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    },
    [reduced, swap],
  );

  const range = useMemo(() => rangeOf(period, anchor), [period, anchor]);
  const label = periodLabel(period, anchor);

  // the plants this period's sessions earned, and the totals
  const allPlants = useMemo(() => (paradise?.plants ?? []).filter(isKnown), [paradise]);
  const inRange = useMemo(() => allPlants.filter((p) => p.plantedAt >= range.start && p.plantedAt < range.end), [allPlants, range]);
  const isTree = (id: string) => SPECIES_BY_ID[id]?.habit === 'tree';
  const trees = inRange.filter((p) => isTree(p.speciesId)).length;
  const plantsOnly = inRange.length - trees;
  const allTrees = allPlants.filter((p) => isTree(p.speciesId)).length;
  const islandPlants: IslandPlant[] = useMemo(() => inRange.map((p) => ({ id: p.id, speciesId: p.speciesId, size: p.size, scale: p.scale, flip: p.flip })), [inRange]);

  const cardW = width - 32;
  const innerW = cardW - 32;
  const islandW = Math.min(width - 24, 440);
  const next = () => changePeriod(period, shiftAnchor(period, anchor, 1));
  const prev = () => changePeriod(period, shiftAnchor(period, anchor, -1));
  const atEnd = isCurrentOrFuture(period, anchor, new Date());
  const bottomPad = TAB_BAR_HEIGHT + Math.max(insets.bottom, TAB_BAR_MARGIN) + 24;


  return (
    <View style={[styles.root, { backgroundColor: FOREST }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: bottomPad }}>
        <View style={styles.titleRow}>
          <AppText variant="headingLarge" style={{ color: '#fff', flex: 1 }}>
            Garden overview
          </AppText>
          <Pressable onPress={onOpenScene} accessibilityRole="button" accessibilityLabel="Open the garden scene" style={styles.sceneBtn}>
            <Icon name="trees" size={16} color="#BFE8D6" />
            <AppText variant="caption" style={{ color: '#BFE8D6' }}>
              Garden scene
            </AppText>
          </Pressable>
        </View>

        <View style={styles.periodRow}>
          {PERIODS.map((p) => (
            <Pressable key={p.id} onPress={() => changePeriod(p.id, anchor)} accessibilityRole="button" accessibilityState={{ selected: period === p.id }} style={[styles.pill, period === p.id && styles.pillOn]}>
              <AppText variant="caption" style={{ color: period === p.id ? FOREST : '#CFE9DD', fontWeight: '700' }}>
                {p.label}
              </AppText>
            </Pressable>
          ))}
        </View>

        <View style={styles.dateRow}>
          <Pressable onPress={prev} hitSlop={12} accessibilityRole="button" accessibilityLabel="Previous" style={styles.arrow}>
            <Icon name="chevronLeft" size={22} color="#fff" />
          </Pressable>
          <AppText variant="bodyStrong" style={{ color: '#fff', minWidth: 190, textAlign: 'center' }}>
            {label}
          </AppText>
          <Pressable onPress={next} disabled={atEnd} hitSlop={12} accessibilityRole="button" accessibilityLabel="Next" style={[styles.arrow, atEnd && { opacity: 0.3 }]}>
            <Icon name="chevronRight" size={22} color="#fff" />
          </Pressable>
        </View>

        <Animated.View style={{ alignItems: 'center', opacity: Animated.multiply(enter, swap), transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }, { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }] }}>
          <Pressable onPress={() => setRecord(true)} accessibilityRole="button" accessibilityLabel="Open the planting record" accessibilityHint="Shows every session and the plant it earned">
            <GardenIsland width={islandW} plants={islandPlants} />
          </Pressable>
        </Animated.View>
        {loaded && inRange.length === 0 && (
          <AppText variant="bodySmall" style={{ color: '#CFE9DD', textAlign: 'center', marginTop: -8 }}>
            No plants earned in this period yet. Each completed session grows one.
          </AppText>
        )}

        <View style={styles.counters}>
          <View style={styles.counter}>
            <AppText variant="heading" style={{ color: '#fff' }}>
              {plantsOnly}
            </AppText>
            <AppText variant="caption" style={{ color: '#BFE8D6' }}>
              plants
            </AppText>
          </View>
          <View style={styles.counter}>
            <AppText variant="heading" style={{ color: '#fff' }}>
              {trees}
            </AppText>
            <AppText variant="caption" style={{ color: '#BFE8D6' }}>
              trees
            </AppText>
          </View>
        </View>
        <AppText variant="caption" style={{ color: '#8FC4AE', textAlign: 'center', marginBottom: 14 }}>
          All time: {allPlants.length - allTrees} plants · {allTrees} trees · tap the garden for the planting record
        </AppText>

        <Pressable onPress={() => navigation.navigate('Tabs', { screen: 'Progress' })} accessibilityRole="button" accessibilityLabel="See your focus statistics in Progress" style={styles.statsLink}>
          <Icon name="chart" size={18} color="#BFE8D6" />
          <AppText variant="bodySmall" style={{ color: '#BFE8D6', flex: 1 }}>
            Your focus statistics are in the Progress tab
          </AppText>
          <Icon name="chevronRight" size={18} color="#BFE8D6" />
        </Pressable>
      </ScrollView>

      <PlantingRecordSheet visible={record} onClose={() => setRecord(false)} history={history} plants={allPlants} range={range} periodLabel={label} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12, gap: 8 },
  sceneBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: FOREST_2, borderWidth: 1, borderColor: 'rgba(191,232,214,0.25)' },
  periodRow: { flexDirection: 'row', alignSelf: 'center', backgroundColor: FOREST_2, borderRadius: 999, padding: 4, gap: 2 },
  pill: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 999 },
  pillOn: { backgroundColor: '#BFE8D6' },
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10 },
  arrow: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18 },
  counters: { flexDirection: 'row', justifyContent: 'center', gap: 36, marginTop: 4, marginBottom: 6 },
  counter: { alignItems: 'center' },
  statsLink: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 20, marginTop: 6, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 16, backgroundColor: FOREST_2, borderWidth: 1, borderColor: 'rgba(191,232,214,0.2)' },
});
