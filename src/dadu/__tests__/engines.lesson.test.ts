import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LESSON_BY_ID } from '../content/lessons';
import { startLesson, next, pick, canAdvance, complete, phases, retry, simpler, variantText, repeat } from '../engines/lesson';
import { applyLessonResult } from '../engines/rewards';
import { createWorldState } from '../core/worldState';

const telescope = LESSON_BY_ID['explore.astronomy.telescope.01'];
const t0 = 1_700_000_000_000;

test('phases map the step list onto the teaching formula', () => {
  assert.deepEqual(phases(telescope.steps.little), ['intro', 'question', 'friend', 'explain', 'activity', 'feedback', 'quiz', 'echo']);
});

test('happy path: dialogue, activity, feedback, quiz first try, echo, done with two stars', () => {
  let s = startLesson(telescope, 'little', t0);
  assert.equal(s.phase, 'intro');
  for (let i = 0; i < 4; i++) { assert.ok(canAdvance(telescope, s)); s = next(telescope, s, t0); }
  assert.equal(s.phase, 'activity');
  assert.ok(!canAdvance(telescope, s), 'activity must be answered first');
  s = pick(telescope, s, 'moon');
  assert.ok(s.lastResult?.ok && s.activityDone);
  s = next(telescope, s, t0); assert.equal(s.phase, 'feedback');
  s = next(telescope, s, t0); assert.equal(s.phase, 'quiz');
  s = pick(telescope, s, 'moon'); assert.ok(s.quizCorrect);
  s = next(telescope, s, t0); assert.equal(s.phase, 'echo');
  assert.ok(s.echoClauses.length >= 1, 'echo-tagged dialogue was collected');
  s = next(telescope, s, t0 + 60_000); assert.equal(s.phase, 'done');
  const r = complete(telescope, s, t0 + 60_000)!;
  assert.equal(r.stars, 2); assert.equal(r.coins, 5); assert.equal(r.resultWeight, 1); assert.equal(r.durationMs, 60_000);
});

test('wrong answers never block or shame: retry, then one star and 0.6 weight', () => {
  let s = startLesson(telescope, 'explorer', t0);
  for (let i = 0; i < 4; i++) s = next(telescope, s, t0);
  s = pick(telescope, s, ['venus', 'mercury']); // wrong order
  assert.ok(!s.lastResult?.ok && !s.activityDone && s.attempts === 1);
  assert.ok(s.lastResult?.feedback.en.length);
  s = retry(s); assert.equal(s.picked, null);
  s = pick(telescope, s, ['mercury', 'venus', 'earth', 'mars']); assert.ok(s.activityDone);
  s = next(telescope, s, t0); s = next(telescope, s, t0);
  s = pick(telescope, s, 'eye'); assert.ok(!s.quizCorrect); assert.equal(s.quizAttempts, 1);
  s = pick(telescope, s, 'lens'); assert.ok(s.quizCorrect);
  s = next(telescope, s, t0); s = next(telescope, s, t0);
  const r = complete(telescope, s, t0)!;
  assert.equal(r.stars, 1); assert.equal(r.resultWeight, 0.6); assert.equal(r.attempts, 2);
});

test('simpler/advanced/example variants and repeat counter', () => {
  let s = startLesson(telescope, 'little', t0);
  assert.equal(variantText(telescope, s), null);
  s = simpler(s); assert.equal(variantText(telescope, s)?.en, telescope.simpler.en);
  s = repeat(repeat(s)); assert.equal(s.repeats, 2);
  s = next(telescope, s, t0); assert.equal(s.variant, 'normal', 'variant resets on the next step');
});

test('applyLessonResult grants rewards once and queues the echo', () => {
  let w = createWorldState(t0);
  let s = startLesson(telescope, 'little', t0);
  for (let i = 0; i < 4; i++) s = next(telescope, s, t0);
  s = pick(telescope, s, 'moon'); s = next(telescope, s, t0); s = next(telescope, s, t0); s = pick(telescope, s, 'moon'); s = next(telescope, s, t0); s = next(telescope, s, t0);
  const r = complete(telescope, s, t0)!;
  w = applyLessonResult(w, r, 'explore', {});
  assert.equal(w.rewards.stars, 2); assert.equal(w.rewards.coins, 5);
  assert.ok(w.rewards.badges.includes('first_lesson') && w.rewards.badges.includes('star_gazer'));
  assert.deepEqual(w.echoQueue, [telescope.meta.id]);
  const again = applyLessonResult(w, r, 'explore', { explore: 1 });
  assert.equal(again.rewards.stars, 2, 'no extra stars for repeating'); assert.equal(again.rewards.coins, 10, 'participation coins still granted');
});
