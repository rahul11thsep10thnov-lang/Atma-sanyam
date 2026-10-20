'use client';

import { Fragment, useState } from 'react';
import { api, errorMessage, useApi } from '@/lib/api';
import { fmtDate, relTime } from '@/lib/format';
import { ErrorAlert, Forbidden, Kpi, OkAlert, PageHead, StatusBadge } from '@/components/ui';
import { useCan } from '@/components/ConsoleShell';

interface Source {
  id: string;
  title: string;
  publisher: string;
  url: string;
  accessedOn: string | null;
  notes: string | null;
  origin: 'admin' | 'registry' | 'editorial' | 'discovered';
  verificationStatus: 'pending_review' | 'approved' | 'restricted' | 'unavailable' | 'verification_failed';
  licenceName: string | null;
  licenceUrl: string | null;
  licenceVerified: boolean;
  commercialUseAllowed: boolean | null;
  redistributionAllowed: boolean | null;
  attributionRequired: boolean | null;
  shareAlikeRequired: boolean | null;
  apiKeyRequired: boolean | null;
  rateLimitNotes: string | null;
  contentTypesAllowed: string[];
  verificationEvidenceUrl: string | null;
  lastVerifiedAt: string | null;
  lastCheckedAt: string | null;
  lastCheckError: string | null;
  consecutiveFailures: number;
  ingestionSuspended: boolean;
  suspensionReason: string | null;
  statusLocked: boolean;
  adminEdited: boolean;
  connector: string | null;
  factCount: number;
  publishedFactCount: number;
  ingestedFactCount: number;
}

interface Summary {
  total: number;
  registeredAutomatically: number;
  approved: number;
  awaitingReview: number;
  restricted: number;
  unavailable: number;
  verificationFailed: number;
  suspended: number;
  newlyDiscovered: number;
  lastSuccessfulVerificationAt: string | null;
  errors: { id: string; title: string; publisher: string; error: string | null; at: string | null; failures: number }[];
}

interface Event { id: number; at: string; trigger: string; outcome: string; fromStatus: string | null; toStatus: string | null; detail: string | null }

const EMPTY = { title: '', publisher: '', url: 'https://', accessedOn: '', notes: '' };
const yn = (v: boolean | null) => (v === null ? '—' : v ? 'yes' : 'no');
const ORIGIN: Record<Source['origin'], string> = { admin: 'added by hand', registry: 'automatic', editorial: 'editorial reference', discovered: 'discovered' };

