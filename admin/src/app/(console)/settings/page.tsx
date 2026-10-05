'use client';

import { useState } from 'react';
import { useCan, useMe } from '@/components/ConsoleShell';
import { ErrorAlert, Loading, OkAlert, PageHead, StatusBadge } from '@/components/ui';
import { api, errorMessage, useApi } from '@/lib/api';
import { relTime } from '@/lib/format';

interface Settings {
  pipeline: {
    batchSize: number;
    maxRetries: number;
    generationTimeoutMs: number;
    reviewTimeoutMs: number;
    maxQuestionsPerJob: number;
    monthlyBudgetUsd: number | null;
    autoApprove: boolean;
    minReviewConfidence: number;
    reviewBatchSize: number;
  };
  ai: { provider: string; mockAi: boolean; generationModel: string; reviewModel: string; effort: string; apiKeyConfigured: boolean };
  worker: { enabled: boolean; concurrency: number };
}

interface SiteSettings {
  quote: string;
  quoteAttribution: string;
  plan: { name: string; priceInr: number; listPriceInr: number; durationDays: number };
  freeQuota: { full: number; subject: number };
  popup: { enabled: boolean; title: string; body: string; cta: string };
}

export default function SettingsPage() {
  const can = useCan();
  return (
    <>
      <PageHead title="Settings" subtitle="Website text and plan, AI pipeline and spending controls, console accounts and your password." />
      <WebsiteSettings />
      <PipelineSettings />
      {can('settings:write') && <AlertSettings />}
      {can('admins:write') && <Admins />}
      <Password />
    </>
  );
}

/** Where operator alerts go. Channels are set in the API's environment
 * (ALERT_WEBHOOK_URL, TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID), never here. */
