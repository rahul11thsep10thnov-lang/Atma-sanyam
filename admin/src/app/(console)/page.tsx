'use client';

import Link from 'next/link';
import { useApi } from '@/lib/api';
import { fmtDate, humanizeAction, relTime } from '@/lib/format';
import { ErrorAlert, Kpi, PageHead } from '@/components/ui';
import { useCan, useMe } from '@/components/ConsoleShell';

interface Dashboard {
  users: { total: number; active7d: number; new7d: number } | null;
  installs: { total: number; new7d: number; active7d: number } | null;
  content: { total: number; published: number; draft: number; categories: number };
  sessions7d: { completed: number; failed: number } | null;
  notificationsSent30d: number | null;
  recentActivity: { id: number; action: string; entity_type: string; entity_id: string | null; created_at: string; admin_name: string | null }[] | null;
  recentUsers: { id: string; email: string; display_name: string | null; created_at: string }[] | null;
}

export default function DashboardPage() {
  const me = useMe();
  const can = useCan();
  const { data, error, loading } = useApi<Dashboard>(can('dashboard:read') ? 'dashboard' : null);

  return (
    <div>
      <PageHead title={`Welcome, ${me.name.split(' ')[0]}`} subtitle="What’s happening in FOCUS right now." />
      <ErrorAlert error={error} />
      {loading && !data && <div className="card empty">Loading…</div>}
      {data && (
        <div className={loading ? 'loading-dim' : undefined}>
          <div className="kpis">
            {data.users && <Kpi label="Registered users" value={data.users.total} sub={`+${data.users.new7d} in the last 7 days`} />}
            {data.users && <Kpi label="Active accounts (7d)" value={data.users.active7d} />}
            {data.installs && <Kpi label="Active installs (7d)" value={data.installs.active7d} sub={`${data.installs.total} installs total`} />}
            <Kpi label="Published images" value={data.content.published} sub={`${data.content.draft} drafts · ${data.content.categories} categories`} />
            {data.sessions7d && (
              <Kpi
                label="Focus sessions (7d)"
                value={data.sessions7d.completed + data.sessions7d.failed}
                sub={`${data.sessions7d.completed} completed · ${data.sessions7d.failed} failed`}
              />
            )}
            {data.notificationsSent30d !== null && <Kpi label="Notifications sent (30d)" value={data.notificationsSent30d} />}
          </div>

          <div className="grid grid-2">
            {data.recentActivity && (
              <section className="card">
                <div className="card-head">
                  <h2>Recent admin activity</h2>
                  <Link href="/audit" className="small">View all</Link>
                </div>
                {data.recentActivity.length === 0 ? (
                  <div className="empty">No activity yet.</div>
                ) : (
                  <div className="table-wrap">
                    <table>
                      <tbody>
                        {data.recentActivity.map((a) => (
                          <tr key={a.id}>
                            <td>
                              <strong>{a.admin_name ?? 'Deleted admin'}</strong> <span className="muted">{humanizeAction(a.action)}</span>
                            </td>
                            <td className="num small muted" title={fmtDate(a.created_at)}>{relTime(a.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}
            {data.recentUsers && (
              <section className="card">
                <div className="card-head">
                  <h2>Newest users</h2>
                  <Link href="/users" className="small">View all</Link>
                </div>
                {data.recentUsers.length === 0 ? (
                  <div className="empty">No registered users yet.</div>
                ) : (
                  <div className="table-wrap">
                    <table>
                      <tbody>
                        {data.recentUsers.map((u) => (
                          <tr key={u.id}>
                            <td>
                              <Link href={`/users/${u.id}`}>{u.display_name || u.email}</Link>
                              {u.display_name && <div className="small muted">{u.email}</div>}
                            </td>
                            <td className="num small muted">{relTime(u.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
