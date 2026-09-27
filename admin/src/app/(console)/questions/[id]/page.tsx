'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useCan } from '@/components/ConsoleShell';
import { useQuestionActions, type Action } from '@/components/QuestionActions';
import { QuestionEditor } from '@/components/QuestionEditor';
import { DuplicatePanel, QuestionBody, QuestionMeta, ReviewHistory, ValidationPanel } from '@/components/QuestionView';
import { ErrorAlert, Loading, OkAlert, PageHead } from '@/components/ui';
import { api, errorMessage, useApi } from '@/lib/api';
import type { QuestionDetail } from '@/lib/types';

const BUTTONS: { a: Action; label: string; cls: string }[] = [
  { a: 'approve', label: 'Approve', cls: 'btn btn-good' },
  { a: 'publish', label: 'Publish', cls: 'btn btn-primary' },
  { a: 'unpublish', label: 'Unpublish', cls: 'btn' },
  { a: 'reject', label: 'Reject', cls: 'btn btn-danger' },
  { a: 'archive', label: 'Archive', cls: 'btn' },
  { a: 'restore', label: 'Restore', cls: 'btn' },
];

export default function QuestionPage() {
  const { id } = useParams<{ id: string }>();
  const can = useCan();
  const router = useRouter();
  const { data: q, error, reload, setData } = useApi<QuestionDetail>(`questions/${id}`);
  const actions = useQuestionActions();
  const [editing, setEditing] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  if (!q) return error ? <ErrorAlert error={error} /> : <Loading />;

  async function act(a: Action) {
    setErr(null);
    const r = await actions.run(q!, a);
    if (r.ok) {
      setMsg(r.message);
      await reload();
    } else if (r.message) setErr(r.message);
  }

  async function hardDelete() {
    if (!window.confirm('Delete permanently? Only possible if the question was never used in a test.')) return;
    try {
      await api(`questions/${q!.id}`, { method: 'DELETE', query: { hard: 'true' } });
      router.push('/questions');
    } catch (e) {
      setErr(errorMessage(e));
    }
  }

  return (
    <>
      <PageHead
        title="Question"
        subtitle={`${q.examName} · ${q.subjectName} · ${q.chapterName}`}
        actions={
          <Link className="btn" href="/questions">
            ← Question Bank
          </Link>
        }
      />
      <OkAlert message={msg} />
      <ErrorAlert error={err} />
      <div className="review-grid">
        <div className="stack">
          <div className="card">
            {editing ? (
              <QuestionEditor
                initial={q}
                onSaved={(saved) => {
                  setData(saved);
                  setEditing(false);
                  setMsg('Saved. All checks were re-run.');
                }}
                onCancel={() => setEditing(false)}
              />
            ) : (
              <>
                <QuestionBody q={q} />
                {actions.hasErrors(q) && q.status !== 'archived' && (
                  <div className="alert alert-error" style={{ marginTop: 12 }}>
                    This question has validation errors, so it can’t be approved. Edit it to fix them, or leave it rejected.
                  </div>
                )}
                <div className="row" style={{ marginTop: 16 }}>
                  {can('questions:write') && q.status !== 'archived' && (
                    <button className="btn" onClick={() => setEditing(true)}>
                      Edit
                    </button>
                  )}
                  {BUTTONS.filter((b) => actions.available(q, b.a)).map((b) => (
                    <button key={b.a} className={b.cls} onClick={() => act(b.a)}>
                      {b.label}
                    </button>
                  ))}
                  <span className="spacer" />
                  {can('questions:write') && q.usedInMockTests === 0 && q.stats.attempts === 0 && (
                    <button className="btn btn-sm btn-danger" onClick={hardDelete}>
                      Delete permanently
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
          <DuplicatePanel q={q} />
        </div>
        <div className="stack">
          <div className="card">
            <QuestionMeta q={q} />
          </div>
          <div className="card">
            <ValidationPanel q={q} />
          </div>
          <div className="card">
            <h3 style={{ marginBottom: 8 }}>History</h3>
            <ReviewHistory reviews={q.reviews} />
          </div>
        </div>
      </div>
    </>
  );
}
