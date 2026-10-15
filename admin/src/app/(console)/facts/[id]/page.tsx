'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, errorMessage, useApi } from '@/lib/api';
import { fmtDate } from '@/lib/format';
import { ConfirmButton, ErrorAlert, Forbidden, OkAlert, PageHead, StatusBadge } from '@/components/ui';
import { useCan } from '@/components/ConsoleShell';
import { FactForm, type Fact, type Source } from '@/components/FactForm';

interface Question { id: string; question: string; options: string[]; correctIndex: number; explanation: string; sortOrder: number }
type Detail = Fact & { source: Source | null; questions: Question[]; approvals: { id: string; status: string; note: string | null; createdAt: string }[] };

const EMPTY_Q = { question: '', options: ['', '', ''], correctIndex: 0, explanation: '' };

export default function FactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const can = useCan();
  const { data, error, reload } = useApi<Detail>(can('content:read') ? `facts/${id}` : null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState(EMPTY_Q);
  const [editing, setEditing] = useState<string | null>(null);
  if (!can('content:read')) return <Forbidden />;

  async function transition(status: Fact['status']) {
    setErr(null); setMsg(null);
    const note = status === 'verified' ? window.prompt('Verification note (what you checked against the source):', 'Checked against the source on ' + new Date().toISOString().slice(0, 10)) ?? undefined : undefined;
    if (status === 'verified' && note === undefined) return;
    try { await api(`facts/${id}/status`, { method: 'POST', body: { status, note } }); setMsg(`Status → ${status}.`); await reload(); } catch (e) { setErr(errorMessage(e)); }
  }
  async function saveQuestion(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const body = { ...q, options: q.options.map((o) => o.trim()).filter(Boolean), sortOrder: editing ? data!.questions.find((x) => x.id === editing)!.sortOrder : data!.questions.length };
    try {
      if (editing) await api(`questions/${editing}`, { method: 'PATCH', body });
      else await api(`facts/${id}/questions`, { method: 'POST', body });
      setQ(EMPTY_Q); setEditing(null); await reload();
    } catch (e2) { setErr(errorMessage(e2)); }
  }
  async function deleteQuestion(qid: string) {
    try { await api(`questions/${qid}`, { method: 'DELETE' }); await reload(); } catch (e) { setErr(errorMessage(e)); }
  }

  const f = data;
  const canWrite = can('content:write');
  return (
    <div>
      <p className="small"><Link href="/facts">← Did You Know?</Link></p>
      <PageHead title={f?.headline ?? 'Fact'} subtitle={f ? `${f.slug} · ${f.verifiedAt ? `verified ${fmtDate(f.verifiedAt)}` : 'not verified'} · ${f.publishedAt ? `published ${fmtDate(f.publishedAt)}` : 'not published'}` : undefined} actions={f && (
        <>
          <StatusBadge status={f.status} />
          {f.status === 'draft' && can('content:verify') && <button className="btn btn-sm" onClick={() => transition('verified')} disabled={!f.sourceId}>Mark verified</button>}
          {f.status === 'verified' && can('content:publish') && <button className="btn btn-sm btn-primary" onClick={() => transition('published')} disabled={f.questions.length === 0}>Publish</button>}
          {f.status === 'published' && can('content:publish') && <ConfirmButton label="Unpublish (archive)" className="btn btn-sm" confirm="Archive this fact? Children will no longer see it." onConfirm={() => transition('archived')} />}
          {(f.status === 'archived' || f.status === 'verified') && canWrite && <button className="btn btn-sm" onClick={() => transition('draft')}>Back to draft</button>}
          {can('content:delete') && <ConfirmButton label="Delete" confirm="Delete this fact and its quiz questions?" onConfirm={async () => { try { await api(`facts/${id}`, { method: 'DELETE' }); router.push('/facts'); } catch (e) { setErr(errorMessage(e)); } }} />}
        </>
      )} />
      <ErrorAlert error={error ?? err} />
      <OkAlert message={msg} />
      {f && (
        <div className="grid grid-2" style={{ alignItems: 'start' }}>
          <div className="stack">
            <FactForm key={f.updatedAt} initial={f} onSaved={() => reload()} />
            {f.source ? (
              <section className="card">
                <h2>Source</h2>
                <p><strong>{f.source.publisher}</strong> — {f.source.title}</p>
                <p className="small"><a href={f.source.url} target="_blank" rel="noreferrer noopener">{f.source.url}</a>{f.source.accessedOn && <span className="muted"> · accessed {f.source.accessedOn}</span>}</p>
                {f.source.notes && <p className="small muted">{f.source.notes}</p>}
              </section>
            ) : <div className="alert alert-warn">No source attached. A fact without a source can never be verified or published.</div>}
          </div>
          <div className="stack">
            <section className="card">
              <h2 style={{ marginBottom: 8 }}>Quiz questions ({f.questions.length})</h2>
              <p className="small muted">At least one is needed to publish. The first option you mark correct is shuffled in the app.</p>
              {f.questions.map((x) => (
                <div key={x.id} className="card" style={{ padding: 12, marginTop: 10 }}>
                  <strong>{x.question}</strong>
                  <ol className="small" style={{ margin: '6px 0 6px 18px' }}>{x.options.map((o, i) => <li key={i} style={i === x.correctIndex ? { fontWeight: 700 } : undefined}>{o}{i === x.correctIndex && ' ✓'}</li>)}</ol>
                  {x.explanation && <div className="small muted">{x.explanation}</div>}
                  {canWrite && <div className="row" style={{ marginTop: 6 }}><button className="btn btn-sm" onClick={() => { setEditing(x.id); setQ({ question: x.question, options: [...x.options, '', '', ''].slice(0, Math.max(3, x.options.length)), correctIndex: x.correctIndex, explanation: x.explanation }); }}>Edit</button><ConfirmButton label="Delete" confirm="Delete this question?" onConfirm={() => deleteQuestion(x.id)} /></div>}
                </div>
              ))}
              {canWrite && (
                <form onSubmit={saveQuestion} style={{ marginTop: 14 }}>
                  <h3 style={{ marginBottom: 8 }}>{editing ? 'Edit question' : 'Add a question'}</h3>
                  <label className="field"><span>Question</span><input className="input" required maxLength={300} value={q.question} onChange={(e) => setQ({ ...q, question: e.target.value })} /></label>
                  {q.options.map((o, i) => (
                    <label key={i} className="field"><span>Option {i + 1}{i === q.correctIndex && ' (correct)'}</span>
                      <div className="row"><input className="input" style={{ flex: 1 }} maxLength={120} required={i < 2} value={o} onChange={(e) => setQ({ ...q, options: q.options.map((x, j) => (j === i ? e.target.value : x)) })} /><label className="check" style={{ marginBottom: 0 }}><input type="radio" name="correct" checked={q.correctIndex === i} onChange={() => setQ({ ...q, correctIndex: i })} />correct</label></div>
                    </label>
                  ))}
                  {q.options.length < 5 && <button type="button" className="btn btn-sm" onClick={() => setQ({ ...q, options: [...q.options, ''] })}>Add option</button>}
                  <label className="field" style={{ marginTop: 10 }}><span>Explanation shown after answering</span><input className="input" maxLength={500} value={q.explanation} onChange={(e) => setQ({ ...q, explanation: e.target.value })} /></label>
                  <div className="row"><button className="btn btn-primary btn-sm">{editing ? 'Save question' : 'Add question'}</button>{editing && <button type="button" className="btn btn-sm btn-ghost" onClick={() => { setEditing(null); setQ(EMPTY_Q); }}>Cancel</button>}</div>
                </form>
              )}
            </section>
            {f.approvals.length > 0 && (
              <section className="card">
                <h2>Review trail</h2>
                <div className="table-wrap"><table><tbody>{f.approvals.map((a) => <tr key={a.id}><td><StatusBadge status={a.status} /></td><td className="small">{a.note}</td><td className="small muted num">{fmtDate(a.createdAt)}</td></tr>)}</tbody></table></div>
              </section>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
