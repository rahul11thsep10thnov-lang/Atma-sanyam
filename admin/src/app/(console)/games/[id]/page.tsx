'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api, errorMessage, useApi } from '@/lib/api';
import { fmtDate } from '@/lib/format';
import { ErrorAlert, Forbidden, OkAlert, PageHead, StatusBadge } from '@/components/ui';
import { useCan } from '@/components/ConsoleShell';
import { BracketPicker, JsonField, LinesField, STATUS_HELP } from '@/components/catalogue';

interface Game {
  id: string; name: string; tagline: string; description: string; instructions: string; categoryId: string | null; brackets: string[];
  difficulties: { key: string; label: string; brackets?: string[] }[]; skills: string[]; contentRating: string; estimatedMinutes: number; offlineCapable: boolean;
  assetLicense: string; status: string; sortOrder: number; updatedAt: string; approvals?: { id: string; status: string; note: string | null; createdAt: string }[];
}
interface Category { id: string; name: string }

const EMPTY: Game = { id: '', name: '', tagline: '', description: '', instructions: '', categoryId: null, brackets: ['B'], difficulties: [{ key: 'normal', label: 'Normal' }], skills: [], contentRating: 'everyone', estimatedMinutes: 5, offlineCapable: true, assetLicense: 'original', status: 'draft', sortOrder: 100, updatedAt: '' };

