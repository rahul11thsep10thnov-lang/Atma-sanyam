'use client';

import { api, errorMessage } from '@/lib/api';
import type { QuestionDetail } from '@/lib/types';
import { useCan } from './ConsoleShell';

export type Action = 'approve' | 'reject' | 'publish' | 'unpublish' | 'archive' | 'restore';

const FROM: Record<Action, string[]> = {
  approve: ['draft', 'generated', 'needs_review', 'rejected'],
  reject: ['draft', 'generated', 'validating', 'needs_review', 'approved', 'published'],
  publish: ['approved'],
  unpublish: ['published'],
  archive: ['draft', 'generated', 'validating', 'needs_review', 'approved', 'rejected', 'published'],
  restore: ['archived'],
};
const PERMISSION: Record<Action, string> = {
  approve: 'questions:review',
  reject: 'questions:review',
  publish: 'questions:publish',
  unpublish: 'questions:publish',
  archive: 'questions:write',
  restore: 'questions:write',
};

const DONE: Record<Action, string> = {
  approve: 'Approved.',
  reject: 'Rejected.',
  publish: 'Published — it can now appear in mock tests.',
  unpublish: 'Unpublished.',
  archive: 'Archived.',
  restore: 'Restored to NEEDS_REVIEW.',
};

export function useQuestionActions() {
  const can = useCan();
  const hasErrors = (q: QuestionDetail) => q.validationIssues.some((i) => i.severity === 'error');
  // Questions with blocking errors must be edited before approval/publishing
  // (the API refuses it anyway; hiding the button avoids a dead end).
  const available = (q: QuestionDetail, a: Action) =>
    FROM[a].includes(q.status) && can(PERMISSION[a]) && !((a === 'approve' || a === 'publish') && hasErrors(q));
  async function run(q: QuestionDetail, a: Action): Promise<{ ok: boolean; message: string }> {
    let notes: string | undefined;
    if (a === 'reject') {
      const reason = window.prompt('Why is this question rejected? (optional, saved with the review)');
      if (reason === null) return { ok: false, message: '' };
      notes = reason || undefined;
    }
    if (a === 'archive' && !window.confirm('Archive this question? It leaves the bank but stays in history.')) return { ok: false, message: '' };
    try {
      await api(`questions/${q.id}/${a}`, { method: 'POST', body: notes ? { notes } : {} });
      return { ok: true, message: DONE[a] };
    } catch (e) {
      return { ok: false, message: errorMessage(e) };
    }
  }
  return { available, run, hasErrors };
}
