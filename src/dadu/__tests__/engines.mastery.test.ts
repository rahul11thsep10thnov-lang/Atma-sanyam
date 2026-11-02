import { test } from 'node:test';
import assert from 'node:assert/strict';
import { updateMastery, masteryState, dueForRevision, pickNextDifficulty, summarise } from '../engines/mastery';
import { buildAssessment, buildOlympiad, isCorrect, resultWeight, recordAnswer, emptyProgress, KINDS_BY_BAND } from '../engines/assessment';
import { LESSONS } from '../content/lessons';

const DAY = 86_400_000;
const t0 = 1_700_000_000_000;

test('mastery update follows the exponential rule with difficulty weights', () => {
  let r = updateMastery(undefined, 'c', 1, 'steady', t0);
  assert.equal(r.score, 0.35); assert.equal(r.attempts, 1); assert.equal(r.correct, 1);
  assert.equal(r.nextReviewAt, t0 + 2 * DAY, 'interval 1 → round(2.2) = 2 days');
  r = updateMastery(r, 'c', 0, 'steady', t0 + DAY);
  assert.ok(Math.abs(r.score - 0.2275) < 0.001); assert.equal(r.nextReviewAt, t0 + 2 * DAY, 'incorrect resets interval to 1 day');
  const stretch = updateMastery(undefined, 'c', 1, 'stretch', t0);
  assert.equal(stretch.score, 0.35, 'target is clipped at 1');
  const gentle = updateMastery(undefined, 'c', 1, 'gentle', t0);
  assert.equal(gentle.score, 0.28);
  for (let i = 0; i < 10; i++) r = updateMastery(r, 'c', 1, 'steady', t0 + i * DAY);
  assert.ok(r.score > 0.8);
});

test('mastery states and revision scheduling', () => {
  assert.equal(masteryState(undefined, t0), 'new');
  let r = updateMastery(undefined, 'c', 1, 'steady', t0);
  assert.equal(masteryState(r, t0), 'exploring');
  for (let i = 0; i < 8; i++) r = updateMastery(r, 'c', 1, 'steady', t0);
  assert.equal(masteryState(r, t0), 'mastered');
  assert.equal(masteryState(r, r.nextReviewAt + DAY), 'needs-revision', 'overdue mastered concept needs revision');
  const weak = { ...r, score: 0.4 };
  assert.equal(masteryState(weak, t0), 'growing');
  const due = dueForRevision({ a: { ...r, concept: 'a', nextReviewAt: t0 - DAY }, b: { ...r, concept: 'b', nextReviewAt: t0 + DAY } }, t0);
  assert.deepEqual(due.map((x) => x.concept), ['a']);
  const sum = summarise({ a: r, b: weak }, t0);
  assert.equal(sum.mastered, 1); assert.equal(sum.needsRevision, 1);
});

test('next difficulty rule', () => {
  assert.equal(pickNextDifficulty({ mastery: 0.3, parent: 'steady', band: 'A3', lastThree: [] }).difficulty, 'gentle');
  assert.equal(pickNextDifficulty({ mastery: 0.7, parent: 'stretch', band: 'A3', lastThree: [] }).difficulty, 'stretch');
  assert.equal(pickNextDifficulty({ mastery: 0.7, parent: 'steady', band: 'A2', lastThree: [true, true, true] }).difficulty, 'steady', 'Little mode never stretches');
  assert.equal(pickNextDifficulty({ mastery: 0.9, parent: 'gentle', band: 'A5', lastThree: [], lastServed: 'gentle' }).difficulty, 'steady');
  assert.equal(pickNextDifficulty({ mastery: 0.7, parent: 'steady', band: 'A4', lastThree: [true, false, false] }).difficulty, 'gentle');
  assert.ok(pickNextDifficulty({ mastery: 0.7, parent: 'steady', band: 'A4', lastThree: [] }).why.includes('mastery'));
});

test('assessment sets order due, weak, new and the twelve kinds validate', () => {
  const pool = LESSONS.filter((l) => l.meta.section === 'stem');
  const mastery = { [pool[1].concept]: updateMastery(undefined, pool[1].concept, 1, 'steady', t0 - 10 * DAY) };
  const set = buildAssessment('daily', pool, 'explorer', mastery, t0);
  assert.equal(set.items.length, 3);
  assert.equal(set.items[0].lessonId, pool[1].meta.id, 'the overdue concept comes first');
  assert.ok(set.why[0].includes('due'));
  const oly = buildOlympiad(LESSONS, 'explorer', t0);
  assert.ok(oly.items.every((i) => (LESSONS.find((l) => l.meta.id === i.lessonId)!.meta.difficulty) >= 3));
  const items = [{ key: 'a', label: { en: 'a', hi: 'a' }, ok: true, group: 'g1', order: 1 }, { key: 'b', label: { en: 'b', hi: 'b' }, group: 'g2', order: 2 }, { key: 'c', label: { en: 'c', hi: 'c' }, group: 'g1' }];
  assert.ok(isCorrect('mcq', items, 'a')); assert.ok(!isCorrect('image', items, 'b'));
  assert.ok(isCorrect('true-false', [{ key: 'true', label: { en: 't', hi: 't' }, ok: true }], true));
  assert.ok(isCorrect('fill-blank', items, ' A ')); assert.ok(!isCorrect('fill-blank', items, 'z'));
  assert.ok(isCorrect('match', items, { a: 'g1', b: 'g2', c: 'g1' })); assert.ok(!isCorrect('drag-drop', items, { a: 'g2', b: 'g2', c: 'g1' }));
  assert.ok(isCorrect('sequence', items, ['a', 'b'])); assert.ok(!isCorrect('sequence', items, ['b', 'a']));
  assert.ok(isCorrect('memory', items, ['a', 'c'])); assert.ok(!isCorrect('memory', items, ['a', 'b']));
  assert.ok(isCorrect('practical', items, { confirmed: true })); assert.ok(!isCorrect('oral', items, { confirmed: false })); assert.ok(isCorrect('drawing', items, true));
  assert.equal(resultWeight('mcq', true, 1), 1); assert.equal(resultWeight('mcq', true, 2), 0.6); assert.equal(resultWeight('practical', true, 1), 0.8); assert.equal(resultWeight('mcq', false, 1), 0);
  assert.deepEqual(KINDS_BY_BAND.A0, ['image', 'audio']);
  const p = recordAnswer(emptyProgress(), set.items[0], true, 1);
  assert.equal(p.firstTry, 1); assert.equal(p.byConcept[set.items[0].concept].total, 1);
});
