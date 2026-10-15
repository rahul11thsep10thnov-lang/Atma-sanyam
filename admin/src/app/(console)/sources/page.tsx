'use client';

import { useState } from 'react';
import { api, errorMessage, useApi } from '@/lib/api';
import { ErrorAlert, Forbidden, OkAlert, PageHead } from '@/components/ui';
import { useCan } from '@/components/ConsoleShell';
import type { Source } from '@/components/FactForm';

const EMPTY = { title: '', publisher: '', url: 'https://', accessedOn: new Date().toISOString().slice(0, 10), notes: '' };

export default function SourcesPage() {
  const can = useCan();
  const [search, setSearch] = useState('');
  const { data, error, reload } = useApi<Source[]>(can('content:read') ? 'fact-sources' : null, { search });
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  if (!can('content:read')) return <Forbidden />;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setOk(null);
    const body = { ...form, notes: form.notes || null, accessedOn: form.accessedOn || null };
    try {
      if (editing) await api(`fact-sources/${editing}`, { method: 'PATCH', body });
      else await api('fact-sources', { method: 'POST', body });
      setOk(editing ? 'Source updated.' : 'Source added.'); setForm(EMPTY); setEditing(null); await reload();
    } catch (e2) { setErr(errorMessage(e2)); }
  }

  return (
    <div>
      <PageHead title="Fact sources" subtitle="Every published fact cites one of these. Use the publisher's own page (https), and record when you read it." />
      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        <section className="card">
          <div className="card-head"><h2>Sources ({data?.length ?? 0})</h2><input className="input" type="search" placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search sources" style={{ maxWidth: 220 }} /></div>
          <ErrorAlert error={error} />
          <div className="table-wrap"><table>
            <thead><tr><th>Publisher</th><th>Title</th><th>Accessed</th><th /></tr></thead>
            <tbody>
              {data?.map((s) => (
                <tr key={s.id}>
                  <td>{s.publisher}</td>
                  <td><a href={s.url} target="_blank" rel="noreferrer noopener">{s.title}</a>{s.notes && <div className="small muted">{s.notes}</div>}</td>
                  <td className="small">{s.accessedOn ?? '—'}</td>
                  <td className="num">{can('content:write') && <button className="btn btn-sm" onClick={() => { setEditing(s.id); setForm({ title: s.title, publisher: s.publisher, url: s.url, accessedOn: s.accessedOn ?? '', notes: s.notes ?? '' }); }}>Edit</button>}</td>
                </tr>
              ))}
              {data && data.length === 0 && <tr><td colSpan={4} className="empty">No sources yet.</td></tr>}
            </tbody>
          </table></div>
        </section>
        {can('content:write') && (
          <form onSubmit={save} className="card">
            <h2 style={{ marginBottom: 12 }}>{editing ? 'Edit source' : 'Add a source'}</h2>
            <ErrorAlert error={err} />
            <OkAlert message={ok} />
            <label className="field"><span>Publisher</span><input className="input" required maxLength={120} value={form.publisher} onChange={(e) => setForm({ ...form, publisher: e.target.value })} placeholder="NASA, Britannica, ISRO…" /></label>
            <label className="field"><span>Title</span><input className="input" required maxLength={200} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
            <label className="field"><span>URL (https)</span><input className="input" required type="url" maxLength={500} value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} /></label>
            <label className="field"><span>Accessed on</span><input className="input" type="date" value={form.accessedOn} onChange={(e) => setForm({ ...form, accessedOn: e.target.value })} /></label>
            <label className="field"><span>Notes</span><textarea className="input" rows={2} maxLength={500} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
            <div className="row"><button className="btn btn-primary">{editing ? 'Save' : 'Add source'}</button>{editing && <button type="button" className="btn btn-ghost" onClick={() => { setEditing(null); setForm(EMPTY); }}>Cancel</button>}</div>
          </form>
        )}
      </div>
    </div>
  );
}
