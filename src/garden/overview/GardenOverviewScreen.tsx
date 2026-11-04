// The Garden tab's overview: a miniature island that grows with every
// completed focus session, the focused-time distribution under it, detailed
// analytics below that, and (tap the island) the chronological Planting Record.
//
// Data: the saved session history (src/storage/history) and the saved plants
// (src/paradise). This screen only reads them. The painted garden scene is
// still one tap away ("Open the garden scene").
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../../ui/AppText';
import { Icon } from '../../ui/Icon';
import { TAB_BAR_HEIGHT, TAB_BAR_MARGIN } from '../../ui/TabBar';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { loadHistory } from '../../storage/history';
import { SPECIES_BY_ID } from '../../paradise/catalog';
import { useParadise } from '../../paradise/repository';
import type { SessionRecord } from '../../types';
import { BarChart, GREEN_DARK, HBars, LineChart } from './charts';
import { GardenIsland, IslandPlant } from './GardenIsland';
import { PlantingRecordSheet } from './PlantingRecordSheet';
import {
  Period, WEEKDAYS, WEEKDAYS_LONG, MONTHS_LONG, completedSessions, delta, distribution, extras, formatMinutes, hourTotals, isCurrentOrFuture, keyToDate, pad2, peak, periodLabel, rangeOf, shiftAnchor, trend, weekdayTotals,
} from './stats';

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

  const now = useMemo(() => new Date(), [history]);
  const sessions = useMemo(() => completedSessions(history), [history]);
  const range = useMemo(() => rangeOf(period, anchor), [period, anchor]);
  const label = periodLabel(period, anchor);
  const dist = useMemo(() => distribution(sessions, period, anchor), [sessions, period, anchor]);
  const weekday = useMemo(() => weekdayTotals(sessions), [sessions]);
  const hours = useMemo(() => hourTotals(sessions), [sessions]);
  const wPeak = peak(weekday);
  const hPeak = peak(hours);
  const tr = useMemo(() => trend(sessions, now), [sessions, now]);
  const ex = useMemo(() => extras(sessions, now, anchor.getFullYear()), [sessions, now, anchor]);

  // the plants this period's sessions earned, and the totals
  const allPlants = paradise?.plants ?? [];
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

  const tCur = tr.rows[0]!.minutes;
  const gh = detailBest(ex.bestDay, ex.leastDay);

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

        <View style={[styles.sheetTop, { backgroundColor: '#EAF3EE' }]}>
          <Card>
            <AppText variant="heading" style={{ color: INK }}>
              Focused Time Distribution
            </AppText>
            <AppText variant="caption" style={{ color: '#5A6B63' }}>
              {label}
            </AppText>
            <AppText variant="display" style={{ color: GREEN_DARK, marginVertical: 6 }}>
              {formatMinutes(dist.total)}
            </AppText>
            <BarChart buckets={dist.buckets} width={innerW} motion={!reduced} />
            {dist.total === 0 && (
              <AppText variant="caption" style={{ color: '#5A6B63', textAlign: 'center' }}>
                No focus time in this period.
              </AppText>
            )}
          </Card>

          <Card>
            <AppText variant="heading" style={{ color: INK }}>
              Most Focused Day of the Week
            </AppText>
            <AppText variant="bodySmall" style={{ color: '#2B3B35', marginVertical: 4 }}>
              {wPeak >= 0 ? `Most focused on ${WEEKDAYS_LONG[wPeak]} every week in general.` : 'Complete a session to see your best weekday.'}
            </AppText>
            <LineChart values={weekday} labels={WEEKDAYS} peak={wPeak} width={innerW} />
            <View style={styles.weekRow}>
              {weekday.map((m, i) => (
                <View key={i} style={{ alignItems: 'center', flex: 1 }}>
                  <AppText variant="caption" style={{ color: i === wPeak ? GREEN_DARK : '#5A6B63', fontWeight: i === wPeak ? '700' : '400', fontSize: 10 }}>
                    {m ? formatMinutes(m).replace(' min', 'm').replace(' h ', 'h ') : '–'}
                  </AppText>
                </View>
              ))}
            </View>
          </Card>

          <Card>
            <AppText variant="heading" style={{ color: INK }}>
              Most Focused Period of the Day
            </AppText>
            <AppText variant="bodySmall" style={{ color: '#2B3B35', marginVertical: 4 }}>
              {hPeak >= 0 ? `Most focused at ${pad2(hPeak)}:00 every day in general.` : 'Complete a session to see your best hour.'}
            </AppText>
            <LineChart values={hours} labels={hours.map((_, i) => pad2(i))} peak={hPeak} width={innerW} every={3} />
          </Card>

          <Card>
            <AppText variant="heading" style={{ color: INK }}>
              Focus Trend
            </AppText>
            <AppText variant="caption" style={{ color: '#5A6B63', marginBottom: 8 }}>
              1 Jan to {tr.through}, compared with the same days in earlier years
            </AppText>
            <HBars rows={tr.rows.map((r) => ({ label: String(r.year), minutes: r.minutes }))} width={innerW} />
            <View style={{ gap: 4, marginTop: 10 }}>
              {tr.rows.slice(1).map((r) => {
                const d = delta(tCur, r.minutes);
                return (
                  <AppText key={r.year} variant="caption" style={{ color: '#2B3B35' }}>
                    vs {r.year}: {d.minutes >= 0 ? '+' : '−'}
                    {formatMinutes(Math.abs(d.minutes))}
                    {d.percent === null ? ' (no focus then)' : ` (${d.percent >= 0 ? '+' : '−'}${Math.abs(d.percent)}%)`}
                  </AppText>
                );
              })}
            </View>
          </Card>

          <Card>
            <AppText variant="heading" style={{ color: INK }}>
              More about your focus
            </AppText>
            <View style={styles.grid}>
              <Stat label="Completed sessions" value={String(ex.sessions)} />
              <Stat label="Total focused" value={formatMinutes(ex.totalMinutes)} />
              <Stat label="Current streak" value={`${ex.currentStreak} day${ex.currentStreak === 1 ? '' : 's'}`} />
              <Stat label="Longest streak" value={`${ex.longestStreak} day${ex.longestStreak === 1 ? '' : 's'}`} />
              <Stat label="Average per active day" value={formatMinutes(ex.avgPerActiveDay)} />
              <Stat label="Average session" value={formatMinutes(ex.avgSession)} />
              <Stat label="Longest session" value={formatMinutes(ex.longest)} />
              <Stat label="Active days" value={String(ex.activeDays)} />
              <Stat label="Best day" value={gh.best} />
              <Stat label="Quietest day" value={gh.least} />
            </View>
            <AppText variant="bodyStrong" style={{ color: INK, marginTop: 14, marginBottom: 4 }}>
              {anchor.getFullYear()} by month
            </AppText>
            <HBars rows={ex.monthTotals.map((m, i) => ({ label: MONTHS_LONG[i]!, minutes: m })).filter((r) => r.minutes > 0)} width={innerW} />
            {ex.monthTotals.every((m) => m === 0) && (
              <AppText variant="caption" style={{ color: '#5A6B63' }}>
                No focus recorded in {anchor.getFullYear()}.
              </AppText>
            )}
            <AppText variant="caption" style={{ color: '#7A8A83', marginTop: 12 }}>
              Focus by task is not shown: sessions do not record a task yet.
            </AppText>
          </Card>
        </View>
      </ScrollView>

      <PlantingRecordSheet visible={record} onClose={() => setRecord(false)} history={history} plants={allPlants} range={range} periodLabel={label} />
    </View>
  );
}

function detailBest(best: { key: number; minutes: number } | null, least: { key: number; minutes: number } | null) {
  const f = (d: { key: number; minutes: number } | null) => {
    if (!d) return '–';
    const dt = keyToDate(d.key);
    return `${dt.getDate()} ${MONTHS_LONG[dt.getMonth()]!.slice(0, 3)} · ${formatMinutes(d.minutes)}`;
  };
  return { best: f(best), least: f(least) };
}

function Card({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <AppText variant="caption" style={{ color: '#5A6B63' }}>
        {label}
      </AppText>
      <AppText variant="bodyStrong" style={{ color: INK }}>
        {value}
      </AppText>
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
  sheetTop: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 16, paddingHorizontal: 16, paddingBottom: 8, gap: 14, minHeight: 400 },
  card: { backgroundColor: CARD, borderRadius: 22, padding: 16, shadowColor: '#06261b', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  weekRow: { flexDirection: 'row', marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  stat: { width: '50%', paddingVertical: 6, paddingRight: 8 },
});
