'use client';

import { useState } from 'react';
import { useApi } from '@/lib/api';
import { fmtDate, fmtNumber } from '@/lib/format';
import { ColumnChart } from '@/components/ColumnChart';
import { ErrorAlert, Forbidden, Kpi, PageHead } from '@/components/ui';
import { useCan } from '@/components/ConsoleShell';

interface Analytics {
  days: number;
  active: { dau: number; wau: number; mau: number };
  dau: { date: string; count: number }[];
  registrations: { date: string; count: number }[];
  retention: { d1: number | null; d7: number | null; d30: number | null; cohortSizes: { d1: number; d7: number; d30: number } };
  topScreens: { screen: string; views: number }[];
  topContent: { content_id: string; title: string | null; views: number }[];
  sessions: { completed: number; failed: number; completionRate: number | null; avgCompletedMinutes: number | null };
  platforms: { platform: string | null; installs: number }[];
  errors: { count: number; recent: { message: string | null; platform: string | null; app_version: string | null; occurred_at: string }[] };
}

const RANGES = [7, 30, 90];

const pct = (v: number | null) => (v === null ? '—' : `${v}%`);

function RankTable({ rows, label, valueLabel }: { rows: { name: string; value: number }[]; label: string; valueLabel: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (rows.length === 0) return <div className="empty">No data in this range yet.</div>;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>{label}</th>
            <th style={{ width: '35%' }} aria-hidden />
            <th className="num">{valueLabel}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name}>
              <td>{r.name}</td>
              <td aria-hidden>
                <div className="meter">
                  <div style={{ width: `${(r.value / max) * 100}%` }} />
                </div>
              </td>
              <td className="num">{fmtNumber(r.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AnalyticsPage() {
  const can = useCan();
  const [days, setDays] = useState(30);
  const { data, error, loading } = useApi<Analytics>(can('analytics:read') ? 'analytics' : null, { days });
  if (!can('analytics:read')) return <Forbidden />;

  return (
    <div>
      <PageHead title="Analytics" subtitle="Anonymous product usage from the app. Days are UTC." />
      {/* One filter row, above everything it scopes. */}
      <div className="filters" role="group" aria-label="Date range">
        <div className="segmented">
          {RANGES.map((r) => (
            <button key={r} aria-pressed={days === r} onClick={() => setDays(r)}>
              Last {r} days
            </button>
          ))}
        </div>
      </div>
      <ErrorAlert error={error} />
      {loading && !data && <div className="card empty">Loading…</div>}
      {data && (
        <div className={loading ? 'loading-dim' : undefined}>
          <div className="kpis">
            <Kpi label="Active today" value={data.active.dau} sub="Installs with any activity" />
            <Kpi label="Weekly active" value={data.active.wau} />
            <Kpi label="Monthly active" value={data.active.mau} />
            <Kpi label="Session completion" value={pct(data.sessions.completionRate)} sub={`${data.sessions.completed} of ${data.sessions.completed + data.sessions.failed} sessions`} />
            <Kpi label="Avg completed session" value={data.sessions.avgCompletedMinutes === null ? '—' : `${data.sessions.avgCompletedMinutes} min`} />
            <Kpi label="Day-1 retention" value={pct(data.retention.d1)} sub={`cohort of ${data.retention.cohortSizes.d1}`} />
            <Kpi label="Day-7 retention" value={pct(data.retention.d7)} sub={`cohort of ${data.retention.cohortSizes.d7}`} />
            <Kpi label="Day-30 retention" value={pct(data.retention.d30)} sub={`cohort of ${data.retention.cohortSizes.d30}`} />
          </div>

          <div className="grid grid-2">
            <section className="card">
              <div className="card-head">
                <h2>Daily active installs</h2>
              </div>
              <ColumnChart data={data.dau} valueLabel="active installs" />
            </section>
            <section className="card">
              <div className="card-head">
                <h2>New registrations per day</h2>
              </div>
              <ColumnChart data={data.registrations} valueLabel="new accounts" />
            </section>
            <section className="card">
              <div className="card-head">
                <h2>Top screens</h2>
              </div>
              <RankTable rows={data.topScreens.map((s) => ({ name: s.screen, value: s.views }))} label="Screen" valueLabel="Views" />
            </section>
            <section className="card">
              <div className="card-head">
                <h2>Most-picked library images</h2>
              </div>
              <RankTable
                rows={data.topContent.map((c) => ({ name: c.title ?? `Deleted (${c.content_id.slice(0, 8)})`, value: c.views }))}
                label="Image"
                valueLabel="Picks"
              />
            </section>
            <section className="card">
              <div className="card-head">
                <h2>Platforms</h2>
              </div>
              <RankTable rows={data.platforms.map((p) => ({ name: p.platform ?? 'unknown', value: p.installs }))} label="Platform" valueLabel="Installs" />
            </section>
            <section className="card">
              <div className="card-head">
                <h2>App errors</h2>
                <span className={`badge ${data.errors.count ? 'badge-danger' : 'badge-good'}`}>{data.errors.count} in range</span>
              </div>
              {data.errors.recent.length === 0 ? (
                <div className="empty">No errors reported. </div>
              ) : (
                <div className="table-wrap" style={{ maxHeight: 280, overflowY: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Message</th>
                        <th>Platform</th>
                        <th>When</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.errors.recent.map((e, i) => (
                        <tr key={i}>
                          <td className="mono">{e.message ?? '(no message)'}</td>
                          <td className="small">{e.platform} {e.app_version}</td>
                          <td className="small muted">{fmtDate(e.occurred_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
