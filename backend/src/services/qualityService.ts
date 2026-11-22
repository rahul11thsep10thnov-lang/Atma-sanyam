import { sql, type SQL } from 'drizzle-orm';
import type { Db } from '../database/client.js';
import { rowsOf } from '../database/client.js';

// ---------------------------------------------------------------------------
// Question quality and performance. Content checks need no data; statistical
// flags are raised only when a question has at least `minSample` answers from
// finished attempts, so a handful of students cannot mark a question bad.
// ---------------------------------------------------------------------------

export const QUALITY_FLAGS = {
  too_easy: 'Almost everyone answers correctly (≥ 95%).',
  too_hard: 'Very few answer correctly (≤ 15%).',
  key_suspect: 'A wrong option is chosen more often than the keyed answer — check the answer key.',
  dead_distractor: 'An option is almost never chosen (< 2%) — a weak distractor.',
  high_skip: 'Half or more of the students who saw it skipped it.',
} as const;
export type QualityFlag = keyof typeof QUALITY_FLAGS;

export interface QuestionPerformance {
  questionId: string;
  questionText: string;
  status: string;
  difficulty: string;
  subjectName: string;
  chapterName: string;
  correctOption: string;
  served: number;
  answered: number;
  correct: number;
  accuracy: number | null;
  skipRate: number | null;
  avgSeconds: number | null;
  optionCounts: Record<string, number>;
  flags: QualityFlag[];
}

export function flagsFor(p: Pick<QuestionPerformance, 'served' | 'answered' | 'correct' | 'correctOption' | 'optionCounts'>, minSample: number): QualityFlag[] {
  if (p.answered < minSample) return [];
  const flags: QualityFlag[] = [];
  const acc = p.correct / p.answered;
  if (acc >= 0.95) flags.push('too_easy');
  if (acc <= 0.15) flags.push('too_hard');
  const keyed = p.optionCounts[p.correctOption] ?? 0;
  const wrong = Object.entries(p.optionCounts).filter(([l]) => l !== p.correctOption);
  if (wrong.some(([, n]) => n > keyed)) flags.push('key_suspect');
  if (wrong.some(([, n]) => n / p.answered < 0.02)) flags.push('dead_distractor');
  if (p.served > 0 && (p.served - p.answered) / p.served >= 0.5) flags.push('high_skip');
  return flags;
}

export interface QualityFilters {
  examId?: string;
  subjectId?: string;
  chapterId?: string;
  minSample: number;
  flag?: QualityFlag;
  limit: number;
}

