import { test } from 'node:test';
import assert from 'node:assert/strict';
import { grant, purchaseDecoration, canAfford, decorationsAt, DECORATIONS, BADGES, certificateFor } from '../engines/rewards';
import { decide, isBedtime, weeklyReport, DEFAULT_RULES } from '../engines/screenTime';
import { mergeWorld, diffEvents } from '../engines/sync';
import { nextEcho, echoClausesOf, startEcho, echoRepeat, echoDone } from '../engines/echo';
import { startAssignment, completeAssignment, effectiveTier, assignmentsFor, statusOf } from '../engines/assignments';
import { sentencesOf, startReader, nextSentence, nextPage, paceMs, questionsFor } from '../engines/stories';
import { createWorldState } from '../core/worldState';
import { LESSON_BY_ID, LESSONS } from '../content/lessons';
import { ASSIGNMENT_BY_ID, ASSIGNMENTS } from '../content/assignments';
import { STORIES } from '../content/stories';

const t0 = Date.UTC(2026, 5, 15, 6, 30); // 12:00 IST
const DAY = 86_400_000;

test('rewards never go negative, badges are unique and from the catalogue', () => {
  let w = createWorldState(t0);
  w = grant(w, { stars: -5, coins: -3, badges: ['first_lesson', 'first_lesson', 'not_a_badge'] });
  assert.equal(w.rewards.stars, 0); assert.equal(w.rewards.coins, 0); assert.deepEqual(w.rewards.badges, ['first_lesson']);
  w = grant(w, { coins: 20 });
  const deco = DECORATIONS.find((d) => d.price <= 20)!;
  assert.ok(canAfford(w, deco.id));
  w = purchaseDecoration(w, deco.id);
  assert.equal(w.rewards.coins, 20 - deco.price); assert.ok(w.decorations.includes(deco.id));
  assert.equal(purchaseDecoration(w, deco.id).rewards.coins, w.rewards.coins, 'cannot buy twice');
  assert.ok(decorationsAt(w, deco.place).some((d) => d.id === deco.id));
  assert.ok(DECORATIONS.filter((d) => d.kind === 'accessory').every((d) => d.place === 'avatar'), 'accessories never touch primary characters');
  assert.ok(BADGES.length >= 15);
  assert.equal(certificateFor('stem', 6, 6), 'cert.stem'); assert.equal(certificateFor('stem', 5, 6), null);
});

test('screen-time decisions: ok, wind-down, time-up, bedtime, break', () => {
  const rules = { dailyMinutes: 30 as const, bedtime: '20:30', breakEveryMinutes: 20 };
  assert.equal(decide(rules, 10, 5, t0).reason, 'ok');
  const wind = decide(rules, 26, 5, t0); assert.ok(wind.windDown && wind.allow && wind.remainingMinutes === 4);
  const up = decide(rules, 30, 5, t0); assert.ok(up.timeUp && !up.allow && up.reason === 'limit');
  const brk = decide(rules, 10, 25, t0); assert.ok(brk.breakDue && brk.allow && brk.reason === 'break');
  const none = decide({ ...rules, dailyMinutes: 'none' }, 500, 0, t0); assert.ok(none.allow && none.remainingMinutes === null);
  const night = new Date(2026, 5, 15, 21, 0).getTime(); // local 21:00
  assert.ok(isBedtime(rules, night)); assert.ok(!decide(rules, 0, 0, night).allow); assert.equal(decide(rules, 0, 0, night).reason, 'bedtime');
  const early = new Date(2026, 5, 15, 5, 0).getTime(); assert.ok(isBedtime(rules, early), 'before wake time still bedtime');
  assert.ok(!isBedtime({ ...rules, bedtime: null }, night));
  assert.equal(DEFAULT_RULES.A0.dailyMinutes, 15);
  const rep = weeklyReport({ '2026-06-15': 12 }, new Date(2026, 5, 15, 12).getTime());
  assert.equal(rep.labels.length, 7); assert.equal(rep.total, 12); assert.equal(rep.minutes[6], 12);
});

test('sync merge never loses progress; diff produces stable client ids', () => {
  const base = createWorldState(t0);
  const local = { ...base, tickedAt: t0 + 1000, lessonsCompleted: ['a'], rewards: { ...base.rewards, stars: 3, badges: ['first_lesson'] }, mastery: { c: { concept: 'c', score: 0.5, attempts: 2, correct: 1, lastSeenAt: t0 + 500, nextReviewAt: t0 + DAY } } };
  const remote = { ...base, tickedAt: t0, lessonsCompleted: ['b'], storiesRead: ['s'], rewards: { ...base.rewards, stars: 5, coins: 2, badges: ['coder'] }, mastery: { c: { concept: 'c', score: 0.9, attempts: 5, correct: 5, lastSeenAt: t0, nextReviewAt: t0 + DAY } } };
  const m = mergeWorld(local, remote);
  assert.deepEqual([...m.lessonsCompleted].sort(), ['a', 'b']); assert.deepEqual(m.storiesRead, ['s']);
  assert.equal(m.rewards.stars, 5); assert.equal(m.rewards.coins, 2); assert.deepEqual([...m.rewards.badges].sort(), ['coder', 'first_lesson']);
  assert.equal(m.mastery.c.score, 0.5, 'newer lastSeenAt wins');
  assert.equal(mergeWorld(local, null), local);
  const ev = diffEvents(base, m, 'child1');
  assert.ok(ev.some((e) => e.clientId === 'child1:lesson:a' && e.type === 'lesson.completed'));
  assert.ok(ev.some((e) => e.type === 'badge.earned' && e.clientId === 'child1:badge:coder'));
  assert.deepEqual(diffEvents(base, m, 'child1').map((e) => e.clientId), ev.map((e) => e.clientId), 'stable ids');
});

