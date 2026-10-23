// The learning academy: what a child can learn (subjects per section, with
// honest availability), the lessons for an age or for every age, one lesson
// in full, saving progress (which awards coins once and raises the child's
// level in that subject) and the guardian's learning report.
//
// Ages: a child's default learning age is their real age (from birth month),
// but every lesson can be opened at any age — exploring other ages changes
// nothing about the profile or permissions. Progress is tracked per subject,
// instrument and sport separately (learning_levels).
import { and, asc, desc, eq, inArray, isNotNull, sql } from 'drizzle-orm';
import type { Db } from '../database/client.js';
import { lessonProgress, lessons, learningLevels, type CurriculumMapping, type LessonStep } from '../database/schema.js';
import { AGES, bracketForAge, SECTIONS, SUBJECTS, SUBJECT_BY_KEY, type Section } from '../catalogue/learning.js';
import type { Controls } from './controlsService.js';
import { localParts } from './controlsService.js';
import { awardCoins, type AwardResult } from './coinService.js';

export type LessonRow = typeof lessons.$inferSelect;
export type LessonProgressRow = typeof lessonProgress.$inferSelect;

export interface SectionFlags {
  study: boolean;
  music: boolean;
  sports: boolean;
}

export const DIFFICULTY_LABEL: Record<string, string> = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' };

/** The curriculum label a lesson may show: only a verified mapping that matches the guardian's choice is called "aligned". */
export function curriculumLabel(mappings: CurriculumMapping[], controls: Pick<Controls, 'curriculumFramework' | 'curriculumBoard' | 'schoolGrade'>) {
  if (!controls.curriculumFramework) return null;
  const match = mappings.find((m) => m.framework === controls.curriculumFramework && (!controls.schoolGrade || m.grade.toLowerCase() === controls.schoolGrade.toLowerCase()) && (!m.board || !controls.curriculumBoard || m.board.toLowerCase() === controls.curriculumBoard.toLowerCase()));
  if (!match) return { status: 'none' as const, text: 'Not yet mapped to the selected curriculum' };
  if (match.verificationStatus === 'verified') return { status: 'verified' as const, text: 'Aligned with the selected curriculum topic', mapping: match };
  return { status: 'pending' as const, text: 'Curriculum mapping awaiting review', mapping: match };
}

export function publicLessonSummary(l: LessonRow, p: LessonProgressRow | undefined, controls: Controls, myAge: number) {
  return {
    id: l.id,
    section: l.section,
    subject: l.subject,
    topic: l.topic,
    subtopic: l.subtopic,
    title: l.title,
    summary: l.summary,
    recommendedAge: l.recommendedAge,
    recommendedBracket: bracketForAge(l.recommendedAge),
    minAge: l.minAge,
    maxAge: l.maxAge,
    difficulty: l.difficulty,
    difficultyLabel: DIFFICULTY_LABEL[l.difficulty] ?? l.difficulty,
    level: l.level,
    learningObjective: l.learningObjective,
    prerequisites: l.prerequisites,
    estimatedMinutes: l.estimatedMinutes,
    stepCount: l.steps.length,
    hasDidYouKnow: l.steps.some((s) => s.kind === 'didYouKnow' && !!s.fact),
    adultAssisted: l.adultAssisted,
    safetyNotes: l.safetyNotes,
    forMyAge: l.recommendedAge === myAge,
    ageLabel: l.recommendedAge === myAge ? 'Recommended for your age' : l.recommendedAge < myAge ? `Recommended age ${l.recommendedAge} · revision` : `Recommended age ${l.recommendedAge} · stretch`,
    curriculum: curriculumLabel(l.curriculum, controls),
    progress: p
      ? { stepsDone: p.stepsDone, stepsTotal: p.stepsTotal, activitiesCorrect: p.activitiesCorrect, activitiesTotal: p.activitiesTotal, bestQuizScore: p.bestQuizScore, quizTotal: p.quizTotal, timeSeconds: p.timeSeconds, completedAt: p.completedAt?.toISOString() ?? null, lastStepAt: p.lastStepAt.toISOString() }
      : null,
  };
}