function AlertSettings() {
  const { data, error } = useApi<{ channels: { webhook: boolean; telegram: boolean } }>('alerts');
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function test() {
    setBusy(true);
    setMsg(null);
    setErr(null);
    try {
      const r = await api<{ delivered: { webhook?: boolean; telegram?: boolean } }>('alerts/test', { method: 'POST' });
      const parts = Object.entries(r.delivered).map(([k, ok]) => `${k === 'webhook' ? 'Slack/Discord' : 'Telegram'}: ${ok ? 'sent' : 'FAILED'}`);
      if (Object.values(r.delivered).some((ok) => !ok)) setErr(`${parts.join(' · ')}. Check the URL / bot token and chat id.`);
      else setMsg(`${parts.join(' · ')}. Check the channel for the message.`);
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  if (!data) return error ? <ErrorAlert error={error} /> : <Loading />;
  const { webhook, telegram } = data.channels;
  return (
    <div className="card">
      <h2 style={{ marginBottom: 10 }}>Alerts</h2>
      <p className="small muted" style={{ marginTop: 0 }}>
        Server errors, crashes, a database that stops answering, failed generation jobs and payments whose signature does not verify are sent
        to the team at once (repeats are grouped, at most one message per kind every 10 minutes). Channels are set in the API’s environment —
        see docs/OPERATIONS.md.
      </p>
      <div className="row" style={{ marginBottom: 10 }}>
        <span className={`badge ${webhook ? 'badge-good' : ''}`}>Slack / Discord webhook: {webhook ? 'on' : 'not set'}</span>
        <span className={`badge ${telegram ? 'badge-good' : ''}`}>Telegram: {telegram ? 'on' : 'not set'}</span>
        <button className="btn" onClick={test} disabled={busy || (!webhook && !telegram)}>
          {busy ? 'Sending…' : 'Send test alert'}
        </button>
      </div>
      {!webhook && !telegram && (
        <div className="alert alert-warn">No alert channel is set, so nobody is told when something breaks. Set ALERT_WEBHOOK_URL or TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID on the API and restart it.</div>
      )}
      <OkAlert message={msg} />
      <ErrorAlert error={err} />
    </div>
  );
}

/** Quotation under the website name, the Mock Test Pass plan, free quotas
 * and the welcome popup — served to the website by GET /api/site. */
function WebsiteSettings() {
  const can = useCan();
  const { data, error, setData } = useApi<{ site: SiteSettings; payments: { razorpay: boolean; devActivate: boolean } }>('site-settings');
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  if (!data) return error ? <ErrorAlert error={error} /> : <Loading />;
  const s = data.site;
  const editable = can('settings:write');
  const set = (patch: Partial<SiteSettings>) => setData({ ...data, site: { ...s, ...patch } });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    try {
      const r = await api<{ site: SiteSettings }>('site-settings', { method: 'PUT', body: s });
      setData({ ...data!, site: r.site });
      setMsg('Website settings saved. The site picks them up within a minute.');
    } catch (e2) {
      setErr(errorMessage(e2));
    }
  }

  return (
    <form className="card" onSubmit={save}>
      <h2 style={{ marginBottom: 10 }}>Website</h2>
      <OkAlert message={msg} />
      <ErrorAlert error={err} />
      <div className="form-grid">
        <label className="field" style={{ gridColumn: '1 / -1' }}>
          <span>Quotation under the website name</span>
          <input className="input" lang="hi" disabled={!editable} maxLength={160} value={s.quote} onChange={(e) => set({ quote: e.target.value })} />
          <small>Shown in a Devanagari display font right below “PoliceExams”.</small>
        </label>
        <label className="field">
          <span>Attribution (optional)</span>
          <input className="input" disabled={!editable} maxLength={80} value={s.quoteAttribution} onChange={(e) => set({ quoteAttribution: e.target.value })} />
        </label>
        <label className="field">
          <span>Plan name</span>
          <input className="input" disabled={!editable} maxLength={60} value={s.plan.name} onChange={(e) => set({ plan: { ...s.plan, name: e.target.value } })} />
        </label>
        <label className="field">
          <span>Price (₹)</span>
          <input className="input" type="number" min={1} disabled={!editable} value={s.plan.priceInr} onChange={(e) => set({ plan: { ...s.plan, priceInr: Number(e.target.value) } })} />
          <small>What the user pays.</small>
        </label>
        <label className="field">
          <span>List price (₹, shown struck through)</span>
          <input className="input" type="number" min={1} disabled={!editable} value={s.plan.listPriceInr} onChange={(e) => set({ plan: { ...s.plan, listPriceInr: Number(e.target.value) } })} />
        </label>
        <label className="field">
          <span>Validity (days)</span>
          <input className="input" type="number" min={1} max={3650} disabled={!editable} value={s.plan.durationDays} onChange={(e) => set({ plan: { ...s.plan, durationDays: Number(e.target.value) } })} />
          <small>365 = one full year from enrolment.</small>
        </label>
        <label className="field">
          <span>Free full-paper tests per user</span>
          <input className="input" type="number" min={0} max={100} disabled={!editable} value={s.freeQuota.full} onChange={(e) => set({ freeQuota: { ...s.freeQuota, full: Number(e.target.value) } })} />
        </label>
        <label className="field">
          <span>Free subject-wise tests per user</span>
          <input className="input" type="number" min={0} max={100} disabled={!editable} value={s.freeQuota.subject} onChange={(e) => set({ freeQuota: { ...s.freeQuota, subject: Number(e.target.value) } })} />
          <small>After these, the enrolment popup appears when a test is attempted.</small>
        </label>
        <label className="field">
          <span>Popup title</span>
          <input className="input" lang="hi" disabled={!editable} maxLength={120} value={s.popup.title} onChange={(e) => set({ popup: { ...s.popup, title: e.target.value } })} />
        </label>
        <label className="field">
          <span>Popup button</span>
          <input className="input" lang="hi" disabled={!editable} maxLength={40} value={s.popup.cta} onChange={(e) => set({ popup: { ...s.popup, cta: e.target.value } })} />
        </label>
        <label className="field" style={{ gridColumn: '1 / -1' }}>
          <span>Popup text</span>
          <textarea className="input" lang="hi" rows={3} disabled={!editable} maxLength={600} value={s.popup.body} onChange={(e) => set({ popup: { ...s.popup, body: e.target.value } })} />
        </label>
      </div>
      <label className="check">
        <input type="checkbox" disabled={!editable} checked={s.popup.enabled} onChange={(e) => set({ popup: { ...s.popup, enabled: e.target.checked } })} />
        Show the welcome popup on the first page open of each visit.
      </label>
      <p className="small muted">
        Payments: {data.payments.razorpay ? 'Razorpay configured on the server.' : 'Razorpay keys not set — '}
        {!data.payments.razorpay && (data.payments.devActivate ? 'dev activation is ON (test mode, no money moves).' : 'enrolment is disabled until RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are set.')}
      </p>
      {editable && <button className="btn btn-primary">Save website settings</button>}
    </form>
  );
}

function PipelineSettings() {
  const can = useCan();
  const { data, error, setData } = useApi<Settings>('settings');
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  if (!data) return error ? <ErrorAlert error={error} /> : <Loading />;
  const p = data.pipeline;
  const editable = can('settings:write');
  const set = (patch: Partial<Settings['pipeline']>) => setData({ ...data, pipeline: { ...p, ...patch } });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      const r = await api<{ pipeline: Settings['pipeline'] }>('settings', { method: 'PUT', body: p });
      setData({ ...data!, pipeline: r.pipeline });
      setMsg('Settings saved. New jobs use them immediately.');
    } catch (e2) {
      setErr(errorMessage(e2));
    }
  }

  const num = (label: string, value: number, onChange: (n: number) => void, hint: string, attrs: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="field">
      <span>{label}</span>
      <input className="input" type="number" disabled={!editable} value={value} onChange={(e) => onChange(Number(e.target.value))} {...attrs} />
      <small>{hint}</small>
    </label>
  );

  return (
    <>
      <div className="card">
        <h2 style={{ marginBottom: 10 }}>AI provider</h2>
        {data.ai.mockAi ? (
          <div className="alert alert-warn">
            <strong>MOCK_AI is on.</strong> Questions are generated locally for testing — no AI provider is called and nothing is spent. Set
            MOCK_AI=false and AI_API_KEY in the API’s environment to generate real questions.
          </div>
        ) : null}
        <dl className="meta-grid">
          <dt>Provider</dt>
          <dd>{data.ai.provider}</dd>
          <dt>Generation model</dt>
          <dd>{data.ai.generationModel}</dd>
          <dt>Review model</dt>
          <dd>{data.ai.reviewModel}</dd>
          <dt>Effort</dt>
          <dd>{data.ai.effort}</dd>
          <dt>API key</dt>
          <dd>{data.ai.apiKeyConfigured ? 'configured on the server (never shown)' : 'not set'}</dd>
          <dt>Worker</dt>
          <dd>{data.worker.enabled ? `running in the API, ${data.worker.concurrency} batch(es) at a time` : 'separate worker process'}</dd>
        </dl>
        <p className="small muted" style={{ marginBottom: 0 }}>
          Models and keys are set in the API’s environment variables so they never reach a browser.
        </p>
      </div>

      <form className="card" onSubmit={save}>
        <h2 style={{ marginBottom: 10 }}>Pipeline & cost controls</h2>
        <OkAlert message={msg} />
        <ErrorAlert error={err} />
        <div className="form-grid">
          {num('Batch size', p.batchSize, (n) => set({ batchSize: n }), 'Questions per AI request (1–50). 20 is a good balance.', { min: 1, max: 50 })}
          {num('Maximum retries per batch', p.maxRetries, (n) => set({ maxRetries: n }), 'After this, the batch is FAILED (0–5). Never retried forever.', { min: 0, max: 5 })}
          {num('Generation timeout (seconds)', Math.round(p.generationTimeoutMs / 1000), (n) => set({ generationTimeoutMs: n * 1000 }), 'Per AI request.', { min: 10, max: 1800 })}
          {num('Review timeout (seconds)', Math.round(p.reviewTimeoutMs / 1000), (n) => set({ reviewTimeoutMs: n * 1000 }), 'Per AI review request.', { min: 10, max: 1800 })}
          {num('Max questions per job', p.maxQuestionsPerJob, (n) => set({ maxQuestionsPerJob: n }), 'Bigger requests are refused.', { min: 1, max: 10000 })}
          {num('Review batch size', p.reviewBatchSize, (n) => set({ reviewBatchSize: n }), 'Questions per AI review request.', { min: 1, max: 25 })}
          <label className="field">
            <span>Monthly AI budget (USD)</span>
            <input
              className="input"
              type="number"
              min={0}
              step="1"
              disabled={!editable}
              placeholder="No cap"
              value={p.monthlyBudgetUsd ?? ''}
              onChange={(e) => set({ monthlyBudgetUsd: e.target.value ? Number(e.target.value) : null })}
            />
            <small>Jobs that would exceed it are refused, and running jobs stop.</small>
          </label>
          {num(
            'Minimum AI reviewer confidence for approval',
            p.minReviewConfidence,
            (n) => set({ minReviewConfidence: n }),
            'Below this, questions wait in NEEDS_REVIEW.',
            { min: 0, max: 1, step: 0.05 }
          )}
        </div>
        <label className="check">
          <input type="checkbox" disabled={!editable} checked={p.autoApprove} onChange={(e) => set({ autoApprove: e.target.checked })} />
          Let the AI reviewer mark clean questions APPROVED (they still need an admin to publish). Turn off to review every question by hand.
        </label>
        {editable && <button className="btn btn-primary">Save settings</button>}
      </form>
    </>
  );
}

