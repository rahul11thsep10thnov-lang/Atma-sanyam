'use client';

import { useState } from 'react';
import { api, errorMessage } from '@/lib/api';
import { fmtDate } from '@/lib/format';
import { STATUS_KEYS, WORKFLOW, sendBackPermission, statusLabel, type ContentReview, type ContentVersion, type DaduContentItem } from '@/lib/dadu';
import { useCan } from '@/components/ConsoleShell';
import { ConfirmButton, ErrorAlert, OkAlert } from '@/components/ui';
import { WorkflowLegend } from './WorkflowLegend';

export function ReviewPanel({ item, versions, reviews, onChanged }: { item: DaduContentItem; versions: ContentVersion[]; reviews: ContentReview[]; onChanged: () => Promise<void> | void }) {
  const can = useCan();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const idx = STATUS_KEYS.indexOf(item.status);
  const next = idx >= 0 && idx < WORKFLOW.length - 2 ? WORKFLOW[idx + 1] : null; // published is reached through /publish, not /transition
  const canNext = !!next && can(next.permission);
  const canSendBack = idx > 0 && item.status !== 'published' && (can(sendBackPermission(item.status)) || can('dadu:content:approve'));
  const canPublish = item.status === 'approved' && can('dadu:content:publish');
  const canUnpublish = item.status === 'published' && can('dadu:content:publish');

  async function run(label: string, fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      await fn();
      setOk(label);
      setNote('');
      await onChanged();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      <section className="card">
        <div className="card-head">
          <h2>Review workflow</h2>
          <span className="badge badge-info">{statusLabel(item.status)}</span>
        </div>
        <ErrorAlert error={error} />
        <OkAlert message={ok} />
        <label className="field">
          <span>Note for the next reviewer (required when sending back)</span>
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <div className="row">
          {next && (
            <button className="btn btn-primary btn-sm" disabled={!canNext || busy} title={canNext ? undefined : `Needs ${next.permission}`} onClick={() => run(`Moved to ${next.label}.`, () => api(`dadu/content/${item.id}/transition`, { method: 'POST', body: { to: next.key, note: note || undefined } }))}>
              Move to {next.label}
            </button>
          )}
          {idx > 0 && item.status !== 'published' && (
            <button className="btn btn-sm" disabled={!canSendBack || busy || !note.trim()} title={!note.trim() ? 'Write a note first' : undefined} onClick={() => run('Sent back to draft.', () => api(`dadu/content/${item.id}/transition`, { method: 'POST', body: { to: 'draft', note } }))}>
              Send back to draft
            </button>
          )}
          {item.status === 'approved' && (
            <ConfirmButton className="btn btn-primary btn-sm" label="Publish" disabled={!canPublish || busy} confirm={`Publish “${item.id}” version ${item.version} to every child's device at the next pack update?`} onConfirm={() => run('Published.', () => api(`dadu/content/${item.id}/publish`, { method: 'POST' }))} />
          )}
          {item.status === 'published' && (
            <ConfirmButton label="Unpublish" disabled={!canUnpublish || busy} confirm={`Unpublish “${item.id}”? It stops appearing in new packs; devices keep their last downloaded copy until they sync.`} onConfirm={() => run('Unpublished.', () => api(`dadu/content/${item.id}/unpublish`, { method: 'POST' }))} />
          )}
        </div>
        <p className="small muted" style={{ marginBottom: 0 }}>
          {item.rights === 'pending' ? 'Rights are pending: the server refuses to publish until a rights officer records them.' : 'Each move is recorded with who did it and when.'}
        </p>
      </section>

      <section className="card">
        <h2 style={{ marginBottom: 12 }}>Steps</h2>
        <WorkflowLegend current={item.status} />
      </section>

      <section className="card">
        <h2 style={{ marginBottom: 12 }}>Versions</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th className="num">#</th><th>Change note</th><th>Created</th><th>Published</th><th /></tr>
            </thead>
            <tbody>
              {versions.length === 0 && <tr><td colSpan={5} className="empty">No versions.</td></tr>}
              {versions.map((v) => (
                <tr key={v.version}>
                  <td className="num">{v.version}{v.version === item.version && <span className="small muted"> (current)</span>}</td>
                  <td className="small">{v.changeNote ?? '—'}</td>
                  <td className="small muted">{fmtDate(v.createdAt)}</td>
                  <td className="small muted">{v.publishedAt ? fmtDate(v.publishedAt) : '—'}</td>
                  <td>
                    {v.version !== item.version && can('dadu:content:write') && (
                      <ConfirmButton className="btn btn-sm" label="Roll back" disabled={busy} confirm={`Create a new draft version from version ${v.version}?`} onConfirm={() => run(`Rolled back to version ${v.version} as a new draft.`, () => api(`dadu/content/${item.id}/rollback`, { method: 'POST', body: { version: v.version } }))} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <h2 style={{ marginBottom: 12 }}>Review history</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th className="num">Ver.</th><th>Step</th><th>Decision</th><th>Reviewer</th><th>Note</th><th>When</th></tr>
            </thead>
            <tbody>
              {reviews.length === 0 && <tr><td colSpan={6} className="empty">No reviews yet.</td></tr>}
              {reviews.map((r, i) => (
                <tr key={i}>
                  <td className="num">{r.version}</td>
                  <td className="small">{statusLabel(r.step)}</td>
                  <td><span className={`badge ${r.decision === 'sent_back' || r.decision === 'rejected' ? 'badge-danger' : 'badge-good'}`}>{r.decision}</span></td>
                  <td className="small">{r.reviewer}</td>
                  <td className="small">{r.note ?? '—'}</td>
                  <td className="small muted">{fmtDate(r.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