export async function questionQuality(db: Db, f: QualityFilters) {
  const where: SQL[] = [sql`q.status <> 'archived'`];
  if (f.examId) where.push(sql`q.exam_id = ${f.examId}`);
  if (f.subjectId) where.push(sql`q.subject_id = ${f.subjectId}`);
  if (f.chapterId) where.push(sql`q.chapter_id = ${f.chapterId}`);
  const scope = sql.join(where, sql` and `);

  // Content health of the bank in scope.
  const [content] = rowsOf<Record<string, string | number>>(
    await db.execute(sql`
      select
        count(*) as total,
        count(*) filter (where q.status = 'published') as published,
        count(*) filter (where q.status in ('needs_review','generated','draft')) as awaiting_review,
        count(*) filter (where coalesce(trim(q.explanation), '') = '') as missing_explanation,
        count(*) filter (where q.source_name is null and q.source_reference is null and q.source_material_id is null) as missing_source,
        count(*) filter (where q.duplicate_of_id is not null) as possible_duplicates,
        count(*) filter (where q.valid_as_of is not null and q.valid_as_of < (current_date - interval '2 years')) as stale_facts,
        count(*) filter (where q.difficulty = 'easy') as easy,
        count(*) filter (where q.difficulty = 'medium') as medium,
        count(*) filter (where q.difficulty = 'hard') as hard
      from questions q where ${scope}`)
  );

  // Per-question answers from finished attempts only.
  const perf = rowsOf<{
    question_id: string;
    question_text: string;
    status: string;
    difficulty: string;
    subject_name: string;
    chapter_name: string;
    correct_option: string;
    served: string | number;
    answered: string | number;
    correct: string | number;
    avg_seconds: string | number | null;
    option_counts: Record<string, number> | string | null;
  }>(
    await db.execute(sql`
      with a as (
        select ta.question_id, ta.selected_option, ta.is_correct, ta.time_spent_seconds
        from test_answers ta
        join test_attempts t on t.id = ta.attempt_id
        where t.status in ('submitted','auto_submitted')
      ), agg as (
        select question_id,
          count(*) as served,
          count(*) filter (where selected_option is not null) as answered,
          count(*) filter (where is_correct) as correct,
          avg(time_spent_seconds) filter (where selected_option is not null and time_spent_seconds > 0) as avg_seconds
        from a group by question_id
      ), opts as (
        select question_id, jsonb_object_agg(selected_option, n) as option_counts
        from (select question_id, selected_option, count(*) as n from a where selected_option is not null group by 1, 2) x
        group by question_id
      )
      select q.id as question_id, q.question_text, q.status, q.difficulty, s.name as subject_name, c.name as chapter_name,
        q.correct_option, agg.served, agg.answered, agg.correct, agg.avg_seconds, opts.option_counts
      from agg
      join questions q on q.id = agg.question_id
      join subjects s on s.id = q.subject_id
      join chapters c on c.id = q.chapter_id
      left join opts on opts.question_id = q.id
      where ${scope}
      order by agg.answered desc
      limit 5000`)
  );

  const optionLabels = async (ids: string[]) => {
    if (!ids.length) return new Map<string, string[]>();
    const rows = rowsOf<{ question_id: string; label: string }>(
      await db.execute(sql`select question_id, label from question_options where question_id in (${sql.join(ids.map((i) => sql`${i}`), sql`, `)})`)
    );
    const m = new Map<string, string[]>();
    for (const r of rows) m.set(r.question_id, [...(m.get(r.question_id) ?? []), r.label]);
    return m;
  };
  const labels = await optionLabels(perf.map((p) => p.question_id));

  const items: QuestionPerformance[] = perf.map((r) => {
    const raw = typeof r.option_counts === 'string' ? (JSON.parse(r.option_counts) as Record<string, number>) : (r.option_counts ?? {});
    // Options never chosen count as zero (they matter for weak distractors).
    const optionCounts: Record<string, number> = {};
    for (const l of labels.get(r.question_id) ?? Object.keys(raw)) optionCounts[l] = Number(raw[l] ?? 0);
    const served = Number(r.served);
    const answered = Number(r.answered);
    const correct = Number(r.correct);
    const base = { served, answered, correct, correctOption: r.correct_option, optionCounts };
    return {
      questionId: r.question_id,
      questionText: r.question_text,
      status: r.status,
      difficulty: r.difficulty,
      subjectName: r.subject_name,
      chapterName: r.chapter_name,
      ...base,
      accuracy: answered ? Math.round((correct / answered) * 1000) / 10 : null,
      skipRate: served ? Math.round(((served - answered) / served) * 1000) / 10 : null,
      avgSeconds: r.avg_seconds == null ? null : Math.round(Number(r.avg_seconds)),
      flags: flagsFor(base, f.minSample),
    };
  });

  const flagCounts = Object.fromEntries(Object.keys(QUALITY_FLAGS).map((k) => [k, items.filter((i) => i.flags.includes(k as QualityFlag)).length]));
  const flagged = items.filter((i) => (f.flag ? i.flags.includes(f.flag) : i.flags.length > 0));
  const num = (k: string) => Number(content?.[k] ?? 0);
  return {
    minSample: f.minSample,
    content: {
      total: num('total'),
      published: num('published'),
      awaitingReview: num('awaiting_review'),
      missingExplanation: num('missing_explanation'),
      missingSource: num('missing_source'),
      possibleDuplicates: num('possible_duplicates'),
      staleFacts: num('stale_facts'),
      difficulty: { easy: num('easy'), medium: num('medium'), hard: num('hard') },
    },
    performance: {
      questionsWithAnswers: items.length,
      questionsWithEnoughData: items.filter((i) => i.answered >= f.minSample).length,
      flagCounts,
    },
    flagDescriptions: QUALITY_FLAGS,
    items: flagged.slice(0, f.limit),
  };
}