interface AdminRow {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  lastLoginAt: string | null;
}

function Admins() {
  const me = useMe();
  const { data, error, reload } = useApi<{ items: AdminRow[]; roles: { key: string; name: string }[] }>('admins');
  const [form, setForm] = useState({ email: '', name: '', role: 'reviewer', password: '' });
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      await api('admins', { method: 'POST', body: form });
      setMsg(`Account for ${form.email} created. Share the password privately; they can change it here.`);
      setForm({ email: '', name: '', role: 'reviewer', password: '' });
      await reload();
    } catch (e2) {
      setErr(errorMessage(e2));
    }
  }
  async function update(a: AdminRow, patch: Record<string, string>) {
    setErr(null);
    try {
      await api(`admins/${a.id}`, { method: 'PUT', body: patch });
      await reload();
    } catch (e) {
      setErr(errorMessage(e));
    }
  }

  return (
    <div className="card">
      <h2 style={{ marginBottom: 10 }}>Console accounts</h2>
      <p className="small muted" style={{ marginTop: 0 }}>
        Super Admin: everything. Admin: everything except accounts. Reviewer: inspect, edit, approve and reject — cannot publish or spend AI budget.
      </p>
      <OkAlert message={msg} />
      <ErrorAlert error={err ?? error} />
      <div className="table-wrap">
        <table>
          <tbody>
            {data?.items.map((a) => (
              <tr key={a.id}>
                <td>
                  <strong>{a.name}</strong>
                  <div className="small muted">{a.email}</div>
                </td>
                <td>
                  <select
                    className="input"
                    style={{ height: 30 }}
                    aria-label={`Role for ${a.email}`}
                    disabled={a.id === me.id}
                    value={a.role}
                    onChange={(e) => update(a, { role: e.target.value })}
                  >
                    {data.roles.map((r) => (
                      <option key={r.key} value={r.key}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <StatusBadge status={a.status === 'archived' ? 'disabled' : a.status} />
                </td>
                <td className="small muted">last login {relTime(a.lastLoginAt)}</td>
                <td style={{ textAlign: 'right' }}>
                  {a.id !== me.id && (
                    <button className="btn btn-sm" onClick={() => update(a, { status: a.status === 'active' ? 'archived' : 'active' })}>
                      {a.status === 'active' ? 'Disable' : 'Enable'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <form onSubmit={create} style={{ marginTop: 16 }}>
        <h3 style={{ marginBottom: 8 }}>Add an account</h3>
        <div className="form-grid">
          <label className="field">
            <span>Email</span>
            <input className="input" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </label>
          <label className="field">
            <span>Name</span>
            <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <label className="field">
            <span>Role</span>
            <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {data?.roles.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Temporary password</span>
            <input className="input" type="password" autoComplete="new-password" required minLength={12} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <small>At least 12 characters with a letter and a number.</small>
          </label>
        </div>
        <button className="btn btn-primary">Create account</button>
      </form>
    </div>
  );
}

function Password() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      await api('auth/password', { method: 'POST', body: { currentPassword: current, newPassword: next } });
      setMsg('Password changed. Signing you out everywhere…');
      // All sessions were revoked; a full reload lands on the sign-in page.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      setTimeout(() => (window.location.href = '/login'), 1500);
    } catch (e2) {
      setErr(errorMessage(e2));
    }
  }
  return (
    <form className="card" onSubmit={save}>
      <h2 style={{ marginBottom: 10 }}>Change my password</h2>
      <OkAlert message={msg} />
      <ErrorAlert error={err} />
      <div className="form-grid">
        <label className="field">
          <span>Current password</span>
          <input className="input" type="password" autoComplete="current-password" required value={current} onChange={(e) => setCurrent(e.target.value)} />
        </label>
        <label className="field">
          <span>New password</span>
          <input className="input" type="password" autoComplete="new-password" required minLength={12} value={next} onChange={(e) => setNext(e.target.value)} />
        </label>
      </div>
      <button className="btn">Change password</button>
    </form>
  );
}
