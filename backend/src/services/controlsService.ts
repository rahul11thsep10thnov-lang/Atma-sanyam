// Parental controls as the server enforces them: can this child start (or
// continue) playing right now, and for how long? The answer is computed
// here from the child's controls and today's credited minutes; the app only
// displays it.
import { and, eq, gte } from 'drizzle-orm';
import type { Db } from '../database/client.js';
import { parentalControls, screenTimeRecords, type PlayWindow } from '../database/schema.js';

export type Controls = typeof parentalControls.$inferSelect;

export const DEFAULT_CONTROLS: Omit<Controls, 'childId' | 'updatedAt'> = {
  dailyLimitMinutes: 60,
  sessionLimitMinutes: 20,
  playWindows: [],
  bedtimeStart: null,
  bedtimeEnd: null,
  timezone: 'Asia/Kolkata',
  blockedCategories: [],
  blockedGames: [],
  allowedBrackets: [],
  soundEnabled: true,
  narrationEnabled: true,
  favouritesEnabled: true,
  mirroringEnabled: true,
  newDeviceApproval: false,
  curriculumFramework: null,
  curriculumBoard: null,
  schoolGrade: null,
  learningGoals: [],
  blockedSubjects: [],
  rankingsEnabled: true,
  rewardShopEnabled: true,
  coinDailyCap: null,
  reducedMotion: false,
};

export async function getControls(db: Db, childId: string): Promise<Controls> {
  const [row] = await db.select().from(parentalControls).where(eq(parentalControls.childId, childId));
  if (row) return row;
  const [created] = await db.insert(parentalControls).values({ childId }).onConflictDoNothing().returning();
  return created ?? { childId, updatedAt: new Date(), ...DEFAULT_CONTROLS };
}

/** Local wall-clock parts for a timezone, without any library. */
export function localParts(now: Date, timezone: string): { day: string; minutes: number; weekday: number } {
  let fmt: Intl.DateTimeFormat;
  try {
    fmt = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', weekday: 'short' });
  } catch {
    fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', weekday: 'short' });
  }
  const parts = Object.fromEntries(fmt.formatToParts(now).map((p) => [p.type, p.value]));
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return {
    day: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
    weekday: weekdays.indexOf(String(parts.weekday).slice(0, 3)),
  };
}

const hm = (s: string) => {
  const [h, m] = s.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

/** True when `minutes` (0–1439) falls inside a window that may cross midnight. */
export function inWindow(minutes: number, start: string, end: string): boolean {
  const s = hm(start);
  const e = hm(end);
  if (s === e) return true;
  return s < e ? minutes >= s && minutes < e : minutes >= s || minutes < e;
}

export type PlayDecision =
  | { allowed: true; remainingTodaySeconds: number; sessionLimitSeconds: number; day: string }
  | { allowed: false; reason: 'bedtime' | 'outside_play_window' | 'daily_limit' | 'paused'; message: string; day: string; retryAt?: string };

export async function todaysMinutes(db: Db, childId: string, day: string): Promise<number> {
  const [row] = await db
    .select({ minutes: screenTimeRecords.minutes })
    .from(screenTimeRecords)
    .where(and(eq(screenTimeRecords.childId, childId), eq(screenTimeRecords.day, day)));
  return row?.minutes ?? 0;
}

export function decidePlay(controls: Controls, usedMinutesToday: number, now = new Date()): PlayDecision {
  const local = localParts(now, controls.timezone);
  if (controls.bedtimeStart && controls.bedtimeEnd && inWindow(local.minutes, controls.bedtimeStart, controls.bedtimeEnd)) {
    return { allowed: false, reason: 'bedtime', message: 'It is bedtime now. LoJi will be back in the morning!', day: local.day };
  }
  const windows = (controls.playWindows ?? []) as PlayWindow[];
  if (windows.length > 0) {
    const open = windows.some((w) => w.days.includes(local.weekday) && inWindow(local.minutes, w.start, w.end));
    if (!open) return { allowed: false, reason: 'outside_play_window', message: 'Playtime is closed right now. Check with your grown-up for when it opens.', day: local.day };
  }
  const remaining = Math.max(0, controls.dailyLimitMinutes - usedMinutesToday);
  if (remaining <= 0) {
    return { allowed: false, reason: 'daily_limit', message: "You have used today's playtime. See you tomorrow!", day: local.day };
  }
  return {
    allowed: true,
    remainingTodaySeconds: remaining * 60,
    sessionLimitSeconds: Math.min(controls.sessionLimitMinutes, remaining) * 60,
    day: local.day,
  };
}

export function publicControls(c: Controls) {
  return {
    dailyLimitMinutes: c.dailyLimitMinutes,
    sessionLimitMinutes: c.sessionLimitMinutes,
    playWindows: c.playWindows,
    bedtimeStart: c.bedtimeStart,
    bedtimeEnd: c.bedtimeEnd,
    timezone: c.timezone,
    blockedCategories: c.blockedCategories,
    blockedGames: c.blockedGames,
    allowedBrackets: c.allowedBrackets,
    soundEnabled: c.soundEnabled,
    narrationEnabled: c.narrationEnabled,
    favouritesEnabled: c.favouritesEnabled,
    mirroringEnabled: c.mirroringEnabled,
    newDeviceApproval: c.newDeviceApproval,
    curriculumFramework: c.curriculumFramework,
    curriculumBoard: c.curriculumBoard,
    schoolGrade: c.schoolGrade,
    learningGoals: c.learningGoals,
    blockedSubjects: c.blockedSubjects,
    rankingsEnabled: c.rankingsEnabled,
    rewardShopEnabled: c.rewardShopEnabled,
    coinDailyCap: c.coinDailyCap,
    reducedMotion: c.reducedMotion,
    updatedAt: c.updatedAt.toISOString(),
  };
}

/** Credits whole minutes of play to a child's day (idempotent per call amount). */
export async function creditScreenTime(db: Db, childId: string, day: string, minutes: number, newSession = false) {
  if (minutes <= 0 && !newSession) return;
  await db
    .insert(screenTimeRecords)
    .values({ childId, day, minutes, sessions: newSession ? 1 : 0 })
    .onConflictDoUpdate({
      target: [screenTimeRecords.childId, screenTimeRecords.day],
      set: {
        minutes: sqlAdd(screenTimeRecords.minutes, minutes),
        sessions: sqlAdd(screenTimeRecords.sessions, newSession ? 1 : 0),
        updatedAt: new Date(),
      },
    });
}

import { sql } from 'drizzle-orm';
function sqlAdd(column: unknown, n: number) {
  return sql`${column as never} + ${n}`;
}

export async function screenTimeSince(db: Db, childId: string, fromDay: string) {
  return db
    .select({ day: screenTimeRecords.day, minutes: screenTimeRecords.minutes, sessions: screenTimeRecords.sessions })
    .from(screenTimeRecords)
    .where(and(eq(screenTimeRecords.childId, childId), gte(screenTimeRecords.day, fromDay)))
    .orderBy(screenTimeRecords.day);
}
