'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, errorMessage, useApi } from '@/lib/api';
import { fmtDate, relTime } from '@/lib/format';
import { ConfirmButton, ErrorAlert, Forbidden, OkAlert, PageHead, StatusBadge } from '@/components/ui';
import { useCan } from '@/components/ConsoleShell';

interface Detail {
  user: { id: string; email: string; displayName: string | null; status: string; createdAt: string; lastSeenAt: string | null };
  devices: { id: string; platform: string; appVersion: string | null; pushEnabled: boolean; lastSeenAt: string }[];
  activeSessions: number;
  recentEvents: { name: string; screen: string | null; contentId: string | null; properties: Record<string, unknown> | null; platform: string | null; occurredAt: string }[];
}

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const can = useCan();
  const { data, error, reload } = useApi<Detail>(can('users:read') ? `users/${id}` : null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  if (!can('users:read')) return <Forbidden />;

  async function setStatus(status: 'active' | 'deactivated') {
    setActionError(null);
    try {
      await api(`users/${id}`, { method: 'PATCH', body: { status } });
      setOk(status === 'active' ? 'Account re-activated.' : 'Account deactivated and signed out everywhere.');
      await reload();
    } catch (e) {
      setActionError(errorMessage(e));
    }
  }

  async function remove() {
    try {
      await api(`users/${id}`, { method: 'DELETE' });
      router.push('/users');
    } catch (e) {
      setActionError(errorMessage(e));
    }
  }

  const u = data?.user;
  return (
    <div>
      <p className="small"><Link href="/users">← Users</Link></p>
      <PageHead
        title={u ? u.displayName || u.email : 'User'}
        subtitle={u?.email}
        actions={
          u && (
            <>
              {can('users:write') &&
                (u.status === 'active' ? (
                  <ConfirmButton label="Deactivate" confirm={`Deactivate ${u.email}? They will be signed out immediately.`} onConfirm={() => setStatus('deactivated')} />
                ) : (
                  <button className="btn btn-sm" onClick={() => setStatus('active')}>Re-activate</button>
                ))}
              {can('users:delete') && (
                <ConfirmButton label="Delete permanently" confirm={`Permanently delete ${u.email}? This cannot be undone.`} onConfirm={remove} />
              )}
            </>
          )
        }
      />
      <ErrorAlert error={error || actionError} />
      <OkAlert message={ok} />
      {data && u && (
        <div className="grid grid-2">
          <section className="card">
            <h2 style={{ marginBottom: 12 }}>Account</h2>
            <table>
              <tbody>
                <tr><td className="muted">Status</td><td><StatusBadge status={u.status} /></td></tr>
                <tr><td className="muted">Joined</td><td>{fmtDate(u.createdAt)}</td></tr>
                <tr><td className="muted">Last seen</td><td>{relTime(u.lastSeenAt)}</td></tr>
                <tr><td className="muted">Signed-in sessions</td><td>{data.activeSessions}</td></tr>
                <tr><td className="muted">User ID</td><td className="mono">{u.id}</td></tr>
              </tbody>
            </table>
          </section>
          <section className="card">
            <h2 style={{ marginBottom: 12 }}>Devices</h2>
            {data.devices.length === 0 ? (
              <div className="empty">No devices linked.</div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Platform</th><th>Version</th><th>Push</th><th>Last seen</th></tr></thead>
                  <tbody>
                    {data.devices.map((d) => (
                      <tr key={d.id}>
                        <td>{d.platform}</td>
                        <td>{d.appVersion ?? '—'}</td>
                        <td>{d.pushEnabled ? 'On' : 'Off'}</td>
                        <td className="small muted">{relTime(d.lastSeenAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          <section className="card" style={{ gridColumn: '1 / -1' }}>
            <h2>Recent in-app activity</h2>
            <p className="small muted">Product-usage events only (screens, focus sessions). Last 50.</p>
            {data.recentEvents.length === 0 ? (
              <div className="empty">No activity recorded while signed in.</div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Event</th><th>Details</th><th>Platform</th><th>When</th></tr></thead>
                  <tbody>
                    {data.recentEvents.map((e, i) => (
                      <tr key={i}>
                        <td className="mono">{e.name}</td>
                        <td className="small">
                          {[e.screen, e.contentId && `image ${e.contentId.slice(0, 8)}`, e.properties && Object.entries(e.properties).map(([k, v]) => `${k}: ${String(v)}`).join(', ')]
                            .filter(Boolean)
                            .join(' · ') || '—'}
                        </td>
                        <td className="small">{e.platform ?? '—'}</td>
                        <td className="small muted">{fmtDate(e.occurredAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