export function publicLesson(l: LessonRow, p: LessonProgressRow | undefined, controls: Controls, myAge: number) {
  return {
    ...publicLessonSummary(l, p, controls, myAge),
    steps: l.steps,
    curriculumMappings: l.curriculum.map((m) => ({ ...m, label: m.verificationStatus === 'verified' ? 'Aligned with the selected curriculum topic' : m.verificationStatus === 'rejected' ? 'Mapping rejected' : 'Mapping awaiting review' })),
    sources: l.sources,
    translations: l.translations,
    status: l.status,
    publishedAt: l.publishedAt?.toISOString() ?? null,
  };
}

/** Everything the Learn tab needs: sections, their subjects with counts, levels and blocks. */
export async function learningCatalogue(db: Db, childId: string, myAge: number, controls: Controls, flags: SectionFlags) {
  const counts = await db
    .select({ subject: lessons.subject, section: lessons.section, total: sql<number>`count(*)::int`, forAge: sql<number>`count(*) filter (where ${lessons.recommendedAge} = ${myAge})::int`, minAge: sql<number>`min(${lessons.recommendedAge})::int`, maxAge: sql<number>`max(${lessons.recommendedAge})::int`, ages: sql<number[]>`array_agg(distinct ${lessons.recommendedAge} order by ${lessons.recommendedAge})` })
    .from(lessons)
    .where(eq(lessons.status, 'published'))
    .groupBy(lessons.subject, lessons.section);
  const byKey = new Map(counts.map((c) => [c.subject, c]));
  const done = await db
    .select({ subject: lessons.subject, completed: sql<number>`count(*) filter (where ${lessonProgress.completedAt} is not null)::int`, started: sql<number>`count(*)::int` })
    .from(lessonProgress)
    .innerJoin(lessons, eq(lessons.id, lessonProgress.lessonId))
    .where(eq(lessonProgress.childId, childId))
    .groupBy(lessons.subject);
  const doneBy = new Map(done.map((d) => [d.subject, d]));
  const levels = await db.select().from(learningLevels).where(eq(learningLevels.childId, childId));
  const levelBy = new Map(levels.map((l) => [l.subject, l]));
  const blocked = new Set(controls.blockedSubjects);
  const sections = SECTIONS.map((s) => ({
    ...s,
    enabled: flags[s.key],
    subjects: SUBJECTS.filter((x) => x.section === s.key)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((x) => {
        const c = byKey.get(x.key);
        const d = doneBy.get(x.key);
        const lv = levelBy.get(x.key);
        return {
          key: x.key,
          section: x.section,
          kind: x.kind,
          name: x.name,
          emoji: x.emoji,
          color: x.color,
          description: x.description,
          ages: x.ages,
          topics: x.topics,
          safety: x.safety ?? [],
          adultAssistedBelowAge: x.adultAssistedBelowAge ?? null,
          blocked: blocked.has(x.key),
          lessonCount: c?.total ?? 0,
          lessonsForMyAge: c?.forAge ?? 0,
          agesAvailable: c?.ages ?? [],
          // Honest status: a subject with no published lesson is "coming soon", not an empty shelf of cards.
          availability: !c || c.total === 0 ? ('coming_soon' as const) : (c.forAge ?? 0) === 0 ? ('other_ages' as const) : ('available' as const),
          completed: d?.completed ?? 0,
          started: (d?.started ?? 0) - (d?.completed ?? 0),
          level: lv ? { age: lv.level, bracket: bracketForAge(lv.level), lessonsCompleted: lv.lessonsCompleted } : null,
        };
      }),
  }));
  return {
    myAge,
    myBracket: bracketForAge(myAge),
    ages: AGES,
    curriculum: { framework: controls.curriculumFramework, board: controls.curriculumBoard, grade: controls.schoolGrade },
    goals: controls.learningGoals,
    sections,
  };
}

