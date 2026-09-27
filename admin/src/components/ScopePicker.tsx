'use client';

import type { ExamNode } from '@/lib/types';

export interface Scope {
  examId: string;
  subjectId: string;
  chapterId: string;
  topicId: string;
}

export const EMPTY_SCOPE: Scope = { examId: '', subjectId: '', chapterId: '', topicId: '' };

/** Cascading Exam → Subject → Chapter → Topic selects. Changing a level
 * clears the levels below it. */
export function ScopePicker({
  tree,
  value,
  onChange,
  required = 'chapter',
  labels = true,
  anyLabel = 'Any',
}: {
  tree: ExamNode[];
  value: Scope;
  onChange: (s: Scope) => void;
  required?: 'none' | 'exam' | 'chapter';
  labels?: boolean;
  anyLabel?: string;
}) {
  const exam = tree.find((e) => e.id === value.examId);
  const subject = exam?.subjects.find((s) => s.id === value.subjectId);
  const chapter = subject?.chapters.find((c) => c.id === value.chapterId);
  const need = (level: 'exam' | 'subject' | 'chapter') =>
    required === 'chapter' || (required === 'exam' && level === 'exam');

  const field = (label: string, el: React.ReactNode) =>
    labels ? (
      <label className="field">
        <span>{label}</span>
        {el}
      </label>
    ) : (
      el
    );

  return (
    <>
      {field(
        'Exam',
        <select
          className="input"
          aria-label="Exam"
          required={need('exam')}
          value={value.examId}
          onChange={(e) => onChange({ ...EMPTY_SCOPE, examId: e.target.value })}
        >
          <option value="">{need('exam') ? 'Choose exam…' : `${anyLabel} exam`}</option>
          {tree.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
      )}
      {field(
        'Subject',
        <select
          className="input"
          aria-label="Subject"
          required={need('subject')}
          disabled={!exam}
          value={value.subjectId}
          onChange={(e) => onChange({ ...value, subjectId: e.target.value, chapterId: '', topicId: '' })}
        >
          <option value="">{need('subject') ? 'Choose subject…' : `${anyLabel} subject`}</option>
          {exam?.subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      )}
      {field(
        'Chapter',
        <select
          className="input"
          aria-label="Chapter"
          required={need('chapter')}
          disabled={!subject}
          value={value.chapterId}
          onChange={(e) => onChange({ ...value, chapterId: e.target.value, topicId: '' })}
        >
          <option value="">{need('chapter') ? 'Choose chapter…' : `${anyLabel} chapter`}</option>
          {subject?.chapters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.questionCounts.published} published)
            </option>
          ))}
        </select>
      )}
      {field(
        'Topic',
        <select
          className="input"
          aria-label="Topic"
          disabled={!chapter || chapter.topics.length === 0}
          value={value.topicId}
          onChange={(e) => onChange({ ...value, topicId: e.target.value })}
        >
          <option value="">{chapter && chapter.topics.length === 0 ? 'No topics (whole chapter)' : 'Whole chapter'}</option>
          {chapter?.topics.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      )}
    </>
  );
}
