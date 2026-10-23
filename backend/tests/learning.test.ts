import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { eq } from 'drizzle-orm';
import { lessons } from '../src/database/schema.js';
import { LESSON_SEEDS } from '../src/catalogue/lessons/index.js';
import { SUBJECTS } from '../src/catalogue/learning.js';
import { createAdmin, adminToken, setupTestApp } from './helpers.js';
import { addChild, as, birthMonthForAge, playerLogin, registerGuardian, subscribe } from './lojiHelpers.js';

let ctx: Awaited<ReturnType<typeof setupTestApp>>;
let guardianToken = '';
let kid: Awaited<ReturnType<typeof addChild>>;
let token = '';

beforeAll(async () => {
  ctx = await setupTestApp();
  guardianToken = (await registerGuardian(ctx, '+919876530001')).token;
  await subscribe(ctx, guardianToken);
  kid = await addChild(ctx, guardianToken, { displayName: 'Asha', birthMonth: birthMonthForAge(8), pin: '4826', playerOtpRequired: false });
  token = (await playerLogin(ctx, kid.playerId, '4826')).body.token;
});
afterAll(async () => {
  await ctx.close();
});

describe('seeded lesson content', () => {
  it('seeds every lesson as published with the nine-step chapter template, a sourced Did You Know? and a chapter challenge', async () => {
    const rows = await ctx.db.select().from(lessons);
    expect(rows.length).toBe(LESSON_SEEDS.length);
    expect(rows.length).toBeGreaterThanOrEqual(45);
    for (const l of rows) {
      expect(l.status).toBe('published');
      expect(l.steps.map((s) => s.kind)).toEqual(['objective', 'discover', 'understand', 'example', 'tryIt', 'realWorld', 'revision', 'didYouKnow', 'challenge']);
      expect(l.steps[7]!.fact!.source.url).toMatch(/^https:\/\//);
      expect(l.steps[8]!.questions!.length).toBeGreaterThanOrEqual(3);
      expect(l.sources.length).toBeGreaterThan(0);
      // Curriculum mappings are seeded as pending review: the app never calls them "aligned" until verified.
      for (const m of l.curriculum) expect(m.verificationStatus).toBe('pending_review');
    }
    // All three sections and every age 3..12 are represented.
    expect(new Set(rows.map((r) => r.section))).toEqual(new Set(['study', 'music', 'sports']));
    for (let age = 3; age <= 12; age++) expect(rows.some((r) => r.recommendedAge === age)).toBe(true);
    // Swimming carries the mandatory statement.
    const swim = rows.find((r) => r.subject === 'swimming')!;
    expect(JSON.stringify(swim.steps) + swim.safetyNotes.join()).toMatch(/nobody learns to swim from a screen/i);
  });
});

describe('learning catalogue for a child', () => {
  it('lists sections and subjects with honest availability and the child\'s age as default', async () => {
    const res = await request(ctx.app).get('/v1/player/learning/catalogue').set(as(token));
    expect(res.status).toBe(200);
    expect(res.body.myAge).toBe(8);
    expect(res.body.myBracket).toBe('B');
    expect(res.body.sections.map((s: { key: string }) => s.key)).toEqual(['study', 'music', 'sports']);
    const study = res.body.sections[0];
    const maths = study.subjects.find((s: { key: string }) => s.key === 'maths');
    expect(maths.lessonCount).toBeGreaterThanOrEqual(5);
    expect(maths.availability).toBe('other_ages'); // seeded maths lessons exist but none for exactly age 8
    const drums = res.body.sections[1].subjects.find((s: { key: string }) => s.key === 'drums');
    expect(drums.availability).toBe('coming_soon');
    expect(drums.lessonCount).toBe(0);
    // Every catalogue subject is present (no subject silently dropped).
    const all = res.body.sections.flatMap((s: { subjects: { key: string }[] }) => s.subjects.map((x) => x.key));
    expect(all.sort()).toEqual(SUBJECTS.map((s) => s.key).sort());
  });

  it('defaults lessons to My Age, lets the child explore every age, and labels recommended age and difficulty', async () => {
    const mine = await request(ctx.app).get('/v1/player/learning/lessons').set(as(token)).query({ subject: 'physics' });
    expect(mine.status).toBe(200);
    expect(mine.body.age).toBe(8);
    expect(mine.body.lessons.every((l: { recommendedAge: number }) => l.recommendedAge === 8)).toBe(true);
    expect(mine.body.lessons[0].ageLabel).toBe('Recommended for your age');
    const all = await request(ctx.app).get('/v1/player/learning/lessons').set(as(token)).query({ subject: 'physics', age: 'all' });
    expect(all.body.age).toBe('all');
    expect(all.body.lessons.length).toBeGreaterThan(mine.body.lessons.length);
    const older = all.body.lessons.find((l: { recommendedAge: number }) => l.recommendedAge === 11);
    expect(older.ageLabel).toMatch(/stretch/);
    expect(older.difficultyLabel).toBe('Intermediate');
    const younger = all.body.lessons.find((l: { recommendedAge: number }) => l.recommendedAge === 4);
    expect(younger.ageLabel).toMatch(/revision/);
    // Exploring other ages changes nothing about the profile.
    const me = await request(ctx.app).get('/v1/player/me').set(as(token));
    expect(me.body.child.age).toBe(8);
    expect(me.body.child.effectiveBracket).toBe('B');
    const specific = await request(ctx.app).get('/v1/player/learning/lessons').set(as(token)).query({ section: 'music', age: 3 });
    expect(specific.body.lessons.map((l: { id: string }) => l.id)).toContain('piano-3-high-and-low');
  });

  it('returns a full lesson with steps, sources and curriculum mappings labelled by verification status', async () => {
    const res = await request(ctx.app).get('/v1/player/learning/lessons/maths-9-perimeter-area').set(as(token));
    expect(res.status).toBe(200);
    expect(res.body.steps.length).toBe(9);
    expect(res.body.steps[4].activity.kind).toBe('number');
    expect(res.body.curriculumMappings[0].label).toBe('Mapping awaiting review');
    expect(res.body.curriculum).toBeNull(); // guardian has not chosen a curriculum
    expect(res.body.hasDidYouKnow).toBe(true);
    expect((await request(ctx.app).get('/v1/player/learning/lessons/no-such-lesson').set(as(token))).status).toBe(404);
  });

  it('shows "Aligned with the selected curriculum topic" only for a verified mapping matching the guardian\'s choice', async () => {
    await request(ctx.app).put(`/v1/guardian/children/${kid.id}/controls`).set(as(guardianToken)).send({ curriculumFramework: 'ncert', schoolGrade: 'Class 4' }).expect(200);
    const before = await request(ctx.app).get('/v1/player/learning/lessons/maths-9-perimeter-area').set(as(token));
    expect(before.body.curriculum.status).toBe('pending');
    expect(before.body.curriculum.text).toBe('Curriculum mapping awaiting review');
    // A fact checker verifies the NCERT Class 4 mapping.
    await createAdmin(ctx.db, 'fact_checker');
    const fc = await adminToken(ctx.app, 'fact_checker@example.com');
    const verify = await request(ctx.app).post('/admin/v1/lessons/maths-9-perimeter-area/curriculum/0/verify').set(as(fc)).send({ verificationStatus: 'verified', note: 'Checked against the Class 4 textbook' });
    expect(verify.status).toBe(200);
    expect(verify.body.curriculum[0].verificationStatus).toBe('verified');
    const after = await request(ctx.app).get('/v1/player/learning/lessons/maths-9-perimeter-area').set(as(token));
    expect(after.body.curriculum.status).toBe('verified');
    expect(after.body.curriculum.text).toBe('Aligned with the selected curriculum topic');
    // A different grade does not match.
    await request(ctx.app).put(`/v1/guardian/children/${kid.id}/controls`).set(as(guardianToken)).send({ schoolGrade: 'Class 7' }).expect(200);
    const other = await request(ctx.app).get('/v1/player/learning/lessons/maths-9-perimeter-area').set(as(token));
    expect(other.body.curriculum.status).toBe('none');
    await request(ctx.app).put(`/v1/guardian/children/${kid.id}/controls`).set(as(guardianToken)).send({ curriculumFramework: null, schoolGrade: null }).expect(200);
  });

  it('a guardian can block a subject; it disappears from lists and detail', async () => {
    await request(ctx.app).put(`/v1/guardian/children/${kid.id}/controls`).set(as(guardianToken)).send({ blockedSubjects: ['squash'] }).expect(200);
    const list = await request(ctx.app).get('/v1/player/learning/lessons').set(as(token)).query({ section: 'sports', age: 'all' });
    expect(list.body.lessons.some((l: { subject: string }) => l.subject === 'squash')).toBe(false);
    expect((await request(ctx.app).get('/v1/player/learning/lessons/squash-9-court-and-safety').set(as(token))).status).toBe(404);
    const cat = await request(ctx.app).get('/v1/player/learning/catalogue').set(as(token));
    expect(cat.body.sections[2].subjects.find((s: { key: string }) => s.key === 'squash').blocked).toBe(true);
    expect((await request(ctx.app).put(`/v1/guardian/children/${kid.id}/controls`).set(as(guardianToken)).send({ blockedSubjects: ['nonsense'] })).status).toBe(400);
    await request(ctx.app).put(`/v1/guardian/children/${kid.id}/controls`).set(as(guardianToken)).send({ blockedSubjects: [] }).expect(200);
  });
});

describe('lesson progress, coins and levels', () => {
  it('saves step progress, completes once, awards lesson coins once and raises the subject level', async () => {
    const partial = await request(ctx.app).put('/v1/player/learning/lessons/physics-8-light-and-shadows/progress').set(as(token)).send({ stepsDone: 4, activitiesCorrect: 1, activitiesTotal: 1, timeSeconds: 120, selectedAge: 8 });
    expect(partial.status).toBe(200);
    expect(partial.body.completed).toBe(false);
    expect(partial.body.coins).toBeNull();
    // Claiming completion with steps missing is not accepted.
    const early = await request(ctx.app).put('/v1/player/learning/lessons/physics-8-light-and-shadows/progress').set(as(token)).send({ stepsDone: 6, completed: true });
    expect(early.body.completed).toBe(false);
    const done = await request(ctx.app).put('/v1/player/learning/lessons/physics-8-light-and-shadows/progress').set(as(token)).send({ stepsDone: 9, completed: true, quizScore: 3, quizTotal: 3, timeSeconds: 200 });
    expect(done.body.completed).toBe(true);
    expect(done.body.firstCompletion).toBe(true);
    expect(done.body.coins.awarded).toBe(10);
    expect(done.body.levelUp).toEqual({ subject: 'physics', from: null, to: 8 });
    expect(done.body.newAchievements).toContain('first_lesson');
    expect(done.body.progress.timeSeconds).toBe(320);
    // Doing it again: still complete, no second payment, best quiz kept.
    const again = await request(ctx.app).put('/v1/player/learning/lessons/physics-8-light-and-shadows/progress').set(as(token)).send({ stepsDone: 9, completed: true, quizScore: 2, quizTotal: 3 });
    expect(again.body.firstCompletion).toBe(false);
    expect(again.body.coins).toBeNull();
    expect(again.body.progress.bestQuizScore).toBe(3);
    const me = await request(ctx.app).get('/v1/player/me').set(as(token));
    expect(me.body.child.coins).toBe(10);
    // An older lesson in the same subject does not lower the level; a higher one raises it.
    const older = await request(ctx.app).put('/v1/player/learning/lessons/physics-4-push-and-pull/progress').set(as(token)).send({ stepsDone: 9, completed: true });
    expect(older.body.levelUp).toBeNull();
    const higher = await request(ctx.app).put('/v1/player/learning/lessons/physics-11-levers/progress').set(as(token)).send({ stepsDone: 9, completed: true, quizScore: 2, quizTotal: 3 });
    expect(higher.body.levelUp).toEqual({ subject: 'physics', from: 8, to: 11 });
    const cat = await request(ctx.app).get('/v1/player/learning/catalogue').set(as(token));
    const physics = cat.body.sections[0].subjects.find((s: { key: string }) => s.key === 'physics');
    expect(physics.completed).toBe(3);
    expect(physics.level).toEqual({ age: 11, bracket: 'D', lessonsCompleted: 3 });
  });

  it('music and sports progress are tracked separately per instrument and sport', async () => {
    await request(ctx.app).put('/v1/player/learning/lessons/piano-6-finger-numbers-middle-c/progress').set(as(token)).send({ stepsDone: 9, completed: true }).expect(200);
    await request(ctx.app).put('/v1/player/learning/lessons/cricket-6-meet-cricket/progress').set(as(token)).send({ stepsDone: 9, completed: true, quizScore: 3, quizTotal: 3 }).expect(200);
    const report = await request(ctx.app).get('/v1/player/learning/report').set(as(token));
    expect(report.status).toBe(200);
    expect(report.body.totals.lessonsCompleted).toBe(5);
    expect(report.body.totals.streakDays).toBe(1);
    const music = report.body.sections.find((s: { key: string }) => s.key === 'music');
    expect(music.subjects.map((s: { key: string }) => s.key)).toEqual(['piano']);
    expect(music.subjects[0].level.age).toBe(6);
    const sports = report.body.sections.find((s: { key: string }) => s.key === 'sports');
    expect(sports.subjects[0]).toMatchObject({ key: 'cricket', completed: 1, quizCorrect: 3, quizTotal: 3 });
    expect(report.body.nextLessons.some((l: { subject: string }) => l.subject === 'cricket')).toBe(true);
  });

  it('the guardian sees the learning report, sets goals and a curriculum, and their goals show progress', async () => {
    const set = await request(ctx.app).put(`/v1/guardian/children/${kid.id}/controls`).set(as(guardianToken)).send({ learningGoals: [{ subject: 'physics', lessonsPerWeek: 2 }, { subject: 'tabla', lessonsPerWeek: 1 }], curriculumFramework: 'cbse', schoolGrade: 'Class 3' });
    expect(set.status).toBe(200);
    expect(set.body.learningGoals).toHaveLength(2);
    expect(set.body.curriculumFramework).toBe('cbse');
    const report = await request(ctx.app).get(`/v1/guardian/children/${kid.id}/learning`).set(as(guardianToken));
    expect(report.status).toBe(200);
    expect(report.body.curriculum).toEqual({ framework: 'cbse', board: null, grade: 'Class 3' });
    const physicsGoal = report.body.goals.find((g: { subject: string }) => g.subject === 'physics');
    expect(physicsGoal).toMatchObject({ lessonsPerWeek: 2, doneThisWeek: 3, met: true });
    const tablaGoal = report.body.goals.find((g: { subject: string }) => g.subject === 'tabla');
    expect(tablaGoal.met).toBe(false);
    expect(report.body.nextLessons.some((l: { subject: string }) => l.subject === 'tabla')).toBe(true);
    expect(report.body.recent[0].lessonId).toBe('cricket-6-meet-cricket');
    // The child's /me carries the curriculum preference (read-only for the child).
    const me = await request(ctx.app).get('/v1/player/me').set(as(token));
    expect(me.body.controls.curriculum).toEqual({ framework: 'cbse', board: null, grade: 'Class 3' });
  });

  it('another household\'s guardian cannot read the report', async () => {
    const other = (await registerGuardian(ctx, '+919876530002')).token;
    expect((await request(ctx.app).get(`/v1/guardian/children/${kid.id}/learning`).set(as(other))).status).toBe(404);
  });
});

describe('admin lesson authoring', () => {
  let editor = '';
  let checker = '';
  beforeAll(async () => {
    await createAdmin(ctx.db, 'editor');
    editor = await adminToken(ctx.app, 'editor@example.com');
    checker = await adminToken(ctx.app, 'fact_checker@example.com');
  });

  it('lists lessons with coverage and shows the overview', async () => {
    const list = await request(ctx.app).get('/admin/v1/lessons').set(as(editor)).query({ section: 'music' });
    expect(list.status).toBe(200);
    expect(list.body.total).toBe(9);
    expect(list.body.items[0]).toHaveProperty('verifiedMappings');
    const overview = await request(ctx.app).get('/admin/v1/learning/overview').set(as(editor));
    expect(overview.body.published).toBe(LESSON_SEEDS.length);
    expect(overview.body.didYouKnowCoverage).toBe(100);
    expect(overview.body.subjects.find((s: { key: string }) => s.key === 'maths').published).toBeGreaterThanOrEqual(5);
  });

  it('a new lesson must follow the chapter template before it can be published; publishing needs content:publish', async () => {
    const base = LESSON_SEEDS[0]!;
    const broken = await request(ctx.app).post('/admin/v1/lessons').set(as(editor)).send({ ...base, id: 'maths-test-broken', curriculum: [], steps: base.steps.slice(0, 5) });
    expect(broken.status).toBe(201);
    expect(broken.body.status).toBe('draft');
    expect(broken.body.templateProblems.length).toBeGreaterThan(0);
    const publishBroken = await request(ctx.app).post('/admin/v1/lessons/maths-test-broken/status').set(as(editor)).send({ status: 'published' });
    expect(publishBroken.status).toBe(400);
    const fixed = await request(ctx.app).patch('/admin/v1/lessons/maths-test-broken').set(as(editor)).send({ steps: base.steps });
    expect(fixed.body.templateProblems).toEqual([]);
    expect(fixed.body.adminEdited).toBe(true);
    // A fact checker cannot publish.
    expect((await request(ctx.app).post('/admin/v1/lessons/maths-test-broken/status').set(as(checker)).send({ status: 'published' })).status).toBe(403);
    const published = await request(ctx.app).post('/admin/v1/lessons/maths-test-broken/status').set(as(editor)).send({ status: 'published' });
    expect(published.status).toBe(200);
    expect(published.body.publishedAt).toBeTruthy();
    // It is now visible to the child at its age.
    const visible = await request(ctx.app).get('/v1/player/learning/lessons/maths-test-broken').set(as(token));
    expect(visible.status).toBe(200);
    // Archive, then delete.
    await request(ctx.app).post('/admin/v1/lessons/maths-test-broken/status').set(as(editor)).send({ status: 'archived' }).expect(200);
    expect((await request(ctx.app).get('/v1/player/learning/lessons/maths-test-broken').set(as(token))).status).toBe(404);
    expect((await request(ctx.app).delete('/admin/v1/lessons/maths-test-broken').set(as(editor))).status).toBe(403); // editors cannot delete
  });

  it('an admin-edited seed lesson is not overwritten by re-seeding; untouched ones are refreshed', async () => {
    await request(ctx.app).patch('/admin/v1/lessons/piano-3-high-and-low').set(as(editor)).send({ summary: 'Edited in the console' }).expect(200);
    await ctx.db.update(lessons).set({ summary: 'stale seed copy' }).where(eq(lessons.id, 'tabla-4-clap-the-beat'));
    const { seedLessons } = await import('../src/database/seedCatalogue.js');
    const r = await seedLessons(ctx.db);
    expect(r.lessonsInserted).toBe(0);
    expect(r.lessonsUpdated).toBe(LESSON_SEEDS.length - 1);
    const [edited] = await ctx.db.select().from(lessons).where(eq(lessons.id, 'piano-3-high-and-low'));
    expect(edited!.summary).toBe('Edited in the console');
    const [refreshed] = await ctx.db.select().from(lessons).where(eq(lessons.id, 'tabla-4-clap-the-beat'));
    expect(refreshed!.summary).not.toBe('stale seed copy');
    // Verification recorded earlier survives the refresh.
    const [maths] = await ctx.db.select().from(lessons).where(eq(lessons.id, 'maths-9-perimeter-area'));
    expect(maths!.curriculum[0]!.verificationStatus).toBe('verified');
  });
});
