'use client';

import { useState } from 'react';
import { api, errorMessage, useApi } from '@/lib/api';
import { fmtDate, fmtNumber } from '@/lib/format';
import { LANGS, LANG_NAMES, type DaduPack } from '@/lib/dadu';
import { ConfirmButton, ErrorAlert, Forbidden, OkAlert, PageHead, StatusBadge } from '@/components/ui';
import { useCan } from '@/components/ConsoleShell';

const PACK_KINDS = ['core', 'characters', 'environments', 'language', 'lessons', 'stories', 'audio', 'activities'] as const;

export default function PacksPage() {
  const can = useCan();
  const [kind, setKind] = useState<string>('lessons');
  const [language, setLanguage] = useState<string>('en');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const { data, error: listError, loading, reload } = useApi<{ items: DaduPack[] } | DaduPack[]>(can('dadu:content:read') ? 'dadu/packs' : null);
  if (!can('dadu:content:read')) return <Forbidden />;
  const packs: DaduPack[] = Array.isArray(data) ? data : data?.items ?? [];

  async function build(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      const p = await api<DaduPack>('dadu/packs/build', { method: 'POST', body: { kind, language } });
      setOk(`Built ${p.kind}/${p.language} version ${p.version} (${p.itemCount ?? '?'} items).`);
      await reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function publish(p: DaduPack) {
    setError(null);
    try {
      await api(`dadu/packs/${p.id}/publish`, { method: 'POST' });
      await reload();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <div>
      <PageHead title="Offline packs" subtitle="Versioned bundles of published content that the app downloads per language. Building snapshots what is published now; publishing makes the version visible to devices." />
      <ErrorAlert error={listError || error} />
      <OkAlert message={ok} />
      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        <section className={`card ${loading ? 'loading-dim' : ''}`}>
          <h2 style={{ marginBottom: 12 }}>Packs</h2>
          {packs.length === 0 ? (
            <div className="empty">No packs built yet.</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Pack</th><th className="num">Ver.</th><th>Status</th><th className="num">Items</th><th className="num">Size</th><th>Built</th><th /></tr></thead>
                <tbody>
                  {packs.map((p) => (
                    <tr key={p.id}>
                      <td><strong>{p.kind}</strong> <span className="small muted">{LANG_NAMES[p.language as keyof typeof LANG_NAMES] ?? p.language}</span></td>
                      <td className="num">{p.version}</td>
                      <td><StatusBadge status={p.status} /></td>
                      <td className="num">{p.itemCount ?? '—'}</td>
                      <td className="num small">{p.bytes ? `${fmtNumber(Math.round(p.bytes / 1024))} KB` : '—'}</td>
                      <td className="small muted">{fmtDate(p.createdAt)}</td>
                      <td>
                        <div className="row" style={{ justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                          <button className="btn btn-sm" onClick={() => setOpen(open === p.id ? null : p.id)}>{open === p.id ? 'Hide' : 'Manifest'}</button>
                          {p.status !== 'published' && can('dadu:content:publish') && (
                            <ConfirmButton className="btn btn-sm btn-primary" label="Publish" confirm={`Publish ${p.kind}/${p.language} version ${p.version}? Devices will download it on their next check.`} onConfirm={() => publish(p)} />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {open && (
            <pre className="mono small" style={{ marginTop: 12, padding: 12, background: 'var(--surface-2)', borderRadius: 8, overflowX: 'auto', maxHeight: 420 }}>
              {JSON.stringify(packs.find((p) => p.id === open)?.manifest ?? {}, null, 2)}
            </pre>
          )}
        </section>
        {can('dadu:content:publish') && (
          <form className="card" onSubmit={build}>
            <h2 style={{ marginBottom: 12 }}>Build a pack</h2>
            <label className="field"><span>Kind</span>
              <select className="input" value={kind} onChange={(e) => setKind(e.target.value)}>{PACK_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}</select>
            </label>
            <label className="field"><span>Language</span>
              <select className="input" value={language} onChange={(e) => setLanguage(e.target.value)}>{LANGS.map((l) => <option key={l} value={l}>{LANG_NAMES[l]}</option>)}</select>
              <small>Language-independent kinds (characters, environments) ignore this field.</small>
            </label>
            <button className="btn btn-primary" disabled={busy}>{busy ? 'Building…' : 'Build'}</button>
          </form>
        )}
      </div>
    </div>
  );
}
