import { and, asc, desc, eq, inArray, lt, lte, sql } from 'drizzle-orm';
import type { Db } from '../database/client.js';
import {
  exams,
  chapters,
  mockTestQuestions,
  mockTests,
  questionOptions,
  questionRevisions,
  questions,
  subjects,
  testAnswers,
  testAttempts,
  type QuestionSnapshot,
} from '../database/schema.js';
import { badRequest, conflict, HttpError, notFound } from '../lib/httpError.js';
import { log } from '../lib/logger.js';

// ---------------------------------------------------------------------------
// Attempt lifecycle (state machine)
//
//   (start) ──► in_progress ──► submitted        candidate submits in time
//                    │
//                    └────────► auto_submitted   server finalises after the
//                                                deadline + grace, from the
//                                                answers saved so far
//
// "Created" and "in progress" are one state: an attempt starts the moment it
// is created. A finished attempt never changes again (no re-scoring), and
// every transition happens inside a transaction that holds a row lock on the
// attempt, so two requests can never finalise it twice.
// ---------------------------------------------------------------------------

export type AttemptStatus = (typeof testAttempts.status.enumValues)[number];
export const FINISHED_STATUSES: AttemptStatus[] = ['submitted', 'auto_submitted'];
export const isFinished = (s: AttemptStatus) => s !== 'in_progress';

export interface SubmittedAnswer {
  questionId: string;
  selectedOption: string | null;
  markedForReview?: boolean;
  timeSpentSeconds?: number | null;
  /** Client change counter for this question. A save with a lower or equal
   * number than the one already stored is ignored (never goes backwards). */
  version?: number;
}

function isUniqueViolation(e: unknown): boolean {
  const err = e as { code?: string; cause?: { code?: string } };
  return err?.code === '23505' || err?.cause?.code === '23505';
}

/** Serialises "start" requests of one user: two tabs, a double-click or a
 * network retry can no longer race each other (or the free quota). */
