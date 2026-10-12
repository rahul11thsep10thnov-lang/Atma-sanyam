'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { api, errorMessage, useApi } from '@/lib/api';
import { categoryOptions, type Category } from './categories';
import { useCan } from './ConsoleShell';
import { ErrorAlert, OkAlert } from './ui';

export interface ContentItem {
  id: string;
  title: string;
  categoryId: string | null;
  subcategoryId: string | null;
  tags: string[];
  thumbnailUrl: string;
  mediumUrl: string;
  fullUrl: string;
  source: string;
  creator: string;
  license: string;
  attributionRequired: boolean;
  attributionText: string | null;
  status: 'draft' | 'published';
  popularity: number;
  publishedAt: string | null;
  updatedAt: string;
}

const EMPTY = {
  title: '',
  categoryId: '',
  subcategoryId: '',
  tags: '',
  thumbnailUrl: '',
  mediumUrl: '',
  fullUrl: '',
  source: '',
  creator: '',
  license: '',
  attributionRequired: false,
  attributionText: '',
  status: 'draft' as 'draft' | 'published',
};

export function ContentForm({ initial, onSaved }: { initial?: ContentItem; onSaved?: (item: ContentItem) => void }) {
  const router = useRouter();
  const can = useCan();
  const { data: cats } = useApi<Category[]>('categories');
  const options = useMemo(() => categoryOptions(cats ?? []), [cats]);
  const [form, setForm] = useState(() =>
    initial
      ? {
          ...EMPTY,
          ...initial,
          categoryId: initial.categoryId ?? '',
          subcategoryId: initial.subcategoryId ?? '',
          tags: initial.tags.join(', '),
          attributionText: initial.attributionText ?? '',
        }
      : EMPTY
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const roots = options.filter((o) => o.depth === 0);
  const subs = options.filter((o) => o.depth > 0 && (!form.categoryId || o.rootId === form.categoryId));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setOk(null);
    const body = {
      title: form.title,
      categoryId: form.categoryId || null,
      subcategoryId: form.subcategoryId || null,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      thumbnailUrl: form.thumbnailUrl,
      mediumUrl: form.mediumUrl,
      fullUrl: form.fullUrl,
      source: form.source,
      creator: form.creator,
      license: form.license,
      attributionRequired: form.attributionRequired,
      attributionText: form.attributionText || null,
      ...(can('content:publish') ? { status: form.status } : {}),
    };
    try {
      const saved = initial
        ? await api<ContentItem>(`content/${initial.id}`, { method: 'PATCH', body })
        : await api<ContentItem>('content', { method: 'POST', body });
      if (initial) {
        setOk('Saved.');
        onSaved?.(saved);
      } else {
        router.push(`/content/${saved.id}?created=1`);
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="grid grid-2" style={{ alignItems: 'start' }}>
      <section className="card">
        <h2 style={{ marginBottom: 12 }}>Details</h2>
        <ErrorAlert error={error} />
        <OkAlert message={ok} />
        <label className="field">
          <span>Title</span>
          <input className="input" required maxLength={120} value={form.title} onChange={(e) => set('title', e.target.value)} />
        </label>
        <div className="form-grid">
          <label className="field">
            <span>Category</span>
            <select className="input" value={form.categoryId} onChange={(e) => { set('categoryId', e.target.value); set('subcategoryId', ''); }}>
              <option value="">— None —</option>
              {roots.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Sub-category</span>
            <select className="input" value={form.subcategoryId} onChange={(e) => set('subcategoryId', e.target.value)}>
              <option value="">— None —</option>
              {subs.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </label>
        </div>
        <label className="field">
          <span>Tags</span>
          <input className="input" placeholder="snow, sunrise, calm" value={form.tags} onChange={(e) => set('tags', e.target.value)} />
          <small>Comma-separated. Used for search in the app.</small>
        </label>
        <h3 style={{ margin: '8px 0 10px' }}>Image files (https)</h3>
        <label className="field">
          <span>Thumbnail URL</span>
          <input className="input" type="url" required value={form.thumbnailUrl} onChange={(e) => set('thumbnailUrl', e.target.value)} />
          <small>~160px square, shown in the library grid.</small>
        </label>
        <label className="field">
          <span>Medium URL</span>
          <input className="input" type="url" required value={form.mediumUrl} onChange={(e) => set('mediumUrl', e.target.value)} />
        </label>
        <label className="field">
          <span>Full-size URL</span>
          <input className="input" type="url" required value={form.fullUrl} onChange={(e) => set('fullUrl', e.target.value)} />
          <small>~1080px, used as the puzzle image.</small>
        </label>
      </section>

      <div className="stack">
        <section className="card">
          <h2 style={{ marginBottom: 4 }}>Rights & attribution</h2>
          <p className="small muted" style={{ marginTop: 0 }}>Required. Only publish images you are licensed to redistribute.</p>
          <label className="field">
            <span>Source</span>
            <input className="input" required placeholder="e.g. Unsplash, own photo, licensed from…" value={form.source} onChange={(e) => set('source', e.target.value)} />
          </label>
          <label className="field">
            <span>Creator</span>
            <input className="input" required value={form.creator} onChange={(e) => set('creator', e.target.value)} />
          </label>
          <label className="field">
            <span>License</span>
            <input className="input" required placeholder="e.g. CC BY 4.0, Unsplash License, commercial license #123" value={form.license} onChange={(e) => set('license', e.target.value)} />
          </label>
          <label className="check">
            <input type="checkbox" checked={form.attributionRequired} onChange={(e) => set('attributionRequired', e.target.checked)} />
            Attribution must be shown in the app
          </label>
          {form.attributionRequired && (
            <label className="field">
              <span>Attribution text</span>
              <input className="input" required value={form.attributionText} onChange={(e) => set('attributionText', e.target.value)} placeholder="Photo by … on …" />
              <small>Shown on the puzzle screen while this image is in use.</small>
            </label>
          )}
        </section>

        <section className="card">
          <h2 style={{ marginBottom: 12 }}>Publishing</h2>
          {can('content:publish') ? (
            <div className="segmented" role="group" aria-label="Status" style={{ marginBottom: 12 }}>
              <button type="button" aria-pressed={form.status === 'draft'} onClick={() => set('status', 'draft')}>Draft</button>
              <button type="button" aria-pressed={form.status === 'published'} onClick={() => set('status', 'published')}>Published</button>
            </div>
          ) : (
            <p className="small muted">You can save drafts; an editor or admin with publish rights will publish it.</p>
          )}
          <p className="small muted" style={{ marginTop: 0 }}>Published images appear in the app’s library within a minute.</p>
          <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : initial ? 'Save changes' : 'Create'}</button>
        </section>

        {form.mediumUrl && /^https?:\/\//.test(form.mediumUrl) && (
          <section className="card">
            <h2 style={{ marginBottom: 12 }}>Preview</h2>
            <img src={form.mediumUrl} alt={form.title || 'Preview'} style={{ width: '100%', borderRadius: 8, display: 'block' }} referrerPolicy="no-referrer" />
          </section>
        )}
      </div>
    </form>
  );
}