export default function SourcesPage() {
  const can = useCan();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [origin, setOrigin] = useState('');
  const { data, error, reload } = useApi<Source[]>(can('content:read') ? 'fact-sources' : null, { search, status, origin });
  const { data: summary, reload: reloadSummary } = useApi<Summary>(can('content:read') ? 'fact-sources/summary' : null);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const { data: events } = useApi<Event[]>(openId ? `fact-sources/${openId}/events` : null);
  const [decision, setDecision] = useState({ verificationStatus: 'approved', licenceName: '', verificationEvidenceUrl: 'https://' });
  if (!can('content:read')) return <Forbidden />;

  const refresh = async () => { await Promise.all([reload(), reloadSummary()]); };

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setOk(null);
    const body = { ...form, notes: form.notes || null, accessedOn: form.accessedOn || null };
    try {
      if (editing) await api(`fact-sources/${editing}`, { method: 'PATCH', body });
      else await api('fact-sources', { method: 'POST', body });
      setOk(editing ? 'Source updated.' : 'Source added. It starts as "pending review" until its licence is verified.');
      setForm(EMPTY); setEditing(null); await refresh();
    } catch (e2) { setErr(errorMessage(e2)); }
  }

  async function verify(id: string) {
    setBusy(id); setErr(null); setOk(null);
    try {
      const r = await api<{ result: { to: string; detail: string } }>(`fact-sources/${id}/verify`, { method: 'POST' });
      setOk(`Checked: ${r.result.to.replace(/_/g, ' ')} — ${r.result.detail}`);
      await refresh();
    } catch (e) { setErr(errorMessage(e)); } finally { setBusy(null); }
  }

  async function runAll() {
    setErr(null); setOk(null);
    try { await api('fact-sources/maintenance/run', { method: 'POST' }); setOk('Maintenance started. Results appear in the list within a minute or two.'); } catch (e) { setErr(errorMessage(e)); }
  }

  async function decide(s: Source) {
    setErr(null); setOk(null);
    try {
      await api(`fact-sources/${s.id}`, { method: 'PATCH', body: { verificationStatus: decision.verificationStatus, licenceName: decision.licenceName || s.licenceName || undefined, verificationEvidenceUrl: decision.verificationEvidenceUrl.length > 8 ? decision.verificationEvidenceUrl : s.verificationEvidenceUrl || undefined } });
      setOk('Decision saved. The automation will not override it; unlock the status to hand it back.'); await refresh();
    } catch (e) { setErr(errorMessage(e)); }
  }

  async function toggle(s: Source, patch: Record<string, boolean>) {
    setErr(null);
    try { await api(`fact-sources/${s.id}`, { method: 'PATCH', body: patch }); await refresh(); } catch (e) { setErr(errorMessage(e)); }
  }

  return (
    <div>
      <PageHead title="Fact sources" subtitle="Sources are registered and licence-checked automatically. A source supplies facts only after its licence evidence has been verified; nothing here needs to be entered by hand." actions={can('content:publish') && <button className="btn btn-sm" onClick={runAll}>Run maintenance now</button>} />
      <ErrorAlert error={error ?? err} />
      <OkAlert message={ok} />

      {summary && (
        <div className="kpis">
          <Kpi label="Registered automatically" value={summary.registeredAutomatically} sub={`${summary.total} sources in total`} />
          <Kpi label="Approved" value={summary.approved} sub={summary.lastSuccessfulVerificationAt ? `last verified ${relTime(summary.lastSuccessfulVerificationAt)}` : 'none verified yet'} />
          <Kpi label="Awaiting licence review" value={summary.awaitingReview} />
          <Kpi label="Restricted" value={summary.restricted} sub={`${summary.unavailable} unavailable · ${summary.verificationFailed} failed checks`} />
          <Kpi label="Ingestion suspended" value={summary.suspended} sub={`${summary.newlyDiscovered} newly discovered this week`} />
        </div>
      )}
      {summary && summary.errors.length > 0 && (
        <section className="card" style={{ marginBottom: 16 }}>
          <h2 style={{ marginBottom: 8 }}>Verification errors</h2>
          <div className="table-wrap"><table><tbody>
            {summary.errors.map((x) => (
              <tr key={x.id}><td><strong>{x.publisher}</strong> · {x.title}</td><td className="small">{x.error}</td><td className="small muted num">{x.failures}× · {relTime(x.at)}</td></tr>
            ))}
          </tbody></table></div>
        </section>
      )}

      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        <section className="card" style={{ gridColumn: 'span 2' }}>
          <div className="card-head"><h2>Sources ({data?.length ?? 0})</h2></div>
          <div className="filters">
            <input className="input" type="search" placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search sources" />
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
              <option value="">All statuses</option>
              {['approved', 'pending_review', 'restricted', 'unavailable', 'verification_failed'].map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
            <select className="input" value={origin} onChange={(e) => setOrigin(e.target.value)} aria-label="Origin">
              <option value="">All origins</option><option value="registry">Automatic</option><option value="admin">Added by hand</option><option value="discovered">Discovered</option><option value="editorial">Editorial reference</option>
            </select>
          </div>
          <div className="table-wrap"><table>
            <thead><tr><th>Source</th><th>Status</th><th>Licence</th><th>Last verified</th><th className="num">Facts</th><th /></tr></thead>
            <tbody>
              {data?.map((s) => (
                <Fragment key={s.id}>
                  <tr>
                    <td>
                      <strong>{s.publisher}</strong> · <a href={s.url} target="_blank" rel="noreferrer noopener">{s.title}</a>
                      <div className="small muted">{ORIGIN[s.origin]}{s.statusLocked ? ' · locked by an administrator' : ''}{s.ingestionSuspended ? ' · ingestion suspended' : ''}</div>
                      {s.lastCheckError && <div className="small" style={{ color: 'var(--danger)' }}>{s.lastCheckError}</div>}
                    </td>
                    <td><StatusBadge status={s.verificationStatus} /></td>
                    <td className="small">{s.licenceName ?? '—'}<div className="muted">{s.licenceVerified ? 'verified' : 'claim, not verified'}</div></td>
                    <td className="small">{s.lastVerifiedAt ? fmtDate(s.lastVerifiedAt) : <span className="muted">never</span>}</td>
                    <td className="num" title={`${s.publishedFactCount} published · ${s.ingestedFactCount} ingested`}>{s.factCount}</td>
                    <td className="num">
                      <div className="row" style={{ justifyContent: 'flex-end' }}>
                        <button className="btn btn-sm btn-ghost" onClick={() => setOpenId(openId === s.id ? null : s.id)}>{openId === s.id ? 'Hide' : 'Details'}</button>
                        {can('content:write') && <button className="btn btn-sm" onClick={() => { setEditing(s.id); setForm({ title: s.title, publisher: s.publisher, url: s.url, accessedOn: s.accessedOn ?? '', notes: s.notes ?? '' }); window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }); }}>Edit</button>}
                        {can('content:verify') && s.origin !== 'editorial' && <button className="btn btn-sm" disabled={busy === s.id} onClick={() => verify(s.id)}>{busy === s.id ? 'Checking…' : 'Verify now'}</button>}
                      </div>
                    </td>
                  </tr>
                  {openId === s.id && (
                    <tr>
                      <td colSpan={6} style={{ background: 'var(--surface-2)' }}>
                        <div className="grid grid-2" style={{ alignItems: 'start' }}>
                          <div>
                            <div className="small"><strong>Licence</strong>: {s.licenceName ?? '—'} {s.licenceUrl && <a href={s.licenceUrl} target="_blank" rel="noreferrer noopener">terms</a>}</div>
                            <div className="small">Commercial use: {yn(s.commercialUseAllowed)} · redistribution: {yn(s.redistributionAllowed)} · attribution: {yn(s.attributionRequired)} · share-alike: {yn(s.shareAlikeRequired)} · API key: {yn(s.apiKeyRequired)}</div>
                            <div className="small">Content types: {s.contentTypesAllowed.join(', ') || 'none'}</div>
                            <div className="small">Rate limits: {s.rateLimitNotes ?? '—'}</div>
                            <div className="small">Evidence: {s.verificationEvidenceUrl ? <a href={s.verificationEvidenceUrl} target="_blank" rel="noreferrer noopener">{s.verificationEvidenceUrl}</a> : '—'}</div>
                            <div className="small">Accessed on: {s.accessedOn ?? 'not yet fetched'} · last check {relTime(s.lastCheckedAt)}{s.consecutiveFailures ? ` · ${s.consecutiveFailures} failed check(s) in a row` : ''}</div>
                            {s.suspensionReason && <div className="small">Suspended: {s.suspensionReason}</div>}
                            <p className="small" style={{ whiteSpace: 'pre-wrap', marginTop: 8 }}>{s.notes}</p>
                          </div>
                          <div>
                            <h3 style={{ marginBottom: 6 }}>History</h3>
                            {!events ? <div className="small muted">Loading…</div> : events.length === 0 ? <div className="small muted">No events.</div> : (
                              <div className="table-wrap"><table><tbody>
                                {events.slice(0, 8).map((e) => <tr key={e.id}><td className="small">{fmtDate(e.at)}</td><td className="small">{e.outcome}{e.fromStatus !== e.toStatus ? ` · ${e.fromStatus ?? '—'} → ${e.toStatus ?? '—'}` : ''}<div className="muted">{e.detail}</div></td></tr>)}
                              </tbody></table></div>
                            )}
                            {can('content:publish') && s.origin !== 'editorial' && (
                              <div style={{ marginTop: 10 }}>
                                <h3 style={{ marginBottom: 6 }}>Decide this source</h3>
                                <p className="small muted">Only after you have read the licence at the evidence URL. Your decision is locked against the automation.</p>
                                <div className="row">
                                  <select className="input" value={decision.verificationStatus} onChange={(e) => setDecision({ ...decision, verificationStatus: e.target.value })} aria-label="New status">
                                    {['approved', 'pending_review', 'restricted'].map((x) => <option key={x} value={x}>{x.replace(/_/g, ' ')}</option>)}
                                  </select>
                                  <input className="input" placeholder="Licence name (e.g. CC BY 4.0)" value={decision.licenceName} onChange={(e) => setDecision({ ...decision, licenceName: e.target.value })} aria-label="Licence name" />
                                </div>
                                <input className="input" style={{ marginTop: 6 }} placeholder="Evidence URL (https)" value={decision.verificationEvidenceUrl} onChange={(e) => setDecision({ ...decision, verificationEvidenceUrl: e.target.value })} aria-label="Evidence URL" />
                                <div className="row" style={{ marginTop: 6 }}>
                                  <button className="btn btn-sm btn-primary" onClick={() => decide(s)}>Save decision</button>
                                  {s.statusLocked && <button className="btn btn-sm" onClick={() => toggle(s, { statusLocked: false })}>Unlock (let automation decide)</button>}
                                  <button className="btn btn-sm" onClick={() => toggle(s, { ingestionSuspended: !s.ingestionSuspended })}>{s.ingestionSuspended ? 'Resume ingestion' : 'Suspend ingestion'}</button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
              {data && data.length === 0 && <tr><td colSpan={6} className="empty">No sources match.</td></tr>}
            </tbody>
          </table></div>
        </section>

        {can('content:write') && (
          <form onSubmit={save} className="card" style={{ gridColumn: 'span 2' }}>
            <h2 style={{ marginBottom: 12 }}>{editing ? 'Edit source' : 'Add a source'}</h2>
            <p className="small muted">Optional: the registry already adds the standard sources. A source you add starts as &ldquo;pending review&rdquo; until its licence is verified.</p>
            <div className="form-grid">
              <label className="field"><span>Publisher</span><input className="input" required maxLength={120} value={form.publisher} onChange={(e) => setForm({ ...form, publisher: e.target.value })} placeholder="NASA, Britannica, ISRO…" /></label>
              <label className="field"><span>Title</span><input className="input" required maxLength={200} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
              <label className="field"><span>URL (https)</span><input className="input" required type="url" maxLength={500} value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} /></label>
              <label className="field"><span>Accessed on</span><input className="input" type="date" value={form.accessedOn} onChange={(e) => setForm({ ...form, accessedOn: e.target.value })} /></label>
            </div>
            <label className="field"><span>Notes</span><textarea className="input" rows={2} maxLength={2000} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
            <div className="row"><button className="btn btn-primary">{editing ? 'Save' : 'Add source'}</button>{editing && <button type="button" className="btn btn-ghost" onClick={() => { setEditing(null); setForm(EMPTY); }}>Cancel</button>}</div>
          </form>
        )}
      </div>
    </div>
  );
}
