'use client';

import Link from 'next/link';
import { AlertTriangle, Bot, CheckCircle2, CircleX, Copy, ShieldCheck, UserCheck } from 'lucide-react';
import type { QuestionDetail, Review } from '@/lib/types';
import { fmtDate } from '@/lib/format';
import { languageName } from '@/lib/useTaxonomy';
import { DifficultyBadge, FigureImg, StatusBadge } from './ui';

/** The question as a candidate would see it, with the key marked. */
export function QuestionBody({ q }: { q: QuestionDetail }) {
  return (
    <>
      <div className="qbox qtext">{q.questionText}</div>
      {q.figureSvg && (
        <div style={{ margin: '10px 0', overflowX: 'auto' }}>
          <FigureImg svg={q.figureSvg} alt="Question figure" maxWidth={720} />
        </div>
      )}
      <div className="option-list">
        {q.options.map((o) => {
          const correct = o.label === q.correctOption;
          return (
            <div key={o.label} className={`option ${correct ? 'correct' : ''}`}>
              <span className="letter">{o.label}</span>
              <span style={{ flex: 1 }}>{o.svg ? <FigureImg svg={o.svg} alt={`Option ${o.label}`} maxWidth={150} /> : o.text}</span>
              {correct && (
                <span className="badge badge-good" style={{ flexShrink: 0 }}>
                  Correct answer
                </span>
              )}
            </div>
          );
        })}
      </div>
      <h3 style={{ margin: '14px 0 6px' }}>Explanation</h3>
      <p style={{ marginTop: 0, whiteSpace: 'pre-wrap' }}>{q.explanation || <span className="muted">No explanation.</span>}</p>
      {q.computation && (
        <p className="small muted" style={{ margin: 0 }}>
          Calculation checked by program: <code>{q.computation}</code>
        </p>
      )}
    </>
  );
}

export function QuestionMeta({ q }: { q: QuestionDetail }) {
  return (
    <dl className="meta-grid">
      <dt>Status</dt>
      <dd>
        <StatusBadge status={q.status} />
      </dd>
      <dt>Exam</dt>
      <dd>{q.examName}</dd>
      <dt>Subject</dt>
      <dd>{q.subjectName}</dd>
      <dt>Chapter</dt>
      <dd>{q.chapterName}</dd>
      <dt>Topic</dt>
      <dd>{q.topicName ?? '—'}</dd>
      <dt>Difficulty</dt>
      <dd>
        <DifficultyBadge difficulty={q.difficulty} />
      </dd>
      <dt>Language</dt>
      <dd>{languageName(q.language)}</dd>
      <dt>Source</dt>
      <dd>
        {q.source}
        {q.generationJobId && (
          <>
            {' '}
            · <Link href={`/generate/${q.generationJobId}`}>job</Link>
          </>
        )}
      </dd>
      <dt>Reference</dt>
      <dd>{[q.sourceName, q.sourceReference].filter(Boolean).join(' — ') || '—'}</dd>
      {q.validAsOf && (
        <>
          <dt>Correct as of</dt>
          <dd>{q.validAsOf}</dd>
        </>
      )}
      <dt>In mock tests</dt>
      <dd>{q.usedInMockTests}</dd>
      <dt>Accuracy</dt>
      <dd>{q.stats.accuracy === null ? 'no attempts yet' : `${Math.round(q.stats.accuracy * 100)}% of ${q.stats.attempts} answers`}</dd>
    </dl>
  );
}