async function lockUser(tx: Db, userId: string) {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`attempt:${userId}`}))`);
}

function startPayload(a: typeof testAttempts.$inferSelect, now: Date, resumed: boolean) {
  return { attemptId: a.id, startedAt: a.startedAt, deadlineAt: a.deadlineAt, serverTime: now, resumed, totalQuestions: a.totalQuestions };
}

/**
 * Starts (or resumes) an attempt. The questions served — and their answer key
 * and version — are recorded now, so scoring later uses exactly what the user
 * saw. `assertAllowed` runs inside the same lock (free quota / plan check), so
 * parallel starts cannot use more free tests than allowed.
 */
export async function startAttempt(
  db: Db,
  userId: string,
  mockTestId: string,
  graceSeconds: number,
  opts: { assertAllowed?: (tx: Db) => Promise<void>; signals?: { deviceHash: string | null; networkHash: string | null } } = {}
) {
  try {
    return await db.transaction(async (tx) => {
      await lockUser(tx, userId);
      const [test] = await tx
        .select()
        .from(mockTests)
        .where(and(eq(mockTests.id, mockTestId), eq(mockTests.status, 'published')))
        .limit(1);
      if (!test) throw notFound('Mock test not found');

      const now = new Date();
      const [open] = await tx
        .select()
        .from(testAttempts)
        .where(and(eq(testAttempts.userId, userId), eq(testAttempts.mockTestId, mockTestId), eq(testAttempts.status, 'in_progress')))
        .limit(1);
      if (open) {
        if (open.deadlineAt.getTime() + graceSeconds * 1000 > now.getTime()) return startPayload(open, now, true);
        // Expired: finalise it from its saved answers before starting afresh, so
        // an old attempt can't be submitted later with answers learned from a
        // newer attempt's result.
        await finalizeLocked(tx, open.id, { mode: 'auto', now, graceSeconds });
      }

      await opts.assertAllowed?.(tx);

      const served = await tx
        .select({ id: questions.id, position: mockTestQuestions.position, correctOption: questions.correctOption, version: questions.version })
        .from(mockTestQuestions)
        .innerJoin(questions, eq(questions.id, mockTestQuestions.questionId))
        .where(and(eq(mockTestQuestions.mockTestId, mockTestId), eq(questions.status, 'published')))
        .orderBy(asc(mockTestQuestions.position));
      if (served.length === 0) throw conflict('This test has no questions available right now.');

      const deadlineAt = new Date(now.getTime() + test.durationMinutes * 60_000);
      const [row] = await tx
        .insert(testAttempts)
        .values({ userId, mockTestId, startedAt: now, deadlineAt, totalQuestions: served.length, deviceHash: opts.signals?.deviceHash ?? null, networkHash: opts.signals?.networkHash ?? null })
        .returning();
      await tx.insert(testAnswers).values(
        served.map((q) => ({
          attemptId: row!.id,
          questionId: q.id,
          position: q.position,
          correctOptionSnapshot: q.correctOption,
          questionVersion: q.version,
        }))
      );
      log.info('attempt.started', { attemptId: row!.id, mockTestId, questions: served.length });
      return startPayload(row!, now, false);
    });
  } catch (e) {
    // Belt and braces: the partial unique index refuses a second open attempt
    // even if the lock were bypassed. Treat it as "resume".
    if (isUniqueViolation(e)) {
      const [open] = await db
        .select()
        .from(testAttempts)
        .where(and(eq(testAttempts.userId, userId), eq(testAttempts.mockTestId, mockTestId), eq(testAttempts.status, 'in_progress')))
        .limit(1);
      if (open) return startPayload(open, new Date(), true);
    }
    throw e;
  }
}

interface FinalizeOpts {
  mode: 'candidate' | 'auto';
  now: Date;
  graceSeconds: number;
  /** Answers sent with a candidate's submission (merged over saved ones). */
  answers?: SubmittedAnswer[];
}

/**
 * The single result-finalisation routine. Must run inside a transaction: it
 * locks the attempt row, and does nothing if the attempt is already finished
 * (so a retry or a second concurrent request is harmless).
 *
 * A candidate's submission counts if it arrives by deadline + grace. Later
 * than that, only the answers the server had already saved count (the
 * attempt becomes auto_submitted and is flagged late), so a slow or
 * tampered client cannot buy extra time.
 */
async function finalizeLocked(tx: Db, attemptId: string, o: FinalizeOpts): Promise<{ changed: boolean; status: AttemptStatus }> {
  const [attempt] = await tx.select().from(testAttempts).where(eq(testAttempts.id, attemptId)).for('update').limit(1);
  if (!attempt) throw notFound('Attempt not found');
  if (isFinished(attempt.status)) return { changed: false, status: attempt.status };

  const [test] = await tx.select().from(mockTests).where(eq(mockTests.id, attempt.mockTestId)).limit(1);
  if (!test) throw notFound('Mock test not found');

  const served = await tx
    .select({
      answerId: testAnswers.id,
      questionId: testAnswers.questionId,
      selectedOption: testAnswers.selectedOption,
      markedForReview: testAnswers.markedForReview,
      timeSpentSeconds: testAnswers.timeSpentSeconds,
      version: testAnswers.version,
      snapshot: testAnswers.correctOptionSnapshot,
      currentKey: questions.correctOption,
    })
    .from(testAnswers)
    .innerJoin(questions, eq(questions.id, testAnswers.questionId))
    .where(eq(testAnswers.attemptId, attemptId));
  const servedIds = new Set(served.map((s) => s.questionId));

  const deadlineWithGrace = attempt.deadlineAt.getTime() + o.graceSeconds * 1000;
  const late = o.mode === 'candidate' && o.now.getTime() > deadlineWithGrace;
  const acceptPayload = o.mode === 'candidate' && !late;

  const payload = new Map<string, SubmittedAnswer>();
  for (const a of o.answers ?? []) {
    if (!servedIds.has(a.questionId)) throw badRequest(`Question ${a.questionId} is not part of this attempt.`);
    if (a.selectedOption !== null && !/^[A-D]$/.test(a.selectedOption)) throw badRequest(`Invalid option "${a.selectedOption}".`);
    payload.set(a.questionId, a);
  }

  const marks = Number(test.marksPerQuestion);
  const negative = Number(test.negativeMarks);
  const maxSeconds = test.durationMinutes * 60;
  let correct = 0;
  let incorrect = 0;
  for (const s of served) {
    const p = acceptPayload ? payload.get(s.questionId) : undefined;
    const usePayload = p !== undefined && (p.version === undefined || p.version >= s.version);
    const selected = usePayload ? p.selectedOption : s.selectedOption;
    const key = s.snapshot ?? s.currentKey;
    const isCorrect = selected === null ? null : selected === key;
    if (isCorrect === true) correct++;
    else if (isCorrect === false) incorrect++;
    await tx
      .update(testAnswers)
      .set({
        selectedOption: selected,
        isCorrect,
        markedForReview: usePayload ? (p.markedForReview ?? false) : s.markedForReview,
        timeSpentSeconds: usePayload
          ? p.timeSpentSeconds != null
            ? Math.max(0, Math.min(maxSeconds, Math.round(p.timeSpentSeconds)))
            : s.timeSpentSeconds
          : s.timeSpentSeconds,
        ...(usePayload && p.version !== undefined ? { version: p.version } : {}),
      })
      .where(eq(testAnswers.id, s.answerId));
  }

  const status: AttemptStatus = o.mode === 'candidate' && !late ? 'submitted' : 'auto_submitted';
  // An auto-finalised attempt "ends" at its deadline, never later.
  const endedAt = status === 'auto_submitted' ? new Date(Math.min(o.now.getTime(), attempt.deadlineAt.getTime())) : o.now;
  const total = served.length;
  const score = correct * marks - incorrect * negative;
  const maxScore = total * marks;
  await tx
    .update(testAttempts)
    .set({
      status,
      submittedAt: o.mode === 'candidate' ? o.now : endedAt,
      timeTakenSeconds: Math.max(0, Math.min(maxSeconds, Math.round((endedAt.getTime() - attempt.startedAt.getTime()) / 1000))),
      attemptedCount: correct + incorrect,
      correctCount: correct,
      incorrectCount: incorrect,
      unansweredCount: total - correct - incorrect,
      score: score.toFixed(2),
      maxScore: maxScore.toFixed(2),
      percentage: (maxScore > 0 ? (score / maxScore) * 100 : 0).toFixed(2),
      late,
    })
    .where(eq(testAttempts.id, attemptId));
  log.info(status === 'submitted' ? 'attempt.submitted' : 'attempt.auto_submitted', {
    attemptId,
    mockTestId: attempt.mockTestId,
    correct,
    incorrect,
    late,
  });
  return { changed: true, status };
}

async function ownedAttempt(db: Db, userId: string, attemptId: string, mockTestId?: string) {
  const [attempt] = await db.select().from(testAttempts).where(eq(testAttempts.id, attemptId)).limit(1);
  if (!attempt || attempt.userId !== userId || (mockTestId && attempt.mockTestId !== mockTestId)) throw notFound('Attempt not found');
  return attempt;
}

/** Finalises one attempt (if still open) in its own transaction. */
async function finalize(db: Db, attemptId: string, o: FinalizeOpts) {
  return db.transaction((tx) => finalizeLocked(tx, attemptId, o));
}

/** Scores an attempt from the answer key recorded at start. Scores sent by a
 * client are never read. Submitting twice (or concurrently) returns the
 * stored result. */
export async function submitAttempt(
  db: Db,
  userId: string,
  mockTestId: string,
  attemptId: string,
  answers: SubmittedAnswer[],
  graceSeconds: number
) {
  await ownedAttempt(db, userId, attemptId, mockTestId);
  await finalize(db, attemptId, { mode: 'candidate', now: new Date(), graceSeconds, answers });
  return getResult(db, userId, attemptId, graceSeconds);
}

/**
 * Autosave: stores answers while the test runs. Each answer carries a
 * version; the database keeps the highest, so a delayed old request cannot
 * overwrite a newer answer (two tabs, retries, slow networks). Refused once
 * the attempt is finished or past deadline + grace (the attempt is then
 * finalised from what was saved).
 */
export async function saveAnswers(db: Db, userId: string, attemptId: string, answers: SubmittedAnswer[], graceSeconds: number) {
  const attempt = await ownedAttempt(db, userId, attemptId);
  const now = new Date();
  if (!isFinished(attempt.status) && now.getTime() > attempt.deadlineAt.getTime() + graceSeconds * 1000) {
    await finalize(db, attemptId, { mode: 'auto', now, graceSeconds });
    throw new HttpError(409, 'Time is over: the test has been submitted with the answers saved so far.', 'attempt_closed', { status: 'auto_submitted' });
  }
  return db.transaction(async (tx) => {
    const [locked] = await tx.select().from(testAttempts).where(eq(testAttempts.id, attemptId)).for('update').limit(1);
    if (!locked || isFinished(locked.status)) {
      throw new HttpError(409, 'This test has already been submitted.', 'attempt_closed', { status: locked?.status });
    }
    const served = await tx.select({ questionId: testAnswers.questionId }).from(testAnswers).where(eq(testAnswers.attemptId, attemptId));
    const servedIds = new Set(served.map((s) => s.questionId));
    const saved: { questionId: string; version: number }[] = [];
    const stale: string[] = [];
    for (const a of answers) {
      if (!servedIds.has(a.questionId)) throw badRequest(`Question ${a.questionId} is not part of this attempt.`);
      if (a.selectedOption !== null && !/^[A-D]$/.test(a.selectedOption)) throw badRequest(`Invalid option "${a.selectedOption}".`);
      const version = a.version ?? 0;
      const rows = await tx
        .update(testAnswers)
        .set({
          selectedOption: a.selectedOption,
          markedForReview: a.markedForReview ?? false,
          ...(a.timeSpentSeconds != null ? { timeSpentSeconds: Math.max(0, Math.round(a.timeSpentSeconds)) } : {}),
          version,
          savedAt: now,
        })
        .where(and(eq(testAnswers.attemptId, attemptId), eq(testAnswers.questionId, a.questionId), lt(testAnswers.version, version)))
        .returning({ questionId: testAnswers.questionId });
      if (rows.length) saved.push({ questionId: a.questionId, version });
      else stale.push(a.questionId);
    }
    if (saved.length) await tx.update(testAttempts).set({ lastSavedAt: now }).where(eq(testAttempts.id, attemptId));
    return { saved, stale, serverTime: now, deadlineAt: locked.deadlineAt, status: locked.status };
  });
}

/** Everything a device needs to resume an attempt after a refresh, a crash
 * or on another device: the server clock, the deadline and the saved answers. */
export async function getAttemptState(db: Db, userId: string, attemptId: string, graceSeconds: number) {
  let attempt = await ownedAttempt(db, userId, attemptId);
  const now = new Date();
  if (!isFinished(attempt.status) && now.getTime() > attempt.deadlineAt.getTime() + graceSeconds * 1000) {
    await finalize(db, attemptId, { mode: 'auto', now, graceSeconds });
    attempt = await ownedAttempt(db, userId, attemptId);
  }
  const answers = await db
    .select({
      questionId: testAnswers.questionId,
      selectedOption: testAnswers.selectedOption,
      markedForReview: testAnswers.markedForReview,
      timeSpentSeconds: testAnswers.timeSpentSeconds,
      version: testAnswers.version,
    })
    .from(testAnswers)
    .where(eq(testAnswers.attemptId, attemptId));
  return {
    attemptId: attempt.id,
    mockTestId: attempt.mockTestId,
    status: attempt.status,
    startedAt: attempt.startedAt,
    deadlineAt: attempt.deadlineAt,
    serverTime: now,
    graceSeconds,
    lastSavedAt: attempt.lastSavedAt,
    answers,
  };
}

/** Finalises every open attempt whose deadline + grace has passed. Run
 * periodically by the server; safe to run on several instances at once. */
export async function finalizeExpiredAttempts(db: Db, graceSeconds: number, limit = 200) {
  const cutoff = new Date(Date.now() - graceSeconds * 1000);
  const stale = await db
    .select({ id: testAttempts.id })
    .from(testAttempts)
    .where(and(eq(testAttempts.status, 'in_progress'), lte(testAttempts.deadlineAt, cutoff)))
    .limit(limit);
  let n = 0;
  for (const a of stale) {
    const r = await finalize(db, a.id, { mode: 'auto', now: new Date(), graceSeconds });
    if (r.changed) n++;
  }
  return n;
}

export async function getResult(db: Db, userId: string, attemptId: string, graceSeconds = 0) {
  const own = await ownedAttempt(db, userId, attemptId);
  if (!isFinished(own.status) && Date.now() > own.deadlineAt.getTime() + graceSeconds * 1000) {
    await finalize(db, attemptId, { mode: 'auto', now: new Date(), graceSeconds });
  }
  const [row] = await db
    .select({ a: testAttempts, title: mockTests.title, marks: mockTests.marksPerQuestion, negative: mockTests.negativeMarks, examName: exams.name })
    .from(testAttempts)
    .innerJoin(mockTests, eq(mockTests.id, testAttempts.mockTestId))
    .innerJoin(exams, eq(exams.id, mockTests.examId))
    .where(eq(testAttempts.id, attemptId))
    .limit(1);
  if (!row || row.a.userId !== userId) throw notFound('Attempt not found');
  if (!isFinished(row.a.status)) throw conflict('This attempt has not been submitted yet.');

  const items = await db
    .select({
      questionId: testAnswers.questionId,
      selectedOption: testAnswers.selectedOption,
      isCorrect: testAnswers.isCorrect,
      markedForReview: testAnswers.markedForReview,
      timeSpentSeconds: testAnswers.timeSpentSeconds,
      questionText: questions.questionText,
      figureSvg: questions.figureSvg,
      currentKey: questions.correctOption,
      keySnapshot: testAnswers.correctOptionSnapshot,
      currentVersion: questions.version,
      servedVersion: testAnswers.questionVersion,
      explanation: questions.explanation,
      // The question number the candidate saw. A question swapped out of the
      // test afterwards is no longer in mock_test_questions, so the answer row
      // carries its own position.
      position: sql<number>`coalesce(${testAnswers.position}, ${mockTestQuestions.position}, 0)`,
      subjectId: questions.subjectId,
      subjectName: subjects.name,
      chapterId: questions.chapterId,
      chapterName: chapters.name,
    })
    .from(testAnswers)
    .innerJoin(questions, eq(questions.id, testAnswers.questionId))
    .leftJoin(
      mockTestQuestions,
      and(eq(mockTestQuestions.questionId, testAnswers.questionId), eq(mockTestQuestions.mockTestId, row.a.mockTestId))
    )
    .leftJoin(subjects, eq(subjects.id, questions.subjectId))
    .leftJoin(chapters, eq(chapters.id, questions.chapterId))
    .where(eq(testAnswers.attemptId, attemptId))
    .orderBy(sql`coalesce(${testAnswers.position}, ${mockTestQuestions.position}, 0)`);
  const ids = items.map((i) => i.questionId);
  const opts = ids.length
    ? await db
        .select({ questionId: questionOptions.questionId, label: questionOptions.label, text: questionOptions.text, svg: questionOptions.svg })
        .from(questionOptions)
        .where(inArray(questionOptions.questionId, ids))
        .orderBy(asc(questionOptions.sortOrder))
    : [];
  // A question edited after this attempt started is shown as it was then.
  const olderVersions = items.filter((i) => i.servedVersion != null && i.servedVersion !== i.currentVersion);
  const revisions = olderVersions.length
    ? await db
        .select({ questionId: questionRevisions.questionId, version: questionRevisions.version, snapshot: questionRevisions.snapshot })
        .from(questionRevisions)
        .where(inArray(questionRevisions.questionId, olderVersions.map((i) => i.questionId)))
    : [];
  const snapshotFor = (qid: string, v: number | null): QuestionSnapshot | null =>
    v == null ? null : (revisions.find((r) => r.questionId === qid && r.version === v)?.snapshot ?? null);

  const sections = new Map<string, { subjectName: string; total: number; correct: number; incorrect: number; unanswered: number; timeSeconds: number }>();
  const topics = new Map<string, { subjectName: string; chapterName: string; total: number; correct: number; incorrect: number; unanswered: number }>();
  for (const i of items) {
    const key = i.subjectId ?? 'general';
    const s = sections.get(key) ?? { subjectName: i.subjectName ?? 'General', total: 0, correct: 0, incorrect: 0, unanswered: 0, timeSeconds: 0 };
    const t = topics.get(i.chapterId) ?? { subjectName: i.subjectName ?? 'General', chapterName: i.chapterName ?? '—', total: 0, correct: 0, incorrect: 0, unanswered: 0 };
    s.total++;
    t.total++;
    s.timeSeconds += i.timeSpentSeconds ?? 0;
    if (i.isCorrect === true) (s.correct++, t.correct++);
    else if (i.isCorrect === false) (s.incorrect++, t.incorrect++);
    else (s.unanswered++, t.unanswered++);
    sections.set(key, s);
    topics.set(i.chapterId, t);
  }

  const a = row.a;
  const timed = items.filter((i) => (i.timeSpentSeconds ?? 0) > 0);
  return {
    attemptId: a.id,
    mockTestId: a.mockTestId,
    title: row.title,
    examName: row.examName,
    status: a.status,
    startedAt: a.startedAt,
    submittedAt: a.submittedAt,
    timeTakenSeconds: a.timeTakenSeconds,
    late: a.late,
    marksPerQuestion: Number(row.marks),
    negativeMarks: Number(row.negative),
    summary: {
      totalQuestions: a.totalQuestions,
      attempted: a.attemptedCount ?? 0,
      correct: a.correctCount ?? 0,
      incorrect: a.incorrectCount ?? 0,
      unanswered: a.unansweredCount ?? 0,
      score: Number(a.score ?? 0),
      maxScore: Number(a.maxScore ?? 0),
      percentage: Number(a.percentage ?? 0),
      negativeMarksLost: (a.incorrectCount ?? 0) * Number(row.negative),
      accuracy: a.attemptedCount ? Math.round(((a.correctCount ?? 0) / a.attemptedCount) * 1000) / 10 : 0,
      averageSecondsPerAnswered: timed.length ? Math.round(timed.reduce((n, i) => n + (i.timeSpentSeconds ?? 0), 0) / timed.length) : null,
    },
    sections: [...sections.entries()].map(([subjectId, s]) => ({ subjectId, ...s })),
    topics: [...topics.entries()].map(([chapterId, t]) => ({ chapterId, ...t })),
    questions: items.map((i) => {
      const old = snapshotFor(i.questionId, i.servedVersion);
      return {
        questionId: i.questionId,
        position: i.position,
        subjectName: i.subjectName ?? 'General',
        chapterName: i.chapterName ?? null,
        questionText: old?.questionText ?? i.questionText,
        figureSvg: old ? old.figureSvg : i.figureSvg,
        options: old
          ? old.options.map((o) => ({ label: o.label, text: o.text, svg: o.svg }))
          : opts.filter((o) => o.questionId === i.questionId).map((o) => ({ label: o.label, text: o.text, svg: o.svg })),
        selectedOption: i.selectedOption,
        correctOption: i.keySnapshot ?? i.currentKey,
        isCorrect: i.isCorrect,
        markedForReview: i.markedForReview,
        timeSpentSeconds: i.timeSpentSeconds,
        explanation: old ? old.explanation : i.explanation,
      };
    }),
  };
}

export async function listAttempts(db: Db, userId: string, opts: { page?: number; pageSize?: number } = {}) {
  const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 100));
  const page = Math.max(1, opts.page ?? 1);
  const rows = await db
    .select({ a: testAttempts, title: mockTests.title, examName: exams.name })
    .from(testAttempts)
    .innerJoin(mockTests, eq(mockTests.id, testAttempts.mockTestId))
    .innerJoin(exams, eq(exams.id, mockTests.examId))
    .where(and(eq(testAttempts.userId, userId), inArray(testAttempts.status, FINISHED_STATUSES)))
    .orderBy(desc(testAttempts.submittedAt), desc(testAttempts.id))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
  return rows.map((r) => ({
    attemptId: r.a.id,
    mockTestId: r.a.mockTestId,
    title: r.title,
    examName: r.examName,
    status: r.a.status,
    submittedAt: r.a.submittedAt,
    score: Number(r.a.score ?? 0),
    maxScore: Number(r.a.maxScore ?? 0),
    percentage: Number(r.a.percentage ?? 0),
    correct: r.a.correctCount ?? 0,
    incorrect: r.a.incorrectCount ?? 0,
    unanswered: r.a.unansweredCount ?? 0,
    timeTakenSeconds: r.a.timeTakenSeconds,
  }));
}
