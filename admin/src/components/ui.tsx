'use client';

import { useState } from 'react';
import { fmtNumber } from '@/lib/format';

export function PageHead({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="row">{actions}</div>}
    </div>
  );
}

export function Kpi({ label, value, sub }: { label: string; value: number | string | null | undefined; sub?: string }) {
  return (
    <div className="kpi">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{typeof value === 'number' || value == null ? fmtNumber(value as number | null) : value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}

const STATUS_TONE: Record<string, string> = {
  active: 'badge-good',
  published: 'badge-good',
  approved: 'badge-info',
  completed: 'badge-good',
  needs_review: 'badge-warn',
  draft: 'badge-warn',
  queued: '',
  generating: 'badge-purple',
  validating: 'badge-purple',
  generated: 'badge-purple',
  rejected: 'badge-danger',
  failed: 'badge-danger',
  archived: '',
  cancelled: '',
};

/** Status names shown uppercase (NEEDS_REVIEW) as in the exam-team spec;
 * the colour is a second cue, never the only one. */
export function StatusBadge({ status }: { status: string }) {
  return <span className={`badge ${STATUS_TONE[status] ?? ''}`}>{status.toUpperCase()}</span>;
}

export function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const tone = difficulty === 'easy' ? 'badge-good' : difficulty === 'hard' ? 'badge-danger' : 'badge-warn';
  return <span className={`badge ${tone}`}>{difficulty}</span>;
}

export function Money({ value }: { value: string | number | null | undefined }) {
  if (value === null || value === undefined) return <>—</>;
  const n = Number(value);
  return <>${n < 1 && n > 0 ? n.toFixed(4) : n.toFixed(2)}</>;
}

/** Stacked bar of where a job's questions ended up. */
export function OutcomeBar({ approved, review, rejected, requested }: { approved: number; review: number; rejected: number; requested: number }) {
  const pct = (n: number) => `${requested ? (n / requested) * 100 : 0}%`;
  return (
    <div
      className="progress"
      role="img"
      aria-label={`${approved} approved, ${review} need review, ${rejected} rejected of ${requested}`}
    >
      <span className="p-approved" style={{ width: pct(approved) }} />
      <span className="p-review" style={{ width: pct(review) }} />
      <span className="p-rejected" style={{ width: pct(rejected) }} />
    </div>
  );
}

export function Loading({ what = 'Loading…' }: { what?: string }) {
  return <div className="card empty">{what}</div>;
}

export function ErrorAlert({ error }: { error: string | null | undefined }) {
  if (!error) return null;
  return (
    <div className="alert alert-error" role="alert">
      {error}
    </div>
  );
}

export function OkAlert({ message }: { message: string | null | undefined }) {
  if (!message) return null;
  return (
    <div className="alert alert-ok" role="status">
      {message}
    </div>
  );
}

export function Pager({
  page,
  pageSize,
  total,
  onPage,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (p: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="pager">
      <span className="small muted">
        {total === 0 ? 'No results' : `${(page - 1) * pageSize + 1}–${Math.min(total, page * pageSize)} of ${fmtNumber(total)}`}
      </span>
      <div className="row">
        <button className="btn btn-sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </button>
        <span className="small">
          Page {page} of {pages}
        </span>
        <button className="btn btn-sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          Next
        </button>
      </div>
    </div>
  );
}

// Destructive actions always confirm first.
export function ConfirmButton({
  label,
  confirm,
  onConfirm,
  className = 'btn btn-sm btn-danger',
  disabled,
}: {
  label: string;
  confirm: string;
  onConfirm: () => Promise<void> | void;
  className?: string;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      className={className}
      disabled={disabled || busy}
      onClick={async () => {
        if (!window.confirm(confirm)) return;
        setBusy(true);
        try {
          await onConfirm();
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? 'Working…' : label}
    </button>
  );
}

export function Forbidden() {
  return (
    <div className="card empty">
      <h2>No access</h2>
      <p>Your role doesn’t include this section. Ask a Super Admin if you need it.</p>
    </div>
  );
}

/** SVG figure from the figure engine, shown as an <img> (scripts can never run). */
export function FigureImg({ svg, alt, maxWidth = 560 }: { svg: string; alt: string; maxWidth?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`}
      alt={alt}
      style={{ maxWidth, width: '100%', height: 'auto', display: 'block', background: '#fff' }}
    />
  );
}