export interface LessonQuery {
  section?: Section;
  subject?: string;
  age?: number; // undefined = every age
  difficulty?: string;
  topic?: string;
}

export async function listLessons(db: Db, childId: string, myAge: number, controls: Controls, q: LessonQuery) {
  const conds = [eq(lessons.status, 'published')];
  if (q.section) conds.push(eq(lessons.section, q.section));
  if (q.subject) conds.push(eq(lessons.subject, q.subject));
  if (q.age !== undefined) conds.push(eq(lessons.recommendedAge, q.age));
  if (q.difficulty) conds.push(eq(lessons.difficulty, q.difficulty as LessonRow['difficulty']));
  if (q.topic) conds.push(eq(lessons.topic, q.topic));
  const blocked = new Set(controls.blockedSubjects);
  const rows = (await db.select().from(lessons).where(and(...conds)).orderBy(asc(lessons.recommendedAge), asc(lessons.level), asc(lessons.sortOrder), asc(lessons.title))).filter((l) => !blocked.has(l.subject));
  const prog = rows.length ? await db.select().from(lessonProgress).where(and(eq(lessonProgress.childId, childId), inArray(lessonProgress.lessonId, rows.map((r) => r.id)))) : [];
  const pm = new Map(prog.map((p) => [p.lessonId, p]));
  return rows.map((l) => publicLessonSummary(l, pm.get(l.id), controls, myAge));
}

export async function getLesson(db: Db, childId: string, lessonId: string, myAge: number, controls: Controls) {
  const [l] = await db.select().from(lessons).where(and(eq(lessons.id, lessonId), eq(lessons.status, 'published')));
  if (!l || controls.blockedSubjects.includes(l.subject)) return null;
  const [p] = await db.select().from(lessonProgress).where(and(eq(lessonProgress.childId, childId), eq(lessonProgress.lessonId, lessonId)));
  return publicLesson(l, p, controls, myAge);
}

export interface ProgressInput {
  stepsDone: number;
  activitiesCorrect?: number;
  activitiesTotal?: number;
  quizScore?: number;
  quizTotal?: number;
  timeSeconds?: number;
  selectedAge?: number;
  completed?: boolean;
}

/**
 * Saves where the child is in a lesson. Completion is accepted only when every
 * step is done; the first completion awards coins (idempotent per child and
 * lesson) and raises the child's level in that subject if the lesson's age is
 * higher than what they had reached.
 */
