// Screen-time decisions for the active child. Pure; the provider counts minutes.
export interface ScreenRules { dailyMinutes: number | 'none'; bedtime: string | null; breakEveryMinutes: number; wakeTime?: string | null }

export interface ScreenDecision {
  allow: boolean;
  windDown: boolean;
  timeUp: boolean;
  breakDue: boolean;
  bedtime: boolean;
  remainingMinutes: number | null;
  reason: 'ok' | 'limit' | 'bedtime' | 'break';
}

export const WIND_DOWN_MINUTES = 5;

function minutesOfDay(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const h = Number(m[1]), mi = Number(m[2]);
  if (h > 23 || mi > 59) return null;
  return h * 60 + mi;
}

/** Bedtime window: from bedtime until wakeTime (default 06:00), crossing midnight. */
export function isBedtime(rules: ScreenRules, now: number): boolean {
  if (!rules.bedtime) return false;
  const bed = minutesOfDay(rules.bedtime);
  const wake = minutesOfDay(rules.wakeTime ?? '06:00') ?? 360;
  if (bed === null) return false;
  const d = new Date(now);
  const cur = d.getHours() * 60 + d.getMinutes();
  return bed > wake ? cur >= bed || cur < wake : cur >= bed && cur < wake;
}

export function decide(rules: ScreenRules, usedTodayMinutes: number, minutesSinceBreak: number, now: number): ScreenDecision {
  const bedtime = isBedtime(rules, now);
  const limit = rules.dailyMinutes === 'none' ? null : rules.dailyMinutes;
  const remaining = limit === null ? null : Math.max(0, limit - usedTodayMinutes);
  const timeUp = remaining !== null && remaining <= 0;
  const windDown = remaining !== null && remaining > 0 && remaining <= WIND_DOWN_MINUTES;
  const breakDue = rules.breakEveryMinutes > 0 && minutesSinceBreak >= rules.breakEveryMinutes;
  return {
    allow: !timeUp && !bedtime,
    windDown, timeUp, breakDue, bedtime,
    remainingMinutes: remaining,
    reason: bedtime ? 'bedtime' : timeUp ? 'limit' : breakDue ? 'break' : 'ok',
  };
}

export const LIMIT_PRESETS: (number | 'none')[] = [15, 30, 45, 60, 'none'];
export const DEFAULT_RULES: Record<'A0' | 'A1' | 'A2' | 'A3' | 'A4' | 'A5', ScreenRules> = {
  A0: { dailyMinutes: 15, bedtime: '19:30', breakEveryMinutes: 10 },
  A1: { dailyMinutes: 20, bedtime: '20:00', breakEveryMinutes: 15 },
  A2: { dailyMinutes: 30, bedtime: '20:30', breakEveryMinutes: 20 },
  A3: { dailyMinutes: 45, bedtime: '21:00', breakEveryMinutes: 25 },
  A4: { dailyMinutes: 60, bedtime: '21:30', breakEveryMinutes: 30 },
  A5: { dailyMinutes: 60, bedtime: '22:00', breakEveryMinutes: 30 },
};

/** Weekly report numbers from the usage log. */
export function weeklyReport(days: Record<string, number>, now: number): { labels: string[]; minutes: number[]; total: number } {
  const labels: string[] = []; const minutes: number[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now - i * 86_400_000);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    labels.push(key); minutes.push(days[key] ?? 0);
  }
  return { labels, minutes, total: minutes.reduce((a, b) => a + b, 0) };
}
