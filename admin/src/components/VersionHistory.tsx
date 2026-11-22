'use client';

import { useState } from 'react';
import { api, errorMessage, useApi } from '@/lib/api';
import { ErrorAlert, Loading } from '@/components/ui';
import { fmtDate } from '@/lib/format';

interface Revision {
  version: number;
  changeKind: 'edit' | 'restore' | 'bulk_edit';
  changeSummary: string | null;
  replacedAt: string;
  snapshot: {
    questionText: string;
    correctOption: string;
    difficulty: string;
    explanation: string | null;
    sourceName: string | null;
    options: { label: string; text: string }[];
  };
}

const KIND: Record<Revision['changeKind'], string> = { edit: 'Edited', restore: 'Restored', bulk_edit: 'Bulk edit' };

/** Earlier versions of a question (kept unchanged forever) with restore. */
export function VersionHistory({ id, canWrite, onRestored }: { id: string; canWrite: boolean; onRestored: () => void }) {
  const { data, error, reload } = useApi<{ currentVersion: number; revisions: Revision[] }>(`questions/${id}/revisions`);
  const [open, setOpen] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  if (!data) return error ? <ErrorAlert error={error} /> : <Loading />;

  async function restore(v: number) {
    if (!window.confirm(`Make version ${v} current again? It is saved as a new version; nothing is deleted.`)) return;
    setErr(null);
    try {
      await api(`questions/${id}/revisions/${v}/restore`, { method: 'POST' });
      await reload();
      onRestored();
    } catch (e) {
      setErr(errorMessage(e));
    }
  }

  return (
    <div>
      <h3 style={{ marginBottom: 4 }}>Versions</h3>
      <p className="small muted" style={{ marginBottom: 8 }}>
        Current: v{data.currentVersion}. Results of tests always show the version the student was served.
      </p>
      <ErrorAlert error={err} />
      {data.revisions.length === 0 && <p className="small muted">No earlier versions.</p>}
      <div className="stack" style={{ gap: 6 }}>
        {data.revisions.map((r) => (
          <div key={r.version} className="small" style={{ borderTop: '1px solid var(--border, #e5e7eb)', paddingTop: 6 }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <button className="btn btn-sm" onClick={() => setOpen(open === r.version ? null : r.version)}>
                v{r.version} {open === r.version ? '▴' : '▾'}
              </button>
              <span className="muted">
                {KIND[r.changeKind]} {fmtDate(r.replacedAt)}
              </span>
            </div>
            {r.changeSummary && <p className="muted" style={{ marginTop: 4 }}>{r.changeSummary}</p>}
            {open === r.version && (
              <div style={{ marginTop: 6 }}>
                <p>{r.snapshot.questionText}</p>
                <ul style={{ margin: '4px 0 4px 18px' }}>
                  {r.snapshot.options.map((o) => (
                    <li key={o.label}>
                      <strong>{o.label}.</strong> {o.text} {o.label === r.snapshot.correctOption && '✓'}
                    </li>
                  ))}
                </ul>
                <p className="muted">
                  Difficulty: {r.snapshot.difficulty}
                  {r.snapshot.sourceName ? ` · Source: ${r.snapshot.sourceName}` : ''}
                </p>
                {canWrite && (
                  <button className="btn btn-sm" style={{ marginTop: 6 }} onClick={() => restore(r.version)}>
                    Restore this version
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
