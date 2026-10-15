'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, errorMessage, useApi } from '@/lib/api';
import { useCan } from './ConsoleShell';
import { BracketPicker } from './catalogue';
import { ErrorAlert, OkAlert } from './ui';

export const FACT_CATEGORIES: { key: string; name: string }[] = [
  { key: 'space', name: 'Space & Astronomy' }, { key: 'animals', name: 'Animals & Wildlife' }, { key: 'senses', name: 'Human Senses & Nature' }, { key: 'oceans', name: 'Oceans & Marine Life' },
  { key: 'dinosaurs', name: 'Dinosaurs & Prehistoric Life' }, { key: 'experiments', name: 'Science Experiments' }, { key: 'physics', name: 'Physics & Everyday Phenomena' }, { key: 'plants', name: 'Plants & Forests' },
  { key: 'inventions', name: 'Inventions & Discoveries' }, { key: 'india', name: 'Indian History & Heritage' }, { key: 'geography', name: 'Geography & Unusual Places' }, { key: 'weather', name: 'Weather & Climate' },
  { key: 'maths', name: 'Mathematics & Patterns' }, { key: 'technology', name: 'Technology & Robotics' }, { key: 'engineering', name: 'Engineering & Machines' }, { key: 'food', name: 'Food & How Things Are Made' },
  { key: 'adaptations', name: "Nature's Unusual Adaptations" }, { key: 'ancient', name: 'Ancient Civilisations' }, { key: 'mysteries', name: 'Puzzles, Paradoxes & Mysteries' },
];
export const ILLUSTRATIONS = ['sparkles', 'sun', 'moon', 'rocket', 'paw', 'eye', 'waves', 'bone', 'flask', 'zap', 'leaf', 'lightbulb', 'landmark', 'globe', 'cloud', 'hash', 'cpu', 'wrench', 'utensils', 'scroll', 'puzzle', 'phone', 'star', 'heart', 'brain', 'book'];

export interface Source { id: string; title: string; publisher: string; url: string; accessedOn: string | null; notes: string | null }
export interface Fact {
  id: string; slug: string; category: string; headline: string; body: string; whyText: string; followUpQuestion: string; brackets: string[]; readingLevel: number; illustration: string;
  sourceId: string | null; status: 'draft' | 'verified' | 'published' | 'archived'; verifiedAt: string | null; publishedAt: string | null; updatedAt: string;
}

export const EMPTY_FACT: Fact = { id: '', slug: '', category: 'animals', headline: '', body: '', whyText: '', followUpQuestion: '', brackets: ['B', 'C'], readingLevel: 2, illustration: 'sparkles', sourceId: null, status: 'draft', verifiedAt: null, publishedAt: null, updatedAt: '' };

export function FactForm({ initial, onSaved }: { initial?: Fact; onSaved?: (f: Fact) => void }) {
  const router = useRouter();
  const can = useCan();
  const { data: sources } = useApi<Source[]>('fact-sources');
  const [form, setForm] = useState<Fact>(initial ?? EMPTY_FACT);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const set = <K extends keyof Fact>(k: K, v: Fact[K]) => setForm((f) => ({ ...f, [k]: v }));
  const canEdit = can('content:write');

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null); setOk(null);
    const body = { category: form.category, headline: form.headline, body: form.body, whyText: form.whyText, followUpQuestion: form.followUpQuestion, brackets: form.brackets, readingLevel: Number(form.readingLevel), illustration: form.illustration, sourceId: form.sourceId || null, ...(form.slug ? { slug: form.slug } : {}) };
    try {
      if (initial) {
        const saved = await api<Fact>(`facts/${initial.id}`, { method: 'PATCH', body });
        setForm(saved); setOk(saved.status === 'draft' && initial.status !== 'draft' ? 'Saved. The wording changed, so the fact is back in draft and must be verified again.' : 'Saved.'); onSaved?.(saved);
      } else {
        const saved = await api<Fact>('facts', { method: 'POST', body });
        router.push(`/facts/${saved.id}`);
      }
    } catch (e2) { setErr(errorMessage(e2)); } finally { setBusy(false); }
  }

  return (
    <form onSubmit={save} className="card">
      <ErrorAlert error={err} />
      <OkAlert message={ok} />
      <label className="field"><span>Headline</span><input className="input" required maxLength={120} disabled={!canEdit} value={form.headline} onChange={(e) => set('headline', e.target.value)} /><small>One surprising sentence a child can read aloud.</small></label>
      <label className="field"><span>Explanation</span><textarea className="input" rows={3} required maxLength={1200} disabled={!canEdit} value={form.body} onChange={(e) => set('body', e.target.value)} /></label>
      <label className="field"><span>Why does this happen?</span><textarea className="input" rows={3} maxLength={1200} disabled={!canEdit} value={form.whyText} onChange={(e) => set('whyText', e.target.value)} /></label>
      <label className="field"><span>Follow-up question</span><input className="input" maxLength={200} disabled={!canEdit} value={form.followUpQuestion} onChange={(e) => set('followUpQuestion', e.target.value)} /><small>Something to think or talk about, not a quiz.</small></label>
      <div className="form-grid">
        <label className="field"><span>Category</span><select className="input" disabled={!canEdit} value={form.category} onChange={(e) => set('category', e.target.value)}>{FACT_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.name}</option>)}</select></label>
        <label className="field"><span>Illustration</span><select className="input" disabled={!canEdit} value={form.illustration} onChange={(e) => set('illustration', e.target.value)}>{ILLUSTRATIONS.map((i) => <option key={i} value={i}>{i}</option>)}</select></label>
        <label className="field"><span>Reading level (1 simplest – 4)</span><input className="input" type="number" min={1} max={4} disabled={!canEdit} value={form.readingLevel} onChange={(e) => set('readingLevel', Number(e.target.value))} /></label>
        {!initial && <label className="field"><span>Slug (optional)</span><input className="input" pattern="[a-z0-9-]{2,60}" value={form.slug} onChange={(e) => set('slug', e.target.value)} /></label>}
      </div>
      <label className="field"><span>Age brackets</span><BracketPicker value={form.brackets} onChange={(v) => set('brackets', v)} disabled={!canEdit} /></label>
      <label className="field"><span>Source</span>
        <select className="input" disabled={!canEdit} value={form.sourceId ?? ''} onChange={(e) => set('sourceId', e.target.value || null)}>
          <option value="">— No source yet (cannot be verified or published) —</option>
          {sources?.map((s) => <option key={s.id} value={s.id}>{s.publisher} — {s.title}</option>)}
        </select>
        <small>Changing the source or wording puts a published fact back into draft.</small>
      </label>
      {canEdit && <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : initial ? 'Save changes' : 'Create draft'}</button>}
    </form>
  );
}
