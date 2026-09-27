'use client';

import { useState } from 'react';
import { useCan } from '@/components/ConsoleShell';
import { ConfirmButton, ErrorAlert, OkAlert, PageHead } from '@/components/ui';
import { api, errorMessage, useApi } from '@/lib/api';
import { relTime } from '@/lib/format';

interface Source {
  id: string;
  kind: string;
  name: string;
  reference: string | null;
  licenseNote: string | null;
  validFrom: string | null;
  validTo: string | null;
  approved: boolean;
  createdAt: string;
}

const KINDS = [
  { value: 'text', label: 'Reference text' },
  { value: 'syllabus', label: 'Exam syllabus' },
  { value: 'pyq', label: 'Previous-year questions' },
  { value: 'url', label: 'Website / reference link' },
  { value: 'pdf', label: 'PDF (paste its text)' },
];

export default function SourcesPage() {
  const can = useCan();
  const { data, error, reload } = useApi<{ items: Source[] }>('source-materials');
  const [form, setForm] = useState({ kind: 'text', name: '', reference: '', content: '', licenseNote: '', validFrom: '', validTo: '' });
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      await api('source-materials', {
        method: 'POST',
        body: {
          kind: form.kind,
          name: form.name,
          reference: form.reference || null,
          content: form.content || null,
          licenseNote: form.licenseNote || null,
          validFrom: form.validFrom || null,
          validTo: form.validTo || null,
        },
      });
      setMsg('Saved. Approve it before the AI may use it.');
      setOpen(false);
      setForm({ kind: 'text', name: '', reference: '', content: '', licenseNote: '', validFrom: '', validTo: '' });
      await reload();
    } catch (e2) {
      setErr(errorMessage(e2));
    }
  }

  async function approve(id: string) {
    try {
      await api(`source-materials/${id}/approve`, { method: 'POST' });
      setMsg('Approved for generation.');
      await reload();
    } catch (e) {
      setErr(errorMessage(e));
    }
  }

  return (
    <>
      <PageHead
        title="Source Material"
        subtitle="Trusted text the AI must use for factual questions. It is only used after approval, and references are never invented."
        actions={
          can('generation:run') && (
            <button className="btn btn-primary" onClick={() => setOpen(!open)}>
              Add source
            </button>
          )
        }
      />
      <OkAlert message={msg} />
      <ErrorAlert error={err ?? error} />
      {open && (
        <form className="card" onSubmit={create} style={{ marginBottom: 16 }}>
          <div className="form-grid">
            <label className="field">
              <span>Type</span>
              <select className="input" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
                {KINDS.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Name</span>
              <input className="input" required maxLength={300} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. UP GK — official state profile 2025" />
            </label>
            <label className="field">
              <span>Reference (URL, book + edition, notification no.)</span>
              <input className="input" maxLength={1000} value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
            </label>
            <label className="field">
              <span>Licence / permission note</span>
              <input className="input" maxLength={1000} value={form.licenseNote} onChange={(e) => setForm({ ...form, licenseNote: e.target.value })} placeholder="e.g. Government publication; own notes" />
            </label>
            <label className="field">
              <span>Period covered from (current affairs)</span>
              <input className="input" type="date" value={form.validFrom} onChange={(e) => setForm({ ...form, validFrom: e.target.value })} />
            </label>
            <label className="field">
              <span>Period covered to</span>
              <input className="input" type="date" value={form.validTo} onChange={(e) => setForm({ ...form, validTo: e.target.value })} />
            </label>
          </div>
          <label className="field">
            <span>Content (the text the AI may draw facts from)</span>
            <textarea className="input" rows={8} maxLength={200000} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
            <small>Only paste material you are allowed to use. Previous-year papers are kept as reference, not copied into new questions.</small>
          </label>
          <button className="btn btn-primary">Save</button>
        </form>
      )}
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Source</th>
                <th>Type</th>
                <th>Period</th>
                <th>Status</th>
                <th>Added</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data?.items.map((s) => (
                <tr key={s.id}>
                  <td>
                    <strong>{s.name}</strong>
                    <div className="small muted">{[s.reference, s.licenseNote].filter(Boolean).join(' · ')}</div>
                  </td>
                  <td className="small">{KINDS.find((k) => k.value === s.kind)?.label ?? s.kind}</td>
                  <td className="small">{s.validFrom || s.validTo ? `${s.validFrom ?? '…'} → ${s.validTo ?? '…'}` : '—'}</td>
                  <td>{s.approved ? <span className="badge badge-good">APPROVED</span> : <span className="badge badge-warn">NOT APPROVED</span>}</td>
                  <td className="small muted">{relTime(s.createdAt)}</td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {!s.approved && can('questions:publish') && (
                      <button className="btn btn-sm btn-good" onClick={() => approve(s.id)}>
                        Approve
                      </button>
                    )}{' '}
                    {can('generation:run') && (
                      <ConfirmButton
                        label="Delete"
                        confirm={`Delete "${s.name}"? Questions keep their reference text.`}
                        onConfirm={async () => {
                          await api(`source-materials/${s.id}`, { method: 'DELETE' });
                          await reload();
                        }}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data?.items.length === 0 && <div className="empty">No source material yet.</div>}
        </div>
      </div>
    </>
  );
}
