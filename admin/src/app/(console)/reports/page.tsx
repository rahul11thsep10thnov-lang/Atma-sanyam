'use client';

import Link from 'next/link';
import { useState } from 'react';
import { api, errorMessage, useApi } from '@/lib/api';
import { fmtDate } from '@/lib/format';
import { ErrorAlert, Forbidden, OkAlert, PageHead, Pager, StatusBadge } from '@/components/ui';
import { useCan } from '@/components/ConsoleShell';

interface Person {
  id: string;
  username: string | null;
  displayName: string | null;
  status: string;
}

interface ReportRow {
  id: string;
  reason: string;
  note: string | null;
  context: string | null;
  status: 'open' | 'resolved' | 'dismissed';
  createdAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
  resolutionNote: string | null;
  reporter: Person | null;
  reported: Person;
  openReportsAboutReported: number;
}

const REASON: Record<string, string> = {
  harassment: 'Harassment or bullying',
  inappropriate_profile: 'Inappropriate name or picture',
  spam: 'Spam or unwanted pokes',
  impersonation: 'Pretending to be someone',
  other: 'Something else',
};

const CONTEXT: Record<string, string> = { friends: 'Friends list', search: 'Search', request: 'Friend request', group: 'Group focus' };

const nameOf = (p: Person | null) => (p ? (p.username ? `@${p.username}` : p.displayName || 'No username') : 'Deleted account');

export default function ReportsPage() {
  const can = useCan();
  const [status, setStatus] = useState('open');
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [actionError, setActionError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const { data, error, loading, reload } = useApi<{ items: ReportRow[]; total: number; page: number; pageSize: number }>(
    can('reports:read') ? 'reports' : null,
    { status, page, pageSize: 20 }
  );
  if (!can('reports:read')) return <Forbidden />;

  const update = async (r: ReportRow, next: ReportRow['status']) => {
    setBusy(r.id);
    setActionError(null);
    setOk(null);
    try {
      await api(`reports/${r.id}`, { method: 'PATCH', body: { status: next, resolutionNote: notes[r.id] || undefined } });
      setOk(next === 'open' ? 'Report reopened.' : `Report marked ${next}.`);
      await reload();
    } catch (e) {
      setActionError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <PageHead
        title="Reports"
        subtitle="People reported by other users from the app. The reported person is never told who reported them. To act on an account, open it and deactivate it, then resolve the report."
      />
      <div className="filters">
        <select className="input" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="Status">
          <option value="open">Open</option>
          <option value="resolved">Resolved</option>
          <option value="dismissed">Dismissed</option>
          <option value="">All</option>
        </select>
      </div>
      <ErrorAlert error={error ?? actionError} />
      <OkAlert message={ok} />
      <section className={`card ${loading ? 'loading-dim' : ''}`}>
        {data && data.items.length === 0 ? (
          <div className="empty">No reports here.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Reported</th>
                  <th>Reason</th>
                  <th>Reported by</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {data?.items.map((r) => (
                  <tr key={r.id}>
                    <td>
                      {can('users:read') ? <Link href={`/users/${r.reported.id}`}>{nameOf(r.reported)}</Link> : nameOf(r.reported)}
                      <div className="small muted">
                        {r.reported.status !== 'active' ? `${r.reported.status} · ` : ''}
                        {r.openReportsAboutReported} open {r.openReportsAboutReported === 1 ? 'report' : 'reports'}
                      </div>
                    </td>
                    <td>
                      {REASON[r.reason] ?? r.reason}
                      {r.note ? <div className="small">“{r.note}”</div> : null}
                      <div className="small muted">{[r.context ? CONTEXT[r.context] ?? r.context : null, fmtDate(r.createdAt)].filter(Boolean).join(' · ')}</div>
                    </td>
                    <td className="small">{nameOf(r.reporter)}</td>
                    <td>
                      <StatusBadge status={r.status} />
                      {r.resolvedAt ? (
                        <div className="small muted">
                          {[r.resolvedBy, fmtDate(r.resolvedAt)].filter(Boolean).join(' · ')}
                          {r.resolutionNote ? <div>“{r.resolutionNote}”</div> : null}
                        </div>
                      ) : null}
                    </td>
                    <td>
                      {can('reports:write') ? (
                        r.status === 'open' ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 180 }}>
                            <input
                              className="input"
                              placeholder="Note (optional)"
                              maxLength={1000}
                              value={notes[r.id] ?? ''}
                              onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
                              aria-label="Resolution note"
                            />
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button className="btn btn-sm btn-primary" disabled={busy === r.id} onClick={() => void update(r, 'resolved')}>Resolve</button>
                              <button className="btn btn-sm" disabled={busy === r.id} onClick={() => void update(r, 'dismissed')}>Dismiss</button>
                            </div>
                          </div>
                        ) : (
                          <button className="btn btn-sm btn-ghost" disabled={busy === r.id} onClick={() => void update(r, 'open')}>Reopen</button>
                        )
                      ) : (
                        <span className="small muted">View only</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && <Pager page={data.page} pageSize={data.pageSize} total={data.total} onPage={setPage} />}
      </section>
    </div>
  );
}
