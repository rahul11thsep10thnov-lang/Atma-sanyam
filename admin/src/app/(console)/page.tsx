'use client';

import Link from 'next/link';
import { useApi } from '@/lib/api';
import { fmtDate, humanizeAction, relTime } from '@/lib/format';
import { ErrorAlert, Kpi, PageHead } from '@/components/ui';
import { useCan, useMe } from '@/components/ConsoleShell';

interface Dashboard {
  guardians: { total: number; active7d: number; new7d: number } | null;
  children: { total: number; byBracket: { A: number; B: number; C: number; D: number } } | null;
  subscriptions: { active: number; grace: number; expired: number } | null;
  play: { sessionsToday: number; minutesToday: number } | null;
  catalogue: { publishedGames: number; inDevelopmentGames: number; publishedCrafts: number; publishedFacts: number; unpublishedFacts: number };
  installs: { total: number; new7d: number; active7d: number } | null;
  notificationsSent30d: number | null;
  recentActivity: { id: number; action: string; entity_type: string; entity_id: string | null; created_at: string; admin_name: string | null }[] | null;
  recentGuardians: { id: string; name: string; phone_masked: string; created_at: string }[] | null;
}

export default function DashboardPage() {
  const me = useMe();
  const can = useCan();
  const { data, error, loading } = useApi<Dashboard>(can('dashboard:read') ? 'dashboard' : null);

  return (
    <div>
      <PageHead title={`Welcome, ${me.name.split(' ')[0]}`} subtitle="What’s happening in LoJi right now." />
      <ErrorAlert error={error} />
      {loading && !data && <div className="card empty">Loading…</div>}
      {data && (
        <div className={loading ? 'loading-dim' : undefined}>
          <div className="kpis">
            {data.guardians && <Kpi label="Family accounts" value={data.guardians.total} sub={`+${data.guardians.new7d} in the last 7 days · ${data.guardians.active7d} active`} />}
            {data.children && <Kpi label="Child profiles" value={data.children.total} sub={`A ${data.children.byBracket.A} · B ${data.children.byBracket.B} · C ${data.children.byBracket.C} · D ${data.children.byBracket.D}`} />}
            {data.subscriptions && <Kpi label="Active subscriptions" value={data.subscriptions.active} sub={`${data.subscriptions.grace} in grace/retry · ${data.subscriptions.expired} lapsed`} />}
            {data.play && <Kpi label="Play sessions today" value={data.play.sessionsToday} sub={`${data.play.minutesToday} minutes played`} />}
            <Kpi label="Published games" value={data.catalogue.publishedGames} sub={`${data.catalogue.inDevelopmentGames} in development`} />
            <Kpi label="Craft tutorials" value={data.catalogue.publishedCrafts} sub="published" />
            <Kpi label="Published facts" value={data.catalogue.publishedFacts} sub={`${data.catalogue.unpublishedFacts} draft or awaiting publish`} />
            {data.installs && <Kpi label="Active installs (7d)" value={data.installs.active7d} sub={`${data.installs.total} installs total`} />}
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
            {data.recentGuardians && (
              <section className="card">
                <div className="card-head">
                  <h2>Newest family accounts</h2>
                  <Link href="/guardians" className="small">View all</Link>
                </div>
                {data.recentGuardians.length === 0 ? (
                  <div className="empty">No guardians yet.</div>
                ) : (
                  <div className="table-wrap">
                    <table>
                      <tbody>
                        {data.recentGuardians.map((u) => (
                          <tr key={u.id}>
                            <td>
                              <Link href={`/guardians/${u.id}`}>{u.name}</Link>
                              <div className="small muted">{u.phone_masked}</div>
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
