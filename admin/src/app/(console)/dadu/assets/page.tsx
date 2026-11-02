'use client';

import { useState } from 'react';
import { ApiError, api, errorMessage, useApi } from '@/lib/api';
import { fmtNumber, relTime } from '@/lib/format';
import { CHARACTERS, type DaduAsset } from '@/lib/dadu';
import { ConfirmButton, ErrorAlert, Forbidden, OkAlert, PageHead, Pager } from '@/components/ui';
import { useCan } from '@/components/ConsoleShell';

const KINDS = ['image', 'sprite', 'rig', 'audio', 'music', 'sfx', 'video', 'font', 'illustration'] as const;

const EMPTY = {
  kind: 'image' as string, url: '', mime: '', bytes: '', width: '', height: '', durationMs: '', sha256: '',
  licence: '', source: '', creator: '', attributionRequired: false, attributionText: '', characterKey: '', locationId: '',
};

export default function AssetsPage() {
  const can = useCan();
  const [kind, setKind] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState({ ...EMPTY });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const { data, error: listError, loading, reload } = useApi<{ items: DaduAsset[]; total: number; page: number; pageSize: number }>(
    can('dadu:content:read') ? 'dadu/assets' : null,
    { kind, q, page, pageSize: 25 }
  );
  if (!can('dadu:content:read')) return <Forbidden />;
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));
  const num = (s: string) => (s.trim() === '' ? null : Number(s));

  async function register(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      await api('dadu/assets', {
        method: 'POST',
        body: {
          kind: form.kind, url: form.url, mime: form.mime, bytes: Number(form.bytes), width: num(form.width), height: num(form.height), durationMs: num(form.durationMs),
          sha256: form.sha256.toLowerCase(), licence: form.licence, source: form.source, creator: form.creator, attributionRequired: form.attributionRequired,
          attributionText: form.attributionText || null, characterKey: form.characterKey || null, locationId: form.locationId || null,
        },
      });
      setOk('Asset registered.');
      setForm({ ...EMPTY });
      await reload();
    } catch (err) {
      setError(err instanceof ApiError && err.status === 409 ? `Duplicate: an asset with this SHA-256 or URL is already registered. ${err.message}` : errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove(a: DaduAsset) {
    setActionError(null);
    try {
      await api(`dadu/assets/${a.id}`, { method: 'DELETE' });
      await reload();
    } catch (e) {
      setActionError(errorMessage(e));
    }
  }

  return (
    <div>
      <PageHead title="Media assets" subtitle="Registry of every illustration, sprite, rig, voice line and track with its licence. Files are uploaded to object storage separately; register the final URL here." />
      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        <div className="stack">
          <div className="filters">
            <input className="input" type="search" placeholder="Search URL, creator, source" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} aria-label="Search assets" />
            <select className="input" value={kind} onChange={(e) => { setKind(e.target.value); setPage(1); }} aria-label="Kind">
              <option value="">All kinds</option>
              {KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <ErrorAlert error={listError || actionError} />
          <section className={`card ${loading ? 'loading-dim' : ''}`}>
            {data && data.items.length === 0 ? (
              <div className="empty">No assets registered yet.</div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Asset</th><th>Kind</th><th>Licence</th><th className="num">Size</th><th>Linked to</th><th>Added</th><th /></tr></thead>
                  <tbody>
                    {data?.items.map((a) => (
                      <tr key={a.id}>
                        <td>
                          {a.kind === 'image' || a.kind === 'illustration' || a.kind === 'sprite' ? <img className="thumb" src={a.url} alt="" loading="lazy" referrerPolicy="no-referrer" /> : null}
                          <a className="small mono" href={a.url} target="_blank" rel="noreferrer">{a.url.length > 48 ? `…${a.url.slice(-45)}` : a.url}</a>
                          <div className="small muted">{a.creator} · {a.source}</div>
                        </td>
                        <td className="small">{a.kind}</td>
                        <td className="small">{a.licence}{a.attributionRequired && <div className="muted">attribution required</div>}</td>
                        <td className="num small">{fmtNumber(Math.round(a.bytes / 1024))} KB</td>
                        <td className="small">{a.characterKey ?? a.locationId ?? '—'}</td>
                        <td className="small muted">{relTime(a.createdAt)}</td>
                        <td>{can('dadu:content:write') && <ConfirmButton label="Delete" confirm="Delete this asset record? Content that references it will fail its rights check until it is re-registered." onConfirm={() => remove(a)} />}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {data && <Pager page={data.page} pageSize={data.pageSize} total={data.total} onPage={setPage} />}
          </section>
        </div>

        {can('dadu:content:write') && (
          <form className="card" onSubmit={register}>
            <h2 style={{ marginBottom: 4 }}>Register an asset</h2>
            <p className="small muted" style={{ marginTop: 0 }}>Upload the file to the asset bucket first (see docs/dadu/22-assets.md), then record it here. Licence, source and creator are mandatory; nothing is published without them.</p>
            <ErrorAlert error={error} />
            <OkAlert message={ok} />
            <div className="form-grid">
              <label className="field"><span>Kind</span>
                <select className="input" value={form.kind} onChange={(e) => set('kind', e.target.value)}>{KINDS.map((k) => <option key={k} value={k}>{k}</option>)}</select>
              </label>
              <label className="field"><span>MIME type</span><input className="input" required placeholder="image/webp" value={form.mime} onChange={(e) => set('mime', e.target.value)} /></label>
            </div>
            <label className="field"><span>URL (https)</span><input className="input" type="url" required value={form.url} onChange={(e) => set('url', e.target.value)} /></label>
            <div className="form-grid">
              <label className="field"><span>Bytes</span><input className="input" type="number" min={1} required value={form.bytes} onChange={(e) => set('bytes', e.target.value)} /></label>
              <label className="field"><span>SHA-256</span><input className="input mono" required pattern="[A-Fa-f0-9]{64}" value={form.sha256} onChange={(e) => set('sha256', e.target.value)} /><small>Used for duplicate detection.</small></label>
              <label className="field"><span>Width</span><input className="input" type="number" value={form.width} onChange={(e) => set('width', e.target.value)} /></label>
              <label className="field"><span>Height</span><input className="input" type="number" value={form.height} onChange={(e) => set('height', e.target.value)} /></label>
              <label className="field"><span>Duration (ms, audio/video)</span><input className="input" type="number" value={form.durationMs} onChange={(e) => set('durationMs', e.target.value)} /></label>
            </div>
            <h3 style={{ margin: '8px 0 10px' }}>Rights</h3>
            <label className="field"><span>Licence</span><input className="input" required placeholder="Work for hire (contract #…), CC BY 4.0, SIL OFL…" value={form.licence} onChange={(e) => set('licence', e.target.value)} /></label>
            <div className="form-grid">
              <label className="field"><span>Source</span><input className="input" required value={form.source} onChange={(e) => set('source', e.target.value)} /></label>
              <label className="field"><span>Creator</span><input className="input" required value={form.creator} onChange={(e) => set('creator', e.target.value)} /></label>
            </div>
            <label className="check"><input type="checkbox" checked={form.attributionRequired} onChange={(e) => set('attributionRequired', e.target.checked)} /> Attribution must be shown</label>
            {form.attributionRequired && <label className="field"><span>Attribution text</span><input className="input" required value={form.attributionText} onChange={(e) => set('attributionText', e.target.value)} /></label>}
            <h3 style={{ margin: '8px 0 10px' }}>Associations (optional)</h3>
            <div className="form-grid">
              <label className="field"><span>Character</span>
                <select className="input" value={form.characterKey} onChange={(e) => set('characterKey', e.target.value)}><option value="">—</option>{CHARACTERS.map((c) => <option key={c.key} value={c.key}>{c.name}</option>)}</select>
              </label>
              <label className="field"><span>Location ID</span><input className="input mono" placeholder="villa.living" value={form.locationId} onChange={(e) => set('locationId', e.target.value)} /></label>
            </div>
            <button className="btn btn-primary" disabled={busy}>{busy ? 'Registering…' : 'Register asset'}</button>
          </form>
        )}
      </div>
    </div>
  );
}