export async function saveLessonProgress(db: Db, childId: string, lessonId: string, input: ProgressInput, opts: { lessonCoins: number; dailyCap: number | null; timezone: string }) {
  const [l] = await db.select().from(lessons).where(and(eq(lessons.id, lessonId), eq(lessons.status, 'published')));
  if (!l) return null;
  const stepsTotal = l.steps.length;
  const stepsDone = Math.min(input.stepsDone, stepsTotal);
  const completes = !!input.completed && stepsDone >= stepsTotal;
  const now = new Date();
  const [prev] = await db.select().from(lessonProgress).where(and(eq(lessonProgress.childId, childId), eq(lessonProgress.lessonId, lessonId)));
  const firstCompletion = completes && !prev?.completedAt;
  const quizScore = input.quizScore ?? null;
  const [row] = await db
    .insert(lessonProgress)
    .values({ childId, lessonId, stepsDone, stepsTotal, activitiesCorrect: input.activitiesCorrect ?? 0, activitiesTotal: input.activitiesTotal ?? 0, bestQuizScore: quizScore, quizTotal: input.quizTotal ?? null, timeSeconds: Math.min(input.timeSeconds ?? 0, 3600), selectedAge: input.selectedAge ?? null, completedAt: completes ? now : null, lastStepAt: now })
    .onConflictDoUpdate({
      target: [lessonProgress.childId, lessonProgress.lessonId],
      set: {
        stepsDone: sql`greatest(${lessonProgress.stepsDone}, ${stepsDone})`,
        stepsTotal,
        activitiesCorrect: input.activitiesCorrect !== undefined ? sql`greatest(${lessonProgress.activitiesCorrect}, ${input.activitiesCorrect})` : lessonProgress.activitiesCorrect,
        activitiesTotal: input.activitiesTotal !== undefined ? sql`greatest(${lessonProgress.activitiesTotal}, ${input.activitiesTotal})` : lessonProgress.activitiesTotal,
        bestQuizScore: quizScore !== null ? sql`greatest(coalesce(${lessonProgress.bestQuizScore}, 0), ${quizScore})` : lessonProgress.bestQuizScore,
        quizTotal: input.quizTotal !== undefined ? input.quizTotal : lessonProgress.quizTotal,
        timeSeconds: sql`least(${lessonProgress.timeSeconds} + ${Math.min(input.timeSeconds ?? 0, 3600)}, 100000)`,
        selectedAge: input.selectedAge ?? null,
        completedAt: completes ? sql`coalesce(${lessonProgress.completedAt}, ${now})` : lessonProgress.completedAt,
        lastStepAt: now,
        updatedAt: now,
      },
    })
    .returning();
  let coins: AwardResult | null = null;
  let levelUp: { subject: string; from: number | null; to: number } | null = null;
  if (firstCompletion) {
    coins = await awardCoins(db, childId, opts.lessonCoins, 'lesson_completed', `lesson:${childId}:${lessonId}`, { refType: 'lesson', refId: lessonId, note: l.title, dailyCap: opts.dailyCap, timezone: opts.timezone });
    const [lv] = await db.select().from(learningLevels).where(and(eq(learningLevels.childId, childId), eq(learningLevels.subject, l.subject)));
    const to = Math.max(lv?.level ?? 0, l.recommendedAge);
    if (!lv || to > lv.level) levelUp = { subject: l.subject, from: lv?.level ?? null, to };
    await db
      .insert(learningLevels)
      .values({ childId, subject: l.subject, section: l.section, level: to, lessonsCompleted: 1 })
      .onConflictDoUpdate({ target: [learningLevels.childId, learningLevels.subject], set: { level: to, lessonsCompleted: sql`${learningLevels.lessonsCompleted} + 1`, updatedAt: now } });
  }
  return { progress: row!, completed: completes, firstCompletion, coins, levelUp };
}

