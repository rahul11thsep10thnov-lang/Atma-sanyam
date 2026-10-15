'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, errorMessage } from '@/lib/api';
import { useCan } from './ConsoleShell';
import { BracketPicker, JsonField, LinesField, STATUS_HELP } from './catalogue';
import { ErrorAlert, OkAlert } from './ui';

export interface Craft {
  id: string; title: string; kind: 'origami' | 'paper_craft' | 'drawing' | 'digital'; description: string; brackets: string[]; difficulty: number; estimatedMinutes: number;
  materials: string[]; hazards: string[]; adultSupervision: boolean; physical: boolean; steps: unknown[]; finalPreview: Record<string, unknown> | null; checklist: string[]; status: string; sortOrder: number; updatedAt?: string;
}

const HAZARDS = ['scissors', 'glue', 'craft_knife', 'wire', 'needle', 'hot_glue', 'small_parts', 'paint'];
export const EMPTY_CRAFT: Craft = { id: '', title: '', kind: 'origami', description: '', brackets: ['B'], difficulty: 1, estimatedMinutes: 10, materials: ['1 square sheet of paper (15 cm)'], hazards: [], adultSupervision: false, physical: true, steps: [{ title: 'Fold in half', text: 'Fold the square in half.', diagram: { folds: [{ from: [8, 50], to: [92, 50], kind: 'valley' }], arrows: [{ from: [50, 12], to: [50, 88], curve: 24 }] } }], finalPreview: { emoji: '🦢' }, checklist: ['My folds are sharp and flat'], status: 'draft', sortOrder: 100 };

