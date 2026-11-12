// Focus analytics for the Garden overview. Pure functions over the saved
// session history (src/storage/history.ts): nothing here reads or writes storage.
//
// What a session record holds (src/types SessionRecord): startedAt, endedAt,
// durationMinutes (the minutes the person planned, which a completed session
// fully focused), outcome. The app has no pause: leaving the app or giving up
// ends the session as 'failed'. So a completed session's focused time is its
// durationMinutes, and there is no separate paused time to subtract.
import type { SessionRecord } from '../../types';

export type Period = 'day' | 'week' | 'month' | 'year';
const MIN = 60_000;
const DAY = 86_400_000;

export interface FocusSession {
  id: string;
  start: number;
  /** Start plus the focused minutes (the focused interval). */
  focusEnd: number;
  end: number;
  minutes: number;
  record: SessionRecord;
}

/** Completed sessions, newest first. Failed or abandoned ones never count as focus. */
export function completedSessions(history: SessionRecord[]): FocusSession[] {
  const out: FocusSession[] = [];
  for (const r of history) {
    if (r.outcome !== 'completed' || !(r.durationMinutes > 0)) continue;
    out.push({ id: r.id, start: r.startedAt, focusEnd: r.startedAt + r.durationMinutes * MIN, end: r.endedAt, minutes: r.durationMinutes, record: r });
  }
  return out.sort((a, b) => b.start - a.start);
}

// ---- periods ---------------------------------------------------------------------------------------

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Weeks run Monday to Sunday. */
export function startOfWeek(d: Date): Date {
  const s = startOfDay(d);
  const back = (s.getDay() + 6) % 7;
  return new Date(s.getFullYear(), s.getMonth(), s.getDate() - back);
}

export interface Range {
  start: number;
  /** Exclusive. */
  end: number;
}

export function rangeOf(period: Period, anchor: Date): Range {
  if (period === 'day') {
    const s = startOfDay(anchor);
    return { start: s.getTime(), end: new Date(s.getFullYear(), s.getMonth(), s.getDate() + 1).getTime() };
  }
  if (period === 'week') {
    const s = startOfWeek(anchor);
    return { start: s.getTime(), end: new Date(s.getFullYear(), s.getMonth(), s.getDate() + 7).getTime() };
  }
  if (period === 'month') return { start: new Date(anchor.getFullYear(), anchor.getMonth(), 1).getTime(), end: new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1).getTime() };
  return { start: new Date(anchor.getFullYear(), 0, 1).getTime(), end: new Date(anchor.getFullYear() + 1, 0, 1).getTime() };
}

/** Previous (-1) or next (+1) period, correct across month, year and week boundaries. */
export function shiftAnchor(period: Period, anchor: Date, dir: -1 | 1): Date {
  const y = anchor.getFullYear();
  const m = anchor.getMonth();
  const d = anchor.getDate();
  if (period === 'day') return new Date(y, m, d + dir);
  if (period === 'week') return new Date(y, m, d + 7 * dir);
  if (period === 'month') return new Date(y, m + dir, 1);
  return new Date(y + dir, 0, 1);
}

export function isCurrentOrFuture(period: Period, anchor: Date, now: Date): boolean {
  return rangeOf(period, anchor).end > rangeOf(period, now).end - 1;
}

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const WEEKDAYS_LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function periodLabel(period: Period, anchor: Date): string {
  if (period === 'day') return `${WEEKDAYS[(anchor.getDay() + 6) % 7]}, ${anchor.getDate()} ${MONTHS[anchor.getMonth()]} ${anchor.getFullYear()}`;
  if (period === 'week') {
    const s = startOfWeek(anchor);
    const e = new Date(s.getFullYear(), s.getMonth(), s.getDate() + 6);
    return s.getMonth() === e.getMonth() ? `${s.getDate()}–${e.getDate()} ${MONTHS[e.getMonth()]} ${e.getFullYear()}` : `${s.getDate()} ${MONTHS[s.getMonth()]} – ${e.getDate()} ${MONTHS[e.getMonth()]} ${e.getFullYear()}`;
  }
  if (period === 'month') return `${MONTHS_LONG[anchor.getMonth()]} ${anchor.getFullYear()}`;
  return String(anchor.getFullYear());
}

// ---- focused time distribution -------------------------------------------------------------------

export interface Bucket {
  label: string;
  /** Longer text for the tooltip. */
  title: string;
  minutes: number;
  start: number;
  end: number;
}

export function buckets(period: Period, anchor: Date): Bucket[] {
  const r = rangeOf(period, anchor);
  const out: Bucket[] = [];
  if (period === 'day') {
    for (let h = 0; h < 24; h++) {
      const s = new Date(new Date(r.start).getFullYear(), new Date(r.start).getMonth(), new Date(r.start).getDate(), h).getTime();
      const e = new Date(new Date(r.start).getFullYear(), new Date(r.start).getMonth(), new Date(r.start).getDate(), h + 1).getTime();
      out.push({ label: String(h), title: `${String(h).padStart(2, '0')}:00–${String((h + 1) % 24).padStart(2, '0')}:00`, minutes: 0, start: s, end: e });
    }
  } else if (period === 'year') {
    for (let m = 0; m < 12; m++) out.push({ label: MONTHS[m]!, title: `${MONTHS_LONG[m]} ${anchor.getFullYear()}`, minutes: 0, start: new Date(anchor.getFullYear(), m, 1).getTime(), end: new Date(anchor.getFullYear(), m + 1, 1).getTime() });
  } else {
    const days = Math.round((r.end - r.start) / DAY);
    const first = new Date(r.start);
    for (let i = 0; i < days; i++) {
      const s = new Date(first.getFullYear(), first.getMonth(), first.getDate() + i);
      const e = new Date(first.getFullYear(), first.getMonth(), first.getDate() + i + 1);
      out.push({ label: period === 'week' ? WEEKDAYS[i]! : String(s.getDate()), title: `${WEEKDAYS[(s.getDay() + 6) % 7]}, ${s.getDate()} ${MONTHS[s.getMonth()]}`, minutes: 0, start: s.getTime(), end: e.getTime() });
    }
  }
  return out;
}

