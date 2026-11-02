'use client';

import { useEffect, useState } from 'react';
import { api, errorMessage, useApi } from '@/lib/api';
import { fmtDate } from '@/lib/format';
import type { Flag } from '@/lib/dadu';
import { ErrorAlert, Forbidden, OkAlert, PageHead } from '@/components/ui';
import { useCan } from '@/components/ConsoleShell';

const KNOWN: { key: string; value: unknown; help: string }[] = [
  { key: 'dadu.temple.default_on', value: false, help: 'Whether the Wisdom Temple is on for new child profiles aged 4 and over. It is always off for ages 0–4 and always parent-controlled.' },
  { key: 'dadu.languages.enabled', value: ['en', 'hi'], help: 'Languages offered on the first screen. Add a language only when its UI strings and launch content are proofread.' },
  { key: 'dadu.echo.every_n_lessons', value: 3, help: "How many lessons between Mitthu's Echo revision moments." },
  { key: 'dadu.legacy_tame_visible', value: false, help: 'Shows the legacy Tame focus timer behind the parental gate (for existing users only).' },
];

function FlagCard({ flag, canEdit, onSaved }: { flag: Flag & { help?: string; seeded?: boolean }; canEdit: boolean; onSaved: () => void }) {
  const [text, setText] = useState(() => JSON.stringify(flag.value, null, 2));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  useEffect(() => setText(JSON.stringify(flag.value, null, 2)), [flag.value]);

  async function save() {
    setBusy(true);
    setError(null);
    setOk(null);
    let value: unknown;
    try {
      value = JSON.parse(text);
    } catch (e) {
      setError(`Invalid JSON: ${(e as Error).message}`);
      setBusy(false);
      return;
    }
    try {
      await api(`dadu/flags/${encodeURIComponent(flag.key)}`, { method: 'PUT', body: { value } });
      setOk('Saved.');
      onSaved();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card">
      <div className="card-head">
        <h2 className="mono" style={{ fontSize: 15 }}>{flag.key}</h2>
        <span className="small muted">{flag.seeded ? 'not set yet (default shown)' : `updated ${fmtDate(flag.updatedAt)}`}</span>
      </div>
      {flag.help && <p className="small muted" style={{ marginTop: 0 }}>{flag.help}</p>}
      <ErrorAlert error={error} />
      <OkAlert message={ok} />
      <textarea className="input mono" value={text} onChange={(e) => setText(e.target.value)} disabled={!canEdit} spellCheck={false} style={{ minHeight: 72 }} />
      {canEdit && <button className="btn btn-primary btn-sm" style={{ marginTop: 8 }} disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save'}</button>}
    </section>
  );
}

export default function FlagsPage() {
  const can = useCan();
  const [newKey, setNewKey] = useState('');
  const { data, error, loading, reload } = useApi<{ flags: Flag[] }>(can('dadu:content:read') ? 'dadu/flags' : null);
  if (!can('dadu:content:read')) return <Forbidden />;
  const existing = data?.flags ?? [];
  const merged = [
    ...existing.map((f) => ({ ...f, help: KNOWN.find((k) => k.key === f.key)?.help })),
    ...KNOWN.filter((k) => !existing.some((f) => f.key === k.key)).map((k) => ({ key: k.key, value: k.value, updatedAt: null, help: k.help, seeded: true })),
  ];
  const canEdit = can('dadu:flags:write');

  return (
    <div>
      <PageHead title="DADU feature flags" subtitle="Server-side switches read by the app's remote configuration. Values are JSON." />
      <ErrorAlert error={error} />
      <div className={`stack ${loading ? 'loading-dim' : ''}`}>
        {merged.map((f) => <FlagCard key={f.key} flag={f} canEdit={canEdit} onSaved={reload} />)}
        {canEdit && (
          <section className="card">
            <h2 style={{ marginBottom: 8 }}>Add a flag</h2>
            <div className="row">
              <input className="input mono" style={{ width: 320 }} placeholder="dadu.some.flag" value={newKey} onChange={(e) => setNewKey(e.target.value)} />
              <button className="btn btn-sm" disabled={!/^[a-z0-9_.]+$/.test(newKey)} onClick={async () => { try { await api(`dadu/flags/${encodeURIComponent(newKey)}`, { method: 'PUT', body: { value: false } }); setNewKey(''); await reload(); } catch { /* shown by card on reload */ } }}>Create (false)</button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