export default function GameEditorPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';
  const router = useRouter();
  const can = useCan();
  const { data, error } = useApi<Game>(can('content:read') && !isNew ? `games/${id}` : null);
  const { data: categories } = useApi<Category[]>(can('content:read') ? 'game-categories' : null);
  const [form, setForm] = useState<Game>(EMPTY);
  const [difficultiesOk, setDifficultiesOk] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  useEffect(() => { if (data) setForm(data); }, [data]);
  if (!can('content:read')) return <Forbidden />;
  const set = <K extends keyof Game>(k: K, v: Game[K]) => setForm((f) => ({ ...f, [k]: v }));
  const canEdit = can('content:write');
  const canPublish = can('content:publish');

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!difficultiesOk) { setErr('Fix the difficulties JSON first.'); return; }
    setBusy(true); setErr(null); setOk(null);
    const body = {
      name: form.name, tagline: form.tagline, description: form.description, instructions: form.instructions, categoryId: form.categoryId || null, brackets: form.brackets,
      difficulties: form.difficulties, skills: form.skills, contentRating: form.contentRating, estimatedMinutes: Number(form.estimatedMinutes), offlineCapable: form.offlineCapable,
      assetLicense: form.assetLicense, sortOrder: Number(form.sortOrder), ...(canPublish || isNew ? { status: form.status } : {}),
    };
    try {
      if (isNew) {
        const saved = await api<Game>('games', { method: 'POST', body: { ...body, id: form.id } });
        router.push(`/games/${saved.id}`);
      } else {
        const saved = await api<Game>(`games/${id}`, { method: 'PATCH', body });
        setForm(saved); setOk('Saved.');
      }
    } catch (e2) { setErr(errorMessage(e2)); } finally { setBusy(false); }
  }

  return (
    <div>
      <p className="small"><Link href="/games">← Games</Link></p>
      <PageHead title={isNew ? 'New game entry' : form.name || 'Game'} subtitle={isNew ? 'A catalogue entry for a game the app ships. Keep it in development until the app build with its rules is live.' : `${form.id} · updated ${fmtDate(form.updatedAt)}`} actions={!isNew && <StatusBadge status={form.status} />} />
      <ErrorAlert error={error ?? err} />
      <OkAlert message={ok} />
      <form onSubmit={save} className="grid grid-2" style={{ alignItems: 'start' }}>
        <section className="card">
          <h2 style={{ marginBottom: 12 }}>What children see</h2>
          {isNew && <label className="field"><span>Id (slug, must match the app's game registry)</span><input className="input" required pattern="[a-z0-9-]{2,60}" value={form.id} onChange={(e) => set('id', e.target.value)} /></label>}
          <label className="field"><span>Name</span><input className="input" required maxLength={80} disabled={!canEdit} value={form.name} onChange={(e) => set('name', e.target.value)} /></label>
          <label className="field"><span>Tagline</span><input className="input" maxLength={120} disabled={!canEdit} value={form.tagline} onChange={(e) => set('tagline', e.target.value)} /></label>
          <label className="field"><span>Description</span><textarea className="input" rows={3} maxLength={1000} disabled={!canEdit} value={form.description} onChange={(e) => set('description', e.target.value)} /></label>
          <label className="field"><span>How to play (read aloud to younger children)</span><textarea className="input" rows={5} maxLength={3000} disabled={!canEdit} value={form.instructions} onChange={(e) => set('instructions', e.target.value)} /></label>
          <div className="form-grid">
            <label className="field"><span>Category</span>
              <select className="input" disabled={!canEdit} value={form.categoryId ?? ''} onChange={(e) => set('categoryId', e.target.value || null)}><option value="">— None —</option>{categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
            </label>
            <label className="field"><span>Estimated minutes</span><input className="input" type="number" min={1} max={120} disabled={!canEdit} value={form.estimatedMinutes} onChange={(e) => set('estimatedMinutes', Number(e.target.value))} /></label>
          </div>
          <label className="field"><span>Age brackets</span><BracketPicker value={form.brackets} onChange={(v) => set('brackets', v)} disabled={!canEdit} /></label>
          <LinesField label="Skills (one per line)" value={form.skills} onChange={(v) => set('skills', v)} />
        </section>
        <div className="stack">
          <section className="card">
            <h2 style={{ marginBottom: 12 }}>Publishing</h2>
            <label className="field"><span>Status</span>
              <select className="input" disabled={!canPublish && !isNew} value={form.status} onChange={(e) => set('status', e.target.value)}>
                {['draft', 'in_development', 'published', 'archived'].map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
              <small>{STATUS_HELP[form.status]}{!canPublish && ' Only admins with content:publish can change the status.'}</small>
            </label>
            <div className="form-grid">
              <label className="field"><span>Sort order</span><input className="input" type="number" min={0} disabled={!canEdit} value={form.sortOrder} onChange={(e) => set('sortOrder', Number(e.target.value))} /></label>
              <label className="field"><span>Content rating</span><input className="input" disabled={!canEdit} value={form.contentRating} onChange={(e) => set('contentRating', e.target.value)} /></label>
            </div>
            <label className="check"><input type="checkbox" disabled={!canEdit} checked={form.offlineCapable} onChange={(e) => set('offlineCapable', e.target.checked)} /> Playable offline</label>
            <label className="field"><span>Asset licence</span><input className="input" maxLength={200} disabled={!canEdit} value={form.assetLicense} onChange={(e) => set('assetLicense', e.target.value)} /><small>Games ship with original emoji and vector art; record the licence if that changes.</small></label>
          </section>
          <section className="card">
            <h2 style={{ marginBottom: 12 }}>Difficulties</h2>
            <JsonField label="Difficulty levels (JSON)" value={form.difficulties} rows={8} help='Array of { "key", "label", "brackets"? }. Keys are passed to the game engine.' onChange={(v, valid) => { setDifficultiesOk(valid); if (valid) set('difficulties', v as Game['difficulties']); }} />
          </section>
          {canEdit && <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : isNew ? 'Create' : 'Save changes'}</button>}
          {!isNew && form.approvals && form.approvals.length > 0 && (
            <section className="card">
              <h2>Approval trail</h2>
              <div className="table-wrap"><table><tbody>{form.approvals.map((a) => <tr key={a.id}><td><StatusBadge status={a.status} /></td><td className="small">{a.note}</td><td className="small muted num">{fmtDate(a.createdAt)}</td></tr>)}</tbody></table></div>
            </section>
          )}
        </div>
      </form>
    </div>
  );
}
