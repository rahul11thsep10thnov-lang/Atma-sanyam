'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useCan } from '@/components/ConsoleShell';
import { useQuestionActions, type Action } from '@/components/QuestionActions';
import { QuestionEditor } from '@/components/QuestionEditor';
import { DuplicatePanel, QuestionBody, QuestionMeta, ValidationPanel } from '@/components/QuestionView';
import { ErrorAlert, Forbidden, Loading, OkAlert, PageHead } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import type { Paged, QuestionDetail, QuestionRow } from '@/lib/types';

export default function ReviewPage() {
  return (
    <Suspense>
      <ReviewQueue />
    </Suspense>
  );
}

function ReviewQueue() {
  const can = useCan();
  const params = useSearchParams();
  const jobId = params.get('jobId') ?? undefined;
  const examId = params.get('examId') ?? undefined;
  const actions = useQuestionActions();
  const [queue, setQueue] = useState<string[] | null>(null);
  const [total, setTotal] = useState(0);
  const [index, setIndex] = useState(0);
  const [loaded, setQ] = useState<QuestionDetail | null>(null);
  const [editing, setEditing] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(0);
  const busy = useRef(false);

  const loadQueue = useCallback(async () => {
    try {
      // Oldest first, so nothing waits forever.
      const res = await api<Paged<QuestionRow>>('questions', {
        query: { status: 'needs_review,draft', jobId, examId, order: 'oldest', pageSize: 100 },
      });
      setQueue(res.items.map((i) => i.id));
      setTotal(res.total);
      setIndex(0);
    } catch (e) {
      setErr(errorMessage(e));
    }
  }, [jobId, examId]);

  useEffect(() => {
    // Load the queue when the page (or its job/exam filter) opens.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadQueue();
  }, [loadQueue]);

  const currentId = queue?.[index];
  // Only show the loaded question while it is still the current one.
  const q = loaded && loaded.id === currentId ? loaded : null;
  useEffect(() => {
    if (!currentId) return;
    let alive = true;
    api<QuestionDetail>(`questions/${currentId}`)
      .then((d) => alive && setQ(d))
      .catch((e) => alive && setErr(errorMessage(e)));
    return () => {
      alive = false;
    };
  }, [currentId]);

  const act = useCallback(
    async (a: Action | 'approve_publish') => {
      if (!q || busy.current) return;
      busy.current = true;
      setErr(null);
      try {
        const steps: Action[] = a === 'approve_publish' ? ['approve', 'publish'] : [a];
        for (const step of steps) {
          const current = step === 'publish' ? { ...q, status: 'approved' as const } : q;
          const r = await actions.run(current, step);
          if (!r.ok) {
            if (r.message) setErr(r.message);
            return;
          }
          setMsg(r.message);
        }
        // Remove from the queue; the next question slides into place.
        setDone((d) => d + 1);
        const next = (queue ?? []).filter((id) => id !== q.id);
        setQueue(next);
        setIndex((i) => Math.min(i, Math.max(0, next.length - 1)));
        setTotal((t) => Math.max(0, t - 1));
        if (next.length === 0) void loadQueue();
      } finally {
        busy.current = false;
      }
    },
    [q, queue, actions, loadQueue]
  );

  // Keyboard shortcuts (ignored while typing or editing).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (editing || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement;
      if (t.closest('input, textarea, select, [contenteditable]')) return;
      const k = e.key.toLowerCase();
      if (k === 'a' && can('questions:review')) void act('approve');
      else if (k === 'p' && can('questions:publish') && can('questions:review')) void act('approve_publish');
      else if (k === 'r' && can('questions:review')) void act('reject');
      else if (k === 'x' && can('questions:write')) void act('archive');
      else if (k === 'e' && can('questions:write')) setEditing(true);
      else if (k === 'j' || e.key === 'ArrowRight') setIndex((i) => Math.min(i + 1, (queue?.length ?? 1) - 1));
      else if (k === 'k' || e.key === 'ArrowLeft') setIndex((i) => Math.max(0, i - 1));
      else return;
      e.preventDefault();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [act, can, editing, queue]);

  if (!can('questions:review')) return <Forbidden />;

  return (
    <>
      <PageHead
        title="Review Questions"
        subtitle={
          queue === null
            ? 'Loading the queue…'
            : `${total} waiting${jobId ? ' from this job' : ''} · ${done} reviewed this session`
        }
        actions={
          jobId && (
            <Link className="btn" href={`/generate/${jobId}`}>
              ← Back to job
            </Link>
          )
        }
      />
      <OkAlert message={msg} />
      <ErrorAlert error={err} />
      {queue !== null && queue.length === 0 ? (
        <div className="card empty">
          <h2>All caught up 🎉</h2>
          <p>No questions are waiting for review.</p>
          <Link className="btn btn-primary" href="/questions?status=approved">
            Publish approved questions
          </Link>
        </div>
      ) : !q ? (
        <Loading />
      ) : (
        <div className="review-grid">
          <div className="stack">
            <div className="card">
              <div className="row small muted" style={{ marginBottom: 10 }}>
                Question {index + 1} of {queue?.length}
                {total > (queue?.length ?? 0) && ` (next ${queue?.length} of ${total})`}
                <span className="spacer" />
                <Link href={`/questions/${q.id}`}>Open full page</Link>
              </div>
              {editing ? (
                <QuestionEditor
                  initial={q}
                  onSaved={(saved) => {
                    setQ(saved);
                    setEditing(false);
                    setMsg('Saved and re-checked. Approve when it looks right.');
                  }}
                  onCancel={() => setEditing(false)}
                />
              ) : (
                <QuestionBody q={q} />
              )}
              {!editing && (
                <div className="sticky-actions row">
                  {can('questions:write') && (
                    <button className="btn" onClick={() => setEditing(true)}>
                      Edit <span className="kbd">E</span>
                    </button>
                  )}
                  <button className="btn btn-good" disabled={actions.hasErrors(q)} onClick={() => act('approve')}>
                    Approve <span className="kbd">A</span>
                  </button>
                  {can('questions:publish') && !actions.hasErrors(q) && (
                    <button className="btn btn-primary" onClick={() => act('approve_publish')}>
                      Approve & publish <span className="kbd">P</span>
                    </button>
                  )}
                  <button className="btn btn-danger" onClick={() => act('reject')}>
                    Reject <span className="kbd">R</span>
                  </button>
                  {can('questions:write') && (
                    <button className="btn" onClick={() => act('archive')}>
                      Archive <span className="kbd">X</span>
                    </button>
                  )}
                  <span className="spacer" />
                  <button className="btn btn-sm" disabled={index === 0} onClick={() => setIndex(index - 1)} aria-label="Previous question">
                    ← <span className="kbd">K</span>
                  </button>
                  <button
                    className="btn btn-sm"
                    disabled={index >= (queue?.length ?? 1) - 1}
                    onClick={() => setIndex(index + 1)}
                    aria-label="Skip to next question"
                  >
                    Skip <span className="kbd">J</span> →
                  </button>
                </div>
              )}
            </div>
            <DuplicatePanel q={q} />
          </div>
          <div className="stack">
            <div className="card">
              <ValidationPanel q={q} />
            </div>
            <div className="card">
              <QuestionMeta q={q} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