/** Minutes of the focused interval that fall inside [a, b). */
const overlapMinutes = (s: FocusSession, a: number, b: number) => Math.max(0, Math.min(s.focusEnd, b) - Math.max(s.start, a)) / MIN;

export function distribution(sessions: FocusSession[], period: Period, anchor: Date): { buckets: Bucket[]; total: number } {
  const bs = buckets(period, anchor);
  const r = rangeOf(period, anchor);
  for (const s of sessions) {
    if (s.focusEnd <= r.start || s.start >= r.end) continue;
    for (const b of bs) b.minutes += overlapMinutes(s, b.start, b.end);
  }
  for (const b of bs) b.minutes = Math.round(b.minutes * 10) / 10;
  return { buckets: bs, total: Math.round(bs.reduce((n, b) => n + b.minutes, 0)) };
}

// ---- habits ----------------------------------------------------------------------------------------

/** Minutes by weekday (Monday first) over all history, split across midnight correctly. */
export function weekdayTotals(sessions: FocusSession[]): number[] {
  const out = new Array<number>(7).fill(0);
  for (const s of sessions) {
    let t = s.start;
    while (t < s.focusEnd) {
      const d = new Date(t);
      const nextMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime();
      const to = Math.min(s.focusEnd, nextMidnight);
      out[(d.getDay() + 6) % 7]! += (to - t) / MIN;
      t = to;
    }
  }
  return out.map((m) => Math.round(m));
}

/** Minutes by hour of day (00–23) over all history, split across hours correctly. */
export function hourTotals(sessions: FocusSession[]): number[] {
  const out = new Array<number>(24).fill(0);
  for (const s of sessions) {
    let t = s.start;
    while (t < s.focusEnd) {
      const d = new Date(t);
      const nextHour = new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours() + 1).getTime();
      const to = Math.min(s.focusEnd, nextHour);
      out[d.getHours()]! += (to - t) / MIN;
      t = to;
    }
  }
  return out.map((m) => Math.round(m));
}

export function peak(values: number[]): number {
  let best = -1;
  let at = -1;
  values.forEach((v, i) => {
    if (v > best) {
      best = v;
      at = i;
    }
  });
  return best > 0 ? at : -1;
}

// ---- extras ----------------------------------------------------------------------------------------

const dayKey = (t: number) => {
  const d = new Date(t);
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
};

export interface Extras {
  sessions: number;
  totalMinutes: number;
  activeDays: number;
  avgPerActiveDay: number;
  avgSession: number;
  longest: number;
  currentStreak: number;
  longestStreak: number;
  bestDay: { key: number; minutes: number } | null;
  leastDay: { key: number; minutes: number } | null;
  monthTotals: number[];
}

export function extras(sessions: FocusSession[], now: Date, year = now.getFullYear()): Extras {
  const perDay = new Map<number, number>();
  const months = new Array<number>(12).fill(0);
  let total = 0;
  let longest = 0;
  for (const s of sessions) {
    total += s.minutes;
    longest = Math.max(longest, s.minutes);
    perDay.set(dayKey(s.start), (perDay.get(dayKey(s.start)) ?? 0) + s.minutes);
    const d = new Date(s.start);
    if (d.getFullYear() === year) months[d.getMonth()]! += s.minutes;
  }
  const keys = [...perDay.keys()].sort((a, b) => a - b);
  const dayNum = (k: number) => Math.round(new Date(Math.floor(k / 10000), Math.floor((k % 10000) / 100) - 1, k % 100, 12).getTime() / DAY);
  let longestStreak = 0;
  let run = 0;
  let prev = -10;
  for (const k of keys) {
    const n = dayNum(k);
    run = n === prev + 1 ? run + 1 : 1;
    prev = n;
    longestStreak = Math.max(longestStreak, run);
  }
  // current streak: consecutive days ending today (or yesterday, if today has no session yet)
  let current = 0;
  let cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!perDay.has(dayKey(cursor.getTime()))) cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - 1);
  while (perDay.has(dayKey(cursor.getTime()))) {
    current++;
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - 1);
  }
  let best: Extras['bestDay'] = null;
  let least: Extras['leastDay'] = null;
  for (const [key, minutes] of perDay) {
    if (!best || minutes > best.minutes) best = { key, minutes };
    if (!least || minutes < least.minutes) least = { key, minutes };
  }
  return {
    sessions: sessions.length,
    totalMinutes: total,
    activeDays: perDay.size,
    avgPerActiveDay: perDay.size ? Math.round(total / perDay.size) : 0,
    avgSession: sessions.length ? Math.round(total / sessions.length) : 0,
    longest,
    currentStreak: current,
    longestStreak,
    bestDay: best,
    leastDay: least,
    monthTotals: months,
  };
}

export function keyToDate(k: number): Date {
  return new Date(Math.floor(k / 10000), Math.floor((k % 10000) / 100) - 1, k % 100);
}

export function formatMinutes(m: number): string {
  const r = Math.round(m);
  if (r < 60) return `${r} min`;
  const h = Math.floor(r / 60);
  const mm = r % 60;
  return mm ? `${h} h ${mm} min` : `${h} h`;
}

export const pad2 = (n: number) => String(n).padStart(2, '0');
export const clock = (t: number) => {
  const d = new Date(t);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};
