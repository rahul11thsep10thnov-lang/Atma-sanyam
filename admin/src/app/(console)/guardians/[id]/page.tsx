'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, errorMessage, useApi } from '@/lib/api';
import { fmtDate, relTime } from '@/lib/format';
import { ConfirmButton, ErrorAlert, Forbidden, OkAlert, PageHead, StatusBadge } from '@/components/ui';
import { useCan } from '@/components/ConsoleShell';

interface Detail {
  guardian: { id: string; name: string; phoneMasked: string; email: string | null; status: string; termsVersion: string; createdAt: string; lastSeenAt: string | null };
  children: { id: string; bracket: string; status: string; createdAt: string; lastActiveAt: string | null }[];
  devices: { id: string; platform: string; appVersion: string | null; pushEnabled: boolean; lastSeenAt: string }[];
  activeSessions: number;
  subscriptions: { id: string; provider: string; status: string; currentPeriodEnd: string | null; cancelAtPeriodEnd?: boolean; createdAt?: string }[];
  entitlement: { active: boolean; status: string; validUntil: string | null };
  deletionRequests: { id: string; requestedAt: string; scheduledFor: string; cancelledAt: string | null; completedAt: string | null }[];
}

export default function GuardianDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const can = useCan();
  const { data, error, reload } = useApi<Detail>(can('guardians:read') ? `guardians/${id}` : null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  if (!can('guardians:read')) return <Forbidden />;

  async function setStatus(status: 'active' | 'deactivated') {
    setActionError(null);
    try {
      await api(`guardians/${id}`, { method: 'PATCH', body: { status } });
      setOk(status === 'active' ? 'Account re-activated.' : 'Account deactivated; the guardian and every child profile are signed out everywhere.');
      await reload();
    } catch (e) {
      setActionError(errorMessage(e));
    }
  }
  async function remove() {
    try {
      await api(`guardians/${id}`, { method: 'DELETE' });
      router.push('/guardians');
    } catch (e) {
      setActionError(errorMessage(e));
    }
  }

  const g = data?.guardian;
  return (
    <div>
      <p className="small"><Link href="/guardians">← Guardians</Link></p>
      <PageHead
        title={g?.name ?? 'Guardian'}
        subtitle={g ? [g.phoneMasked, g.email, `terms ${g.termsVersion}`].filter(Boolean).join(' · ') : undefined}
        actions={g && (
          <>
            {can('guardians:write') && (g.status === 'active'
              ? <ConfirmButton label="Deactivate" confirm={`Deactivate ${g.name}? They and their children will be signed out immediately.`} onConfirm={() => setStatus('deactivated')} />
              : g.status === 'deactivated' && <button className="btn btn-sm" onClick={() => setStatus('active')}>Re-activate</button>)}
            {can('guardians:delete') && <ConfirmButton label="Delete account" confirm={`Permanently delete ${g.name} and every child profile, session and record? This cannot be undone.`} onConfirm={remove} />}
          </>
        )}
      />
      <ErrorAlert error={error ?? actionError} />
      <OkAlert message={ok} />
      {data && (
        <div className="grid grid-2">
          <section className="card">
            <h2>Account</h2>
            <div className="table-wrap"><table><tbody>
              <tr><td>Status</td><td><StatusBadge status={g!.status} /></td></tr>
              <tr><td>Joined</td><td>{fmtDate(g!.createdAt)}</td></tr>
              <tr><td>Last seen</td><td>{relTime(g!.lastSeenAt)}</td></tr>
              <tr><td>Signed-in sessions</td><td>{data.activeSessions}</td></tr>
              <tr><td>Entitlement</td><td><span className={`badge ${data.entitlement.active ? 'badge-good' : 'badge-warn'}`}>{data.entitlement.status.replace(/_/g, ' ')}</span> {data.entitlement.validUntil && <span className="small muted">until {fmtDate(data.entitlement.validUntil)}</span>}</td></tr>
            </tbody></table></div>
            {data.deletionRequests.length > 0 && (
              <>
                <h3 style={{ marginTop: 14 }}>Deletion requests</h3>
                <div className="table-wrap"><table><thead><tr><th>Requested</th><th>Scheduled</th><th>State</th></tr></thead><tbody>
                  {data.deletionRequests.map((d) => (
                    <tr key={d.id}><td className="small">{fmtDate(d.requestedAt)}</td><td className="small">{fmtDate(d.scheduledFor)}</td><td>{d.completedAt ? <StatusBadge status="completed" /> : d.cancelledAt ? <StatusBadge status="cancelled" /> : <StatusBadge status="pending" />}</td></tr>
                  ))}
                </tbody></table></div>
              </>
            )}
          </section>
          <section className="card">
            <h2>Children ({data.children.length})</h2>
            <p className="small muted">Shown as age bracket and status only.</p>
            {data.children.length === 0 ? <div className="empty">No child profiles.</div> : (
              <div className="table-wrap"><table><thead><tr><th>Bracket</th><th>Status</th><th>Created</th><th>Last active</th></tr></thead><tbody>
                {data.children.map((c) => <tr key={c.id}><td>{c.bracket}</td><td><StatusBadge status={c.status} /></td><td className="small">{fmtDate(c.createdAt)}</td><td className="small muted">{relTime(c.lastActiveAt)}</td></tr>)}
              </tbody></table></div>
            )}
          </section>
          <section className="card">
            <h2>Subscriptions</h2>
            {data.subscriptions.length === 0 ? <div className="empty">Never subscribed.</div> : (
              <div className="table-wrap"><table><thead><tr><th>Provider</th><th>Status</th><th>Period end</th><th /></tr></thead><tbody>
                {data.subscriptions.map((s) => <tr key={s.id}><td>{s.provider}</td><td><StatusBadge status={s.status} /></td><td className="small">{fmtDate(s.currentPeriodEnd)}</td><td className="num"><Link href={`/subscriptions?guardian=${id}`} className="small">Manage</Link></td></tr>)}
              </tbody></table></div>
            )}
          </section>
          <section className="card">
            <h2>Devices</h2>
            {data.devices.length === 0 ? <div className="empty">No devices.</div> : (
              <div className="table-wrap"><table><thead><tr><th>Platform</th><th>App</th><th>Push</th><th>Last seen</th></tr></thead><tbody>
                {data.devices.map((d) => <tr key={d.id}><td>{d.platform}</td><td className="small">{d.appVersion ?? '—'}</td><td>{d.pushEnabled ? 'on' : 'off'}</td><td className="small muted">{relTime(d.lastSeenAt)}</td></tr>)}
              </tbody></table></div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
