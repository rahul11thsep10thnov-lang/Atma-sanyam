'use client';

import { useState } from 'react';
import { api, errorMessage } from '@/lib/api';
import { fmtDate } from '@/lib/format';
import { BAND_LABELS } from '@/lib/dadu';
import { ErrorAlert, Forbidden, PageHead } from '@/components/ui';
import { useCan } from '@/components/ConsoleShell';

interface Child {
  id: string;
  name: string;
  band: string;
  difficulty: string;
  language: string;
  templeEnabled: boolean;
  createdAt: string;
  lastSyncedAt?: string | null;
  consentAt?: string | null;
  stats?: { lessonsCompleted?: number; storiesRead?: number; assignmentsCompleted?: number; stars?: number };
}

export default function ParentsPage() {
  const can = useCan();
  const [userId, setUserId] = useState('');
  const [children, setChildren] = useState<Child[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!can('dadu:parents:read')) return <Forbidden />;

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setChildren(null);
    try {
      const res = await api<{ children: Child[] } | Child[]>(`dadu/parents/${encodeURIComponent(userId.trim())}/children`);
      setChildren(Array.isArray(res) ? res : res.children);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHead title="Parent support" subtitle="Read-only view of a parent's child profiles, for support requests. Children's names are shown only here and never searchable." />
      <form className="filters" onSubmit={lookup}>
        <input className="input mono" placeholder="Parent user id (uuid)" value={userId} onChange={(e) => setUserId(e.target.value)} aria-label="User id" style={{ minWidth: 340 }} />
        <button className="btn btn-primary" disabled={busy || !userId.trim()}>{busy ? 'Looking up…' : 'Look up'}</button>
      </form>
      <ErrorAlert error={error} />
      {children && (
        <section className="card">
          {children.length === 0 ? (
            <div className="empty">This account has no child profiles synced to the server (profiles may exist only on the device).</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Child</th><th>Age band</th><th>Difficulty</th><th>Language</th><th>Temple</th><th>Consent</th><th>Progress</th><th>Created</th></tr></thead>
                <tbody>
                  {children.map((c) => (
                    <tr key={c.id}>
                      <td>{c.name}<div className="small muted mono">{c.id}</div></td>
                      <td className="small">{c.band} ({BAND_LABELS[c.band] ?? '?'})</td>
                      <td className="small">{c.difficulty}</td>
                      <td className="small">{c.language}</td>
                      <td className="small">{c.templeEnabled ? 'on' : 'off'}</td>
                      <td className="small">{c.consentAt ? fmtDate(c.consentAt) : '—'}</td>
                      <td className="small">{c.stats ? `${c.stats.lessonsCompleted ?? 0} lessons · ${c.stats.storiesRead ?? 0} stories · ${c.stats.assignmentsCompleted ?? 0} adventures · ${c.stats.stars ?? 0} stars` : '—'}</td>
                      <td className="small muted">{fmtDate(c.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
