'use client';

import { useMemo, useState } from 'react';
import { api, errorMessage, useApi } from '@/lib/api';
import { categoryOptions, type Category } from '@/components/categories';
import { ConfirmButton, ErrorAlert, Forbidden, OkAlert, PageHead } from '@/components/ui';
import { useCan } from '@/components/ConsoleShell';

export default function CategoriesPage() {
  const can = useCan();
  const { data, error, reload } = useApi<Category[]>(can('content:read') ? 'categories' : null);
  const options = useMemo(() => categoryOptions(data ?? []), [data]);
  const byId = useMemo(() => new Map((data ?? []).map((c) => [c.id, c])), [data]);
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  if (!can('content:read')) return <Forbidden />;

  async function run(fn: () => Promise<unknown>, message: string) {
    setActionError(null);
    setOk(null);
    try {
      await fn();
      setOk(message);
      await reload();
    } catch (e) {
      setActionError(errorMessage(e));
    }
  }

  return (
    <div>
      <PageHead title="Categories" subtitle="The hierarchy the app’s library browser shows (e.g. Nature › Mountains › Himalayas)." />
      <ErrorAlert error={error || actionError} />
      <OkAlert message={ok} />
      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        <section className="card">
          <h2 style={{ marginBottom: 12 }}>All categories</h2>
          {options.length === 0 ? (
            <div className="empty">No categories yet.</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Name</th><th className="num">Images</th><th /></tr></thead>
                <tbody>
                  {options.map((o) => {
                    const c = byId.get(o.id)!;
                    return (
                      <tr key={o.id}>
                        <td style={{ paddingLeft: 16 + o.depth * 20 }}>
                          {editing === o.id ? (
                            <form
                              className="row"
                              onSubmit={(e) => {
                                e.preventDefault();
                                void run(() => api(`categories/${o.id}`, { method: 'PATCH', body: { name: editName } }), 'Category renamed.').then(() => setEditing(null));
                              }}
                            >
                              <input className="input" style={{ width: 180 }} value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus />
                              <button className="btn btn-sm btn-primary">Save</button>
                              <button type="button" className="btn btn-sm btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
                            </form>
                          ) : (
                            <>
                              <strong>{c.name}</strong> <span className="small muted mono">{c.id}</span>
                            </>
                          )}
                        </td>
                        <td className="num">{c.contentCount ?? 0}</td>
                        <td>
                          <div className="row" style={{ justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                            {can('content:write') && editing !== o.id && (
                              <button className="btn btn-sm" onClick={() => { setEditing(o.id); setEditName(c.name); }}>Rename</button>
                            )}
                            {can('content:delete') && (
                              <ConfirmButton
                                label="Delete"
                                confirm={`Delete “${c.name}”? Images in it stay but lose this category.`}
                                onConfirm={() => run(() => api(`categories/${o.id}`, { method: 'DELETE' }), 'Category deleted.')}
                              />
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
        {can('content:write') && (
          <section className="card">
            <h2 style={{ marginBottom: 12 }}>Add category</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void run(() => api('categories', { method: 'POST', body: { name, parentId: parentId || null } }), `Category “${name}” added.`).then(() => setName(''));
              }}
            >
              <label className="field">
                <span>Name</span>
                <input className="input" required maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
              </label>
              <label className="field">
                <span>Parent</span>
                <select className="input" value={parentId} onChange={(e) => setParentId(e.target.value)}>
                  <option value="">— Top level —</option>
                  {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
                <small>The id is generated from the parent and name, e.g. <span className="mono">nature-mountains</span>.</small>
              </label>
              <button className="btn btn-primary">Add category</button>
            </form>
          </section>
        )}
      </div>
    </div>
  );
}
