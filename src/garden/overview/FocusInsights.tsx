// Focus statistics for the Progress tab: the focused-time distribution for a
// chosen Day / Week / Month / Year, the most focused weekday and hour of the
// day, and more about your focus (streaks, averages, monthly totals). Reads
// the saved session history only.
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { AppText } from '../../ui/AppText';
import { Icon } from '../../ui/Icon';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useTheme } from '../../theme/ThemeContext';
import { space } from '../../theme/spacing';
import type { SessionRecord } from '../../types';
import { BarChart, GREEN_DARK, HBars, LineChart } from './charts';
import {
  Period, WEEKDAYS, WEEKDAYS_LONG, MONTHS_LONG, completedSessions, distribution, extras, formatMinutes, hourTotals, isCurrentOrFuture, keyToDate, pad2, peak, periodLabel, shiftAnchor, weekdayTotals,
} from './stats';

const INK = '#173A2E';
const CARD = '#FBFDFB';
const PERIODS: { id: Period; label: string }[] = [
  { id: 'day', label: 'Day' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'year', label: 'Year' },
];

export function FocusInsights({ history }: { history: SessionRecord[] }) {
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const [period, setPeriod] = useState<Period>('month');
  const [anchor, setAnchor] = useState(() => new Date());

  const now = useMemo(() => new Date(), [history]);
  const sessions = useMemo(() => completedSessions(history), [history]);
  const label = periodLabel(period, anchor);
  const dist = useMemo(() => distribution(sessions, period, anchor), [sessions, period, anchor]);
  const weekday = useMemo(() => weekdayTotals(sessions), [sessions]);
  const hours = useMemo(() => hourTotals(sessions), [sessions]);
  const wPeak = peak(weekday);
  const hPeak = peak(hours);
  const ex = useMemo(() => extras(sessions, now, anchor.getFullYear()), [sessions, now, anchor]);
  const atEnd = isCurrentOrFuture(period, anchor, new Date());
  const move = useCallback((dir: -1 | 1) => setAnchor((a) => shiftAnchor(period, a, dir)), [period]);

  // the Progress list pads the screen by 20 on each side; cards add 16 inside
  const innerW = width - 40 - 32;
  const best = ex.bestDay ? `${keyToDate(ex.bestDay.key).getDate()} ${MONTHS_LONG[keyToDate(ex.bestDay.key).getMonth()]!.slice(0, 3)} · ${formatMinutes(ex.bestDay.minutes)}` : '–';
  const least = ex.leastDay ? `${keyToDate(ex.leastDay.key).getDate()} ${MONTHS_LONG[keyToDate(ex.leastDay.key).getMonth()]!.slice(0, 3)} · ${formatMinutes(ex.leastDay.minutes)}` : '–';

  return (
    <View style={{ gap: space.md, marginTop: space.xl }}>
      <View style={[styles.periodRow, { backgroundColor: colors.surfaceMuted }]}>
        {PERIODS.map((p) => (
          <Pressable key={p.id} onPress={() => { setPeriod(p.id); setAnchor(new Date()); }} accessibilityRole="button" accessibilityState={{ selected: period === p.id }} style={[styles.pill, period === p.id && { backgroundColor: colors.primary }]}>
            <AppText variant="caption" style={{ color: period === p.id ? '#fff' : colors.text, fontWeight: '700' }}>
              {p.label}
            </AppText>
          </Pressable>
        ))}
      </View>
      <View style={styles.dateRow}>
        <Pressable onPress={() => move(-1)} hitSlop={12} accessibilityRole="button" accessibilityLabel="Previous" style={styles.arrow}>
          <Icon name="chevronLeft" size={22} color={colors.text} />
        </Pressable>
        <AppText variant="bodyStrong" style={{ minWidth: 190, textAlign: 'center' }}>
          {label}
        </AppText>
        <Pressable onPress={() => move(1)} disabled={atEnd} hitSlop={12} accessibilityRole="button" accessibilityLabel="Next" style={[styles.arrow, atEnd && { opacity: 0.3 }]}>
          <Icon name="chevronRight" size={22} color={colors.text} />
        </Pressable>
      </View>

      <Card>
        <AppText variant="heading" style={{ color: INK }}>Focused Time Distribution</AppText>
        <AppText variant="caption" style={{ color: '#5A6B63' }}>{label}</AppText>
        <AppText variant="display" style={{ color: GREEN_DARK, marginVertical: 6 }}>{formatMinutes(dist.total)}</AppText>
        <BarChart buckets={dist.buckets} width={innerW} motion={!reduced} />
        {dist.total === 0 && (
          <AppText variant="caption" style={{ color: '#5A6B63', textAlign: 'center' }}>No focus time in this period.</AppText>
        )}
      </Card>

      <Card>
        <AppText variant="heading" style={{ color: INK }}>Most Focused Day of the Week</AppText>
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
        <AppText variant="heading" style={{ color: INK }}>Most Focused Period of the Day</AppText>
        <AppText variant="bodySmall" style={{ color: '#2B3B35', marginVertical: 4 }}>
          {hPeak >= 0 ? `Most focused at ${pad2(hPeak)}:00 every day in general.` : 'Complete a session to see your best hour.'}
        </AppText>
        <LineChart values={hours} labels={hours.map((_, i) => pad2(i))} peak={hPeak} width={innerW} every={3} />
      </Card>

      <Card>
        <AppText variant="heading" style={{ color: INK }}>More about your focus</AppText>
        <View style={styles.grid}>
          <Stat label="Completed sessions" value={String(ex.sessions)} />
          <Stat label="Total focused" value={formatMinutes(ex.totalMinutes)} />
          <Stat label="Current streak" value={`${ex.currentStreak} day${ex.currentStreak === 1 ? '' : 's'}`} />
          <Stat label="Longest streak" value={`${ex.longestStreak} day${ex.longestStreak === 1 ? '' : 's'}`} />
          <Stat label="Average per active day" value={formatMinutes(ex.avgPerActiveDay)} />
          <Stat label="Average session" value={formatMinutes(ex.avgSession)} />
          <Stat label="Longest session" value={formatMinutes(ex.longest)} />
          <Stat label="Active days" value={String(ex.activeDays)} />
          <Stat label="Best day" value={best} />
          <Stat label="Quietest day" value={least} />
        </View>
        <AppText variant="bodyStrong" style={{ color: INK, marginTop: 14, marginBottom: 4 }}>{anchor.getFullYear()} by month</AppText>
        <HBars rows={ex.monthTotals.map((m, i) => ({ label: MONTHS_LONG[i]!, minutes: m })).filter((r) => r.minutes > 0)} width={innerW} />
        {ex.monthTotals.every((m) => m === 0) && (
          <AppText variant="caption" style={{ color: '#5A6B63' }}>No focus recorded in {anchor.getFullYear()}.</AppText>
        )}
        <AppText variant="caption" style={{ color: '#7A8A83', marginTop: 12 }}>Focus by task is not shown: sessions do not record a task yet.</AppText>
      </Card>
    </View>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <AppText variant="caption" style={{ color: '#5A6B63' }}>{label}</AppText>
      <AppText variant="bodyStrong" style={{ color: INK }}>{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  periodRow: { flexDirection: 'row', alignSelf: 'center', borderRadius: 999, padding: 4, gap: 2 },
  pill: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 999 },
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  arrow: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18 },
  card: { backgroundColor: CARD, borderRadius: 22, padding: 16, shadowColor: '#06261b', shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(20,60,45,0.12)' },
  weekRow: { flexDirection: 'row', marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  stat: { width: '50%', paddingVertical: 6, paddingRight: 8 },
});