export function CraftForm({ initial }: { initial?: Craft }) {
  const router = useRouter();
  const can = useCan();
  const [form, setForm] = useState<Craft>(initial ?? EMPTY_CRAFT);
  const [stepsOk, setStepsOk] = useState(true);
  const [previewOk, setPreviewOk] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const set = <K extends keyof Craft>(k: K, v: Craft[K]) => setForm((f) => ({ ...f, [k]: v }));
  const canEdit = can('content:write');
  const canPublish = can('content:publish');

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!stepsOk || !previewOk) { setErr('Fix the JSON fields first.'); return; }
    setBusy(true); setErr(null); setOk(null);
    const body = {
      title: form.title, kind: form.kind, description: form.description, brackets: form.brackets, difficulty: Number(form.difficulty), estimatedMinutes: Number(form.estimatedMinutes), materials: form.materials,
      hazards: form.hazards, adultSupervision: form.adultSupervision, physical: form.physical, steps: form.steps, finalPreview: form.finalPreview, checklist: form.checklist, sortOrder: Number(form.sortOrder),
      ...(canPublish || !initial ? { status: form.status } : {}),
    };
    try {
      if (initial) {
        const saved = await api<Craft>(`crafts/${initial.id}`, { method: 'PATCH', body });
        setForm(saved); setOk('Saved.');
      } else {
        const saved = await api<Craft>('crafts', { method: 'POST', body: { ...body, ...(form.id ? { id: form.id } : {}) } });
        router.push(`/crafts/${saved.id}`);
      }
    } catch (e2) { setErr(errorMessage(e2)); } finally { setBusy(false); }
  }

  return (
    <form onSubmit={save} className="grid grid-2" style={{ alignItems: 'start' }}>
      <section className="card">
        <h2 style={{ marginBottom: 12 }}>Tutorial</h2>
        <ErrorAlert error={err} />
        <OkAlert message={ok} />
        {!initial && <label className="field"><span>Id (slug, optional)</span><input className="input" pattern="[a-z0-9-]{2,60}" value={form.id} onChange={(e) => set('id', e.target.value)} /><small>Generated from the title if empty.</small></label>}
        <label className="field"><span>Title</span><input className="input" required maxLength={80} disabled={!canEdit} value={form.title} onChange={(e) => set('title', e.target.value)} /></label>
        <label className="field"><span>Description</span><textarea className="input" rows={3} maxLength={1000} disabled={!canEdit} value={form.description} onChange={(e) => set('description', e.target.value)} /></label>
        <div className="form-grid">
          <label className="field"><span>Kind</span>
            <select className="input" disabled={!canEdit} value={form.kind} onChange={(e) => { const kind = e.target.value as Craft['kind']; set('kind', kind); set('physical', kind !== 'digital'); }}>
              <option value="origami">Origami</option><option value="paper_craft">Paper craft</option><option value="drawing">Drawing</option><option value="digital">On-screen (digital)</option>
            </select>
          </label>
          <label className="field"><span>Difficulty (1–5)</span><input className="input" type="number" min={1} max={5} disabled={!canEdit} value={form.difficulty} onChange={(e) => set('difficulty', Number(e.target.value))} /></label>
          <label className="field"><span>Estimated minutes</span><input className="input" type="number" min={1} max={180} disabled={!canEdit} value={form.estimatedMinutes} onChange={(e) => set('estimatedMinutes', Number(e.target.value))} /></label>
          <label className="field"><span>Sort order</span><input className="input" type="number" min={0} disabled={!canEdit} value={form.sortOrder} onChange={(e) => set('sortOrder', Number(e.target.value))} /></label>
        </div>
        <label className="field"><span>Age brackets</span><BracketPicker value={form.brackets} onChange={(v) => set('brackets', v)} disabled={!canEdit} /></label>
        <LinesField label="Materials (one per line)" value={form.materials} onChange={(v) => set('materials', v)} help="Say exactly what the child needs: paper size, colours, tools." />
        <label className="field"><span>Hazardous materials</span>
          <div className="row">{HAZARDS.map((h) => <label key={h} className="check" style={{ marginBottom: 0 }}><input type="checkbox" disabled={!canEdit} checked={form.hazards.includes(h)} onChange={(e) => { const hz = e.target.checked ? [...form.hazards, h] : form.hazards.filter((x) => x !== h); set('hazards', hz); if (hz.length) set('adultSupervision', true); }} />{h.replace('_', ' ')}</label>)}</div>
          <small>Any hazard forces “adult supervision” on; the app shows the warning before the first step.</small>
        </label>
        <label className="check"><input type="checkbox" disabled={!canEdit} checked={form.adultSupervision} onChange={(e) => set('adultSupervision', e.target.checked)} /> Needs a grown-up</label>
        <label className="check"><input type="checkbox" disabled={!canEdit} checked={form.physical} onChange={(e) => set('physical', e.target.checked)} /> Real-world craft (needs materials); untick for on-screen activities</label>
        <LinesField label="Checklist (one per line)" value={form.checklist} onChange={(v) => set('checklist', v)} help="Shown at the end for the child to tick off." />
      </section>
      <div className="stack">
        <section className="card">
          <h2 style={{ marginBottom: 12 }}>Steps</h2>
          <JsonField label="Steps (JSON)" value={form.steps} rows={22} help='Array of { "title", "text", "tip"?, "caution"?, "diagram"? }. Diagram: { paper, after, folds:[{from,to,kind}], arrows:[{from,to,curve}], shade, color, labels } in a 0–100 square (see src/crafts/FoldDiagram.tsx).' onChange={(v, valid) => { setStepsOk(valid); if (valid) set('steps', v as unknown[]); }} />
          <JsonField label="Final preview (JSON)" value={form.finalPreview ?? {}} rows={5} help='{ "emoji": "⛵", "diagram": {...} } or, for digital tutorials, { "emoji", "gameId" }.' onChange={(v, valid) => { setPreviewOk(valid); if (valid) set('finalPreview', v as Record<string, unknown>); }} />
        </section>
        <section className="card">
          <h2 style={{ marginBottom: 12 }}>Publishing</h2>
          <label className="field"><span>Status</span>
            <select className="input" disabled={!canPublish && !!initial} value={form.status} onChange={(e) => set('status', e.target.value)}>{['draft', 'in_development', 'published', 'archived'].map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}</select>
            <small>{STATUS_HELP[form.status]} Publishing requires at least one step and supervision for any hazard.</small>
          </label>
          {canEdit && <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : initial ? 'Save changes' : 'Create tutorial'}</button>}
        </section>
      </div>
    </form>
  );
}