export function ValidationPanel({ q }: { q: QuestionDetail }) {
  const ai = q.reviews.find((r) => r.reviewerType === 'ai');
  return (
    <>
      <h3 style={{ marginBottom: 8 }} className="row">
        <ShieldCheck size={16} aria-hidden /> Automated checks
      </h3>
      {q.validationIssues.length === 0 ? (
        <p className="small" style={{ color: 'var(--good)', marginTop: 0 }}>
          ✓ All 16 validation rules passed.
        </p>
      ) : (
        <div>
          {q.validationIssues.map((i, k) => (
            <div key={k} className="issue">
              {i.severity === 'error' ? (
                <CircleX size={16} color="var(--danger)" aria-label="Error" />
              ) : (
                <AlertTriangle size={16} color="var(--warn)" aria-label="Warning" />
              )}
              <div>
                <strong className="small">{i.code.replace(/_/g, ' ')}</strong>
                <div className="small muted">{i.message}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      {ai && <AiVerdict review={ai} />}
    </>
  );
}

function Flag({ ok, label }: { ok: boolean | null; label: string }) {
  if (ok === null) return null;
  return (
    <span className={`badge ${ok ? 'badge-good' : 'badge-danger'}`}>
      {ok ? '✓' : '✗'} {label}
    </span>
  );
}

export function AiVerdict({ review }: { review: Review }) {
  return (
    <div style={{ marginTop: 14 }}>
      <h3 style={{ marginBottom: 8 }} className="row">
        <Bot size={16} aria-hidden /> AI reviewer {review.model ? <span className="small muted">({review.model})</span> : null}
      </h3>
      <div className="row" style={{ marginBottom: 8 }}>
        <StatusBadge status={review.decision} />
        <Flag ok={review.valid} label="valid" />
        <Flag ok={review.correctAnswerVerified} label="answer verified" />
        <Flag ok={review.explanationVerified} label="explanation verified" />
        <Flag ok={review.difficultyAppropriate} label="difficulty fits" />
        {review.duplicateProbability !== null && (
          <span className="badge">duplicate {Math.round((review.duplicateProbability ?? 0) * 100)}%</span>
        )}
      </div>
      {review.issues.length > 0 && (
        <ul className="small" style={{ margin: '0 0 6px', paddingLeft: 18 }}>
          {review.issues.map((i, k) => (
            <li key={k}>{typeof i === 'string' ? i : i.message}</li>
          ))}
        </ul>
      )}
      {review.notes && <p className="small muted" style={{ margin: 0 }}>{review.notes}</p>}
      <p className="small muted" style={{ margin: '6px 0 0' }}>
        AI review helps triage; it does not replace a human check.
      </p>
    </div>
  );
}

export function DuplicatePanel({ q }: { q: QuestionDetail }) {
  if (!q.duplicateOf) return null;
  return (
    <div className="card" style={{ borderColor: 'color-mix(in srgb, var(--warn) 50%, transparent)' }}>
      <h3 className="row" style={{ marginBottom: 8 }}>
        <Copy size={16} aria-hidden /> POSSIBLE DUPLICATE
        <span className="badge badge-warn">similarity {Math.round((q.duplicateScore ?? 0) * 100)}%</span>
      </h3>
      <p className="small muted" style={{ marginTop: 0 }}>
        Looks like an existing question (<StatusBadge status={q.duplicateOf.status} />). Nothing is deleted automatically — keep both,
        edit this one, or reject it.
      </p>
      <div className="qbox" style={{ background: 'var(--surface-2)', borderLeftColor: 'var(--warn)' }}>
        <Link href={`/questions/${q.duplicateOf.id}`} style={{ color: 'var(--text)' }}>
          {q.duplicateOf.questionText}
        </Link>
        <div className="small muted" style={{ marginTop: 6 }}>
          {q.duplicateOf.options.join(' · ')}
        </div>
      </div>
    </div>
  );
}

export function ReviewHistory({ reviews }: { reviews: Review[] }) {
  if (!reviews.length) return null;
  return (
    <div>
      {reviews.map((r) => (
        <div key={r.id} className="issue">
          {r.reviewerType === 'human' ? (
            <UserCheck size={16} aria-hidden />
          ) : r.reviewerType === 'ai' ? (
            <Bot size={16} aria-hidden />
          ) : (
            <CheckCircle2 size={16} aria-hidden />
          )}
          <div>
            <strong className="small">
              {r.reviewerType} · {r.decision.toUpperCase()}
            </strong>
            <div className="small muted">
              {fmtDate(r.createdAt)}
              {r.notes ? ` — ${r.notes}` : ''}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