/** Consecutive days (ending today or yesterday) with learning activity, in the child's timezone. */
export function streakFromDays(days: Set<string>, today: string): number {
  const d = new Date(`${today}T00:00:00Z`);
  let streak = 0;
  if (!days.has(today)) d.setUTCDate(d.getUTCDate() - 1); // a streak survives until the end of today
  for (;;) {
    const key = d.toISOString().slice(0, 10);
    if (!days.has(key)) break;
    streak += 1;
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return streak;
}

/** The guardian's (and the child's Me tab) learning report. */
export async function learningReport(db: Db, childId: string, myAge: number, controls: Controls) {
  const rows = await db
    .select({ p: lessonProgress, l: lessons })
    .from(lessonProgress)
    .innerJoin(lessons, eq(lessons.id, lessonProgress.lessonId))
    .where(eq(lessonProgress.childId, childId))
    .orderBy(desc(lessonProgress.lastStepAt));
  const levels = await db.select().from(learningLevels).where(eq(learningLevels.childId, childId));
  const dayKeys = new Set(rows.map((r) => localParts(r.p.lastStepAt, controls.timezone).day));
  for (const r of rows) if (r.p.completedAt) dayKeys.add(localParts(r.p.completedAt, controls.timezone).day);
  const today = localParts(new Date(), controls.timezone).day;
  const weekAgo = new Date(Date.now() - 7 * 86_400_000);
  const bySubject = new Map<string, { completed: number; inProgress: number; timeSeconds: number; quizCorrect: number; quizTotal: number; lastAt: Date | null }>();
  for (const r of rows) {
    const s = bySubject.get(r.l.subject) ?? { completed: 0, inProgress: 0, timeSeconds: 0, quizCorrect: 0, quizTotal: 0, lastAt: null };
    if (r.p.completedAt) s.completed += 1;
    else s.inProgress += 1;
    s.timeSeconds += r.p.timeSeconds;
    s.quizCorrect += r.p.bestQuizScore ?? 0;
    s.quizTotal += r.p.quizTotal ?? 0;
    if (!s.lastAt || r.p.lastStepAt > s.lastAt) s.lastAt = r.p.lastStepAt;
    bySubject.set(r.l.subject, s);
  }
  const levelBy = new Map(levels.map((l) => [l.subject, l]));
  // Next lessons: for each subject with activity (or a guardian goal), the first incomplete published lesson at the child's age, else the next age up.
  const subjectsOfInterest = new Set<string>([...bySubject.keys(), ...controls.learningGoals.map((g) => g.subject)]);
  const doneIds = new Set(rows.filter((r) => r.p.completedAt).map((r) => r.p.lessonId));
  const next: ReturnType<typeof publicLessonSummary>[] = [];
  if (subjectsOfInterest.size) {
    const candidates = await db
      .select()
      .from(lessons)
      .where(and(eq(lessons.status, 'published'), inArray(lessons.subject, [...subjectsOfInterest])))
      .orderBy(asc(lessons.recommendedAge), asc(lessons.level), asc(lessons.sortOrder));
    const pm = new Map(rows.map((r) => [r.p.lessonId, r.p]));
    for (const subject of subjectsOfInterest) {
      if (controls.blockedSubjects.includes(subject)) continue;
      const own = candidates.filter((c) => c.subject === subject && !doneIds.has(c.id));
      const pick = own.find((c) => c.recommendedAge >= myAge) ?? own[0];
      if (pick) next.push(publicLessonSummary(pick, pm.get(pick.id), controls, myAge));
    }
  }
  const weekRows = rows.filter((r) => r.p.lastStepAt >= weekAgo);
  const goals = controls.learningGoals.map((g) => {
    const def = SUBJECT_BY_KEY.get(g.subject);
    const doneThisWeek = weekRows.filter((r) => r.l.subject === g.subject && r.p.completedAt && r.p.completedAt >= weekAgo).length;
    return { subject: g.subject, name: def?.name ?? g.subject, emoji: def?.emoji ?? '📘', lessonsPerWeek: g.lessonsPerWeek, doneThisWeek, met: doneThisWeek >= g.lessonsPerWeek };
  });
  return {
    myAge,
    curriculum: { framework: controls.curriculumFramework, board: controls.curriculumBoard, grade: controls.schoolGrade },
    totals: {
      lessonsCompleted: rows.filter((r) => r.p.completedAt).length,
      lessonsInProgress: rows.filter((r) => !r.p.completedAt).length,
      timeSeconds: rows.reduce((n, r) => n + r.p.timeSeconds, 0),
      quizCorrect: rows.reduce((n, r) => n + (r.p.bestQuizScore ?? 0), 0),
      quizTotal: rows.reduce((n, r) => n + (r.p.quizTotal ?? 0), 0),
      activitiesCorrect: rows.reduce((n, r) => n + r.p.activitiesCorrect, 0),
      activitiesTotal: rows.reduce((n, r) => n + r.p.activitiesTotal, 0),
      streakDays: streakFromDays(dayKeys, today),
      activeDays: dayKeys.size,
      thisWeek: { lessonsCompleted: weekRows.filter((r) => r.p.completedAt && r.p.completedAt >= weekAgo).length, timeSeconds: weekRows.reduce((n, r) => n + r.p.timeSeconds, 0) },
    },
    sections: SECTIONS.map((s) => ({
      key: s.key,
      name: s.name,
      emoji: s.emoji,
      color: s.color,
      lessonsCompleted: rows.filter((r) => r.l.section === s.key && r.p.completedAt).length,
      timeSeconds: rows.filter((r) => r.l.section === s.key).reduce((n, r) => n + r.p.timeSeconds, 0),
      subjects: SUBJECTS.filter((x) => x.section === s.key && (bySubject.has(x.key) || levelBy.has(x.key)))
        .map((x) => {
          const st = bySubject.get(x.key)!;
          const lv = levelBy.get(x.key);
          return { key: x.key, name: x.name, emoji: x.emoji, color: x.color, kind: x.kind, completed: st?.completed ?? 0, inProgress: st?.inProgress ?? 0, timeSeconds: st?.timeSeconds ?? 0, quizCorrect: st?.quizCorrect ?? 0, quizTotal: st?.quizTotal ?? 0, level: lv ? { age: lv.level, bracket: bracketForAge(lv.level), lessonsCompleted: lv.lessonsCompleted } : null, lastAt: st?.lastAt?.toISOString() ?? null, blocked: controls.blockedSubjects.includes(x.key) };
        }),
    })),
    goals,
    nextLessons: next.slice(0, 8),
    recent: rows.slice(0, 20).map((r) => ({ lessonId: r.l.id, title: r.l.title, subject: r.l.subject, section: r.l.section, recommendedAge: r.l.recommendedAge, selectedAge: r.p.selectedAge, stepsDone: r.p.stepsDone, stepsTotal: r.p.stepsTotal, bestQuizScore: r.p.bestQuizScore, quizTotal: r.p.quizTotal, timeSeconds: r.p.timeSeconds, completedAt: r.p.completedAt?.toISOString() ?? null, lastStepAt: r.p.lastStepAt.toISOString() })),
  };
}

/** Content coverage for the admin console and the final report: lessons by section, subject, age and status, and DYK coverage. */
export async function learningOverview(db: Db) {
  const rows = await db.select({ id: lessons.id, section: lessons.section, subject: lessons.subject, recommendedAge: lessons.recommendedAge, status: lessons.status, steps: lessons.steps, curriculum: lessons.curriculum, sources: lessons.sources }).from(lessons);
  const subjects = SUBJECTS.map((s) => {
    const mine = rows.filter((r) => r.subject === s.key);
    const published = mine.filter((r) => r.status === 'published');
    return { key: s.key, section: s.section, name: s.name, total: mine.length, published: published.length, byAge: Object.fromEntries(AGES.map((a) => [a, published.filter((r) => r.recommendedAge === a).length])), withDidYouKnow: published.filter((r) => r.steps.some((st: LessonStep) => st.kind === 'didYouKnow' && st.fact?.source?.url)).length, verifiedMappings: mine.reduce((n, r) => n + r.curriculum.filter((m: CurriculumMapping) => m.verificationStatus === 'verified').length, 0), pendingMappings: mine.reduce((n, r) => n + r.curriculum.filter((m: CurriculumMapping) => m.verificationStatus === 'pending_review').length, 0) };
  });
  return {
    total: rows.length,
    published: rows.filter((r) => r.status === 'published').length,
    byStatus: { draft: rows.filter((r) => r.status === 'draft').length, in_review: rows.filter((r) => r.status === 'in_review').length, published: rows.filter((r) => r.status === 'published').length, archived: rows.filter((r) => r.status === 'archived').length },
    bySection: Object.fromEntries(SECTIONS.map((s) => [s.key, rows.filter((r) => r.section === s.key && r.status === 'published').length])),
    didYouKnowCoverage: rows.filter((r) => r.status === 'published').length ? Math.round((rows.filter((r) => r.status === 'published' && r.steps.some((st: LessonStep) => st.kind === 'didYouKnow' && st.fact?.source?.url)).length / rows.filter((r) => r.status === 'published').length) * 100) : 0,
    subjects,
  };
}

export { isNotNull };