test("Mitthu's Echo triggers and session", () => {
  const stem = LESSONS.filter((l) => l.meta.section === 'stem' && l.meta.subject === 'physics').map((l) => l.meta.id);
  assert.ok(stem.length >= 3);
  const lessons = LESSON_BY_ID;
  const base = { band: 'A3' as const, level: 'explorer' as const, lessons, mastery: {}, lastOpenedAt: t0, now: t0, echoedLessonIds: [] as string[] };
  assert.equal(nextEcho({ ...base, completedInOrder: [stem[0]] }), null, 'one lesson: no echo');
  const three = nextEcho({ ...base, completedInOrder: stem.slice(0, 3) });
  assert.equal(three?.trigger, 'lesson-count'); assert.ok(three!.clauses.length >= 1 && three!.clauses.length <= 3);
  assert.equal(nextEcho({ ...base, band: 'A2', completedInOrder: stem.slice(0, 2) })?.trigger, 'lesson-count', 'Little mode every 2');
  const absent = nextEcho({ ...base, completedInOrder: [stem[0]], lastOpenedAt: t0 - 4 * DAY });
  assert.equal(absent?.trigger, 'return-after-absence');
  const parent = nextEcho({ ...base, completedInOrder: [], parentRequestLessonId: stem[0] });
  assert.equal(parent?.trigger, 'parent-request');
  const dip = nextEcho({ ...base, completedInOrder: [stem[0]], mastery: { [lessons[stem[0]].concept]: { concept: lessons[stem[0]].concept, score: 0.65, attempts: 5, correct: 3, lastSeenAt: t0 - 3 * DAY, nextReviewAt: t0 - DAY } } });
  assert.equal(dip?.trigger, 'mastery-dip');
  assert.ok(echoClausesOf(lessons[stem[0]], 'little').length <= 3);
  let s = startEcho(three!); assert.ok(!echoDone(s, three!));
  for (let i = 0; i < three!.clauses.length; i++) s = echoRepeat(s, three!);
  assert.ok(echoDone(s, three!)); assert.ok(s.repeated.every(Boolean));
});

test('assignment lifecycle, supervision gating and photo consent', () => {
  const a = ASSIGNMENT_BY_ID['rwa.gardening.plant_a_seed'];
  let w = createWorldState(t0);
  assert.equal(statusOf(w, a.meta.id), 'available');
  w = startAssignment(w, a, 'A2'); assert.equal(statusOf(w, a.meta.id), 'started');
  assert.equal(completeAssignment(w, a, { parentConfirmed: false, photosAllowed: false, now: t0 }).error, 'needs-parent');
  assert.equal(completeAssignment(w, a, { parentConfirmed: true, photoId: 'p1', photosAllowed: false, now: t0 }).error, 'photo-not-allowed');
  const ok = completeAssignment(w, a, { parentConfirmed: true, note: 'sprouted', photoId: 'p1', photosAllowed: true, now: t0 });
  assert.equal(ok.error, undefined); assert.equal(ok.world.assignments[a.meta.id].status, 'completed'); assert.equal(ok.world.assignments[a.meta.id].photoId, 'p1');
  assert.ok(ok.world.rewards.badges.includes('little_gardener')); assert.equal(ok.world.rewards.coins, 10);
  assert.equal(completeAssignment(ok.world, a, { parentConfirmed: true, photosAllowed: true, now: t0 }).world.rewards.coins, 10, 'idempotent');
  assert.equal(effectiveTier(a, 'A0'), 'together');
  const selfOne = ASSIGNMENTS.find((x) => x.supervision === 'self')!;
  assert.equal(effectiveTier(selfOne, 'A1'), 'nearby'); assert.equal(effectiveTier(selfOne, 'A4'), 'self');
  assert.ok(assignmentsFor(ASSIGNMENTS, 'A1').every((x) => x.meta.bands.includes('A1')));
  assert.ok(assignmentsFor(ASSIGNMENTS, 'A3', 'stem.physics.magnet.01').length >= 1);
  const notForBand = ASSIGNMENTS.find((x) => !x.meta.bands.includes('A0'))!;
  assert.equal(statusOf(startAssignment(createWorldState(t0), notForBand, 'A0'), notForBand.meta.id), 'available');
});

test('story reader: sentences, pages, bedtime pacing, questions', () => {
  const story = STORIES[0];
  assert.equal(sentencesOf('One. Two! Three? चार।').length, 4);
  let r = startReader(story, t0);
  const n = sentencesOf(story.pages[0].text.en).length;
  for (let i = 0; i < n; i++) r = nextSentence(story, r, 'en');
  assert.equal(r.page, 1); assert.equal(r.sentence, 0);
  for (let i = 0; i < story.pages.length; i++) r = nextPage(story, r);
  assert.ok(r.finished);
  assert.ok(paceMs('one two three', true) > paceMs('one two three', false));
  assert.ok(paceMs('one two', false, 2) < paceMs('one two', false, 1));
  assert.equal(questionsFor(story, 'little', true).length, 0, 'no questions at bedtime');
  assert.ok(questionsFor(story, 'explorer', false).length >= 1);
});
