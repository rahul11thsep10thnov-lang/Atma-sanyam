/// <reference types="node" />
// Run with: npm run test:garden
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { SessionRecord } from '../../../types';
import { buckets, completedSessions, distribution, extras, hourTotals, peak, rangeOf, shiftAnchor, startOfWeek, weekdayTotals } from '../stats';
import { arrange, pathDistance } from '../layout';

let n = 0;
const rec = (y: number, m: number, d: number, h: number, min: number, minutes: number, outcome: 'completed' | 'failed' = 'completed'): SessionRecord => {
  const startedAt = new Date(y, m, d, h, min).getTime();
  return { id: `s${n++}`, startedAt, endedAt: startedAt + minutes * 60000, durationMinutes: minutes, grid: { rows: 1, cols: 1 }, image: { kind: 'plant', speciesId: 'rose' } as never, outcome, failureReason: outcome === 'failed' ? 'gave_up' : null, revealedFraction: 1 };
};

test('only completed sessions count as focus', () => {
  const s = completedSessions([rec(2026, 5, 1, 9, 0, 30), rec(2026, 5, 1, 10, 0, 40, 'failed')]);
  assert.equal(s.length, 1);
  assert.equal(s[0]!.minutes, 30);
});

test('ranges: week is Monday to Sunday, month and year are whole', () => {
  const wed = new Date(2026, 10, 4); // Wed 4 Nov 2026
  assert.equal(startOfWeek(wed).getDay(), 1);
  assert.equal(new Date(rangeOf('week', wed).start).getDate(), 2);
  assert.equal(new Date(rangeOf('week', wed).end).getDate(), 9);
  assert.equal(new Date(rangeOf('month', wed).end).getMonth(), 11);
  assert.equal(new Date(rangeOf('year', wed).end).getFullYear(), 2027);
});

test('previous / next across month, year and week boundaries', () => {
  assert.equal(shiftAnchor('month', new Date(2026, 0, 15), -1).getFullYear(), 2025);
  assert.equal(shiftAnchor('month', new Date(2026, 0, 15), -1).getMonth(), 11);
  assert.equal(shiftAnchor('month', new Date(2026, 11, 3), 1).getFullYear(), 2027);
  assert.equal(shiftAnchor('day', new Date(2026, 2, 1), -1).getDate(), 28);
  assert.equal(shiftAnchor('day', new Date(2024, 2, 1), -1).getDate(), 29); // leap year
  const w = shiftAnchor('week', new Date(2026, 0, 1), -1); // week of 1 Jan 2026 (Thu) -> week of 25 Dec 2025
  assert.equal(startOfWeek(w).getFullYear(), 2025);
  assert.equal(shiftAnchor('year', new Date(2026, 5, 1), -1).getFullYear(), 2025);
});

test('bucket counts: 24 hours, 7 days, days of the month, 12 months', () => {
  assert.equal(buckets('day', new Date(2026, 5, 3)).length, 24);
  assert.equal(buckets('week', new Date(2026, 5, 3)).length, 7);
  assert.equal(buckets('month', new Date(2026, 1, 3)).length, 28);
  assert.equal(buckets('month', new Date(2024, 1, 3)).length, 29);
  assert.equal(buckets('month', new Date(2026, 0, 3)).length, 31);
  assert.equal(buckets('year', new Date(2026, 5, 3)).length, 12);
});

test('distribution: a session spanning an hour boundary is split, totals add up, other days excluded', () => {
  const s = completedSessions([rec(2026, 5, 3, 9, 30, 60), rec(2026, 5, 4, 9, 0, 45)]);
  const d = distribution(s, 'day', new Date(2026, 5, 3));
  assert.equal(d.buckets[9]!.minutes, 30);
  assert.equal(d.buckets[10]!.minutes, 30);
  assert.equal(d.total, 60);
  const w = distribution(s, 'week', new Date(2026, 5, 3));
  assert.equal(w.total, 105);
  const empty = distribution(s, 'day', new Date(2026, 5, 20));
  assert.equal(empty.total, 0);
});

test('a session that crosses midnight is split between the two days and the year bucket is right', () => {
  const s = completedSessions([rec(2026, 11, 31, 23, 30, 60)]);
  assert.equal(distribution(s, 'day', new Date(2026, 11, 31)).total, 30);
  assert.equal(distribution(s, 'day', new Date(2027, 0, 1)).total, 30);
  assert.equal(distribution(s, 'year', new Date(2026, 3, 1)).total, 30);
});

test('weekday and hour habits find the peak', () => {
  // 2026-11-04 is a Wednesday
  const s = completedSessions([rec(2026, 10, 4, 9, 0, 60), rec(2026, 10, 11, 9, 0, 60), rec(2026, 10, 5, 20, 0, 30)]);
  const w = weekdayTotals(s);
  assert.equal(peak(w), 2);
  assert.equal(w[2], 120);
  const h = hourTotals(s);
  assert.equal(peak(h), 9);
  assert.equal(peak(new Array(24).fill(0)), -1);
});

test('extras: streaks, averages, longest, best and least day', () => {
  const now = new Date(2026, 5, 10, 18);
  const s = completedSessions([rec(2026, 5, 8, 9, 0, 30), rec(2026, 5, 9, 9, 0, 60), rec(2026, 5, 10, 9, 0, 45), rec(2026, 5, 10, 14, 0, 15), rec(2026, 5, 1, 9, 0, 120), rec(2026, 5, 2, 9, 0, 10)]);
  const e = extras(s, now);
  assert.equal(e.sessions, 6);
  assert.equal(e.totalMinutes, 280);
  assert.equal(e.currentStreak, 3);
  assert.equal(e.longestStreak, 3);
  assert.equal(e.longest, 120);
  assert.equal(e.avgSession, 47);
  assert.equal(e.activeDays, 5);
  assert.equal(e.bestDay!.minutes, 120);
  assert.equal(e.leastDay!.minutes, 10);
  assert.equal(e.monthTotals[5], 280);
  // no session today: yesterday still keeps the streak alive; two days ago does not
  assert.equal(extras(s, new Date(2026, 5, 11, 8)).currentStreak, 3);
  assert.equal(extras(s, new Date(2026, 5, 12, 8)).currentStreak, 0);
});

test('empty history gives zeros, never invented values', () => {
  const e = extras([], new Date(2026, 5, 1));
  assert.equal(e.sessions, 0);
  assert.equal(e.bestDay, null);
  assert.equal(distribution([], 'year', new Date(2026, 5, 1)).total, 0);
});

test('island layout: stable, inside the square, off the path, little overlap', () => {
  const items = Array.from({ length: 60 }, (_, i) => ({ id: `plant-${i}`, radius: i % 7 === 0 ? 1.6 : 1 }));
  const a = arrange(items);
  const b = arrange(items);
  assert.deepEqual(a, b);
  for (const p of a) {
    assert.ok(p.u >= 0.05 && p.u <= 0.95 && p.v >= 0.05 && p.v <= 0.95);
    assert.ok(pathDistance(p.u, p.v) >= 0.04, 'not on the path');
  }
  let close = 0;
  for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) if (Math.hypot(a[i]!.u - a[j]!.u, a[i]!.v - a[j]!.v) < 0.03) close++;
  assert.ok(close <= 3, `${close} near-overlaps`);
  // a plant keeps its place when the garden grows
  const few = items.slice(0, 30);
  const grown = arrange([...few, { id: 'new', radius: 1 }]);
  assert.deepEqual(grown.slice(0, 30), arrange(few));
});
