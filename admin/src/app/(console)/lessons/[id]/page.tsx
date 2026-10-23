'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api, errorMessage, useApi } from '@/lib/api';
import { fmtDate } from '@/lib/format';
import { ConfirmButton, ErrorAlert, Forbidden, OkAlert, PageHead, StatusBadge } from '@/components/ui';
import { useCan } from '@/components/ConsoleShell';
import { JsonField, LinesField } from '@/components/catalogue';

interface Mapping { framework: string; board?: string; grade: string; syllabusTopic: string; learningOutcome?: string; sourceRef: string; verificationStatus: string; lastReviewedAt?: string }
interface Lesson {
  id: string; section: string; subject: string; topic: string; subtopic: string; title: string; summary: string; recommendedAge: number; minAge: number; maxAge: number; difficulty: string; level: number;
  learningObjective: string; prerequisites: string[]; steps: unknown[]; estimatedMinutes: number; curriculum: Mapping[]; sources: { title: string; publisher: string; url: string; accessedOn?: string }[];
  safetyNotes: string[]; adultAssisted: boolean; status: string; sortOrder: number; origin: string; adminEdited: boolean; publishedAt: string | null; updatedAt: string;
  approvals?: { id: string; status: string; note: string | null; createdAt: string }[]; stats?: { started: number; completed: number; avgQuizRatio: number | null }; templateProblems?: string[];
}

const TEMPLATE = ['objective', 'discover', 'understand', 'example', 'tryIt', 'realWorld', 'revision', 'didYouKnow', 'challenge'];
const EMPTY: Lesson = {
  id: '', section: 'study', subject: 'maths', topic: '', subtopic: '', title: '', summary: '', recommendedAge: 7, minAge: 6, maxAge: 9, difficulty: 'beginner', level: 1, learningObjective: '', prerequisites: [],
  steps: TEMPLATE.map((kind) => ({ kind, title: '', text: '' })), estimatedMinutes: 8, curriculum: [], sources: [], safetyNotes: [], adultAssisted: false, status: 'draft', sortOrder: 0, origin: 'admin', adminEdited: true, publishedAt: null, updatedAt: '',
};

export default function LessonEditorPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';
  const router = useRouter();
  const can = useCan();
  const { data, error, reload } = useApi<Lesson>(can('content:read') && !isNew ? `lessons/${id}` : null);
  const [form, setForm] = useState<Lesson>(EMPTY);
  const [jsonOk, setJsonOk] = useState({ steps: true, curriculum: true, sources: true });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  useEffect(() => { if (data) setForm(data); }, [data]);
  if (!can('content:read')) return <Forbidden />;
  const set = <K extends keyof Lesson>(k: K, v: Lesson[K]) => setForm((f) => ({ ...f, [k]: v }));
  const canEdit = can('content:write');
  const canPublish = can('content:publish');
  const canVerify = can('content:verify');
  const stepKinds = (form.steps as { kind?: string }[]).map((s) => s.kind);
  const templateOk = TEMPLATE.join() === stepKinds.join();

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!jsonOk.steps || !jsonOk.curriculum || !jsonOk.sources) { setErr('Fix the JSON fields first.'); return; }
    setBusy(true); setErr(null); setOk(null);
    const body = {
      section: form.section, subject: form.subject, topic: form.topic, subtopic: form.subtopic, title: form.title, summary: form.summary, recommendedAge: Number(form.recommendedAge), minAge: Number(form.minAge), maxAge: Number(form.maxAge),
      difficulty: form.difficulty, level: Number(form.level), learningObjective: form.learningObjective, prerequisites: form.prerequisites, steps: form.steps, estimatedMinutes: Number(form.estimatedMinutes), curriculum: form.curriculum, sources: form.sources,
      safetyNotes: form.safetyNotes, adultAssisted: form.adultAssisted, sortOrder: Number(form.sortOrder),
    };
    try {
      if (isNew) {
        const saved = await api<Lesson>('lessons', { method: 'POST', body: { ...body, id: form.id } });
        router.push(`/lessons/${saved.id}`);
      } else {
        const saved = await api<Lesson>(`lessons/${id}`, { method: 'PATCH', body });
        setForm(saved); setOk('Saved.'); void reload();
      }
    } catch (e2) { setErr(errorMessage(e2)); } finally { setBusy(false); }
  }
  async function setStatus(status: string) {
    setBusy(true); setErr(null); setOk(null);
    try { await api(`lessons/${id}/status`, { method: 'POST', body: { status } }); setOk(`Status: ${status}.`); void reload(); } catch (e2) { setErr(errorMessage(e2)); } finally { setBusy(false); }
  }
  async function verify(index: number, verificationStatus: string) {
    setBusy(true); setErr(null);
    try { await api(`lessons/${id}/curriculum/${index}/verify`, { method: 'POST', body: { verificationStatus } }); setOk('Mapping updated.'); void reload(); } catch (e2) { setErr(errorMessage(e2)); } finally { setBusy(false); }
  }
  async function remove() {
    setBusy(true);
    try { await api(`lessons/${id}`, { method: 'DELETE' }); router.push('/lessons'); } catch (e2) { setErr(errorMessage(e2)); setBusy(false); }
  }

  return (
    <div>
      <PageHead title={isNew ? 'New lesson' : form.title || 'Lesson'} subtitle={isNew ? 'Lessons follow the nine-step chapter template. Save as draft, send to review, then publish.' : `${form.id} · ${form.section} · ${form.subject} · age ${form.recommendedAge}`} actions={<Link href="/lessons" className="btn btn-sm">All lessons</Link>} />
      <ErrorAlert error={error ?? err} />
      <OkAlert message={ok} />
      {!isNew && (
        <section className="card" style={{ marginBottom: 16 }}>
          <div className="card-head">
            <div><h2>Status <StatusBadge status={form.status} /></h2><p className="small muted">{form.publishedAt ? `Published ${fmtDate(form.publishedAt)} · ` : ''}updated {fmtDate(form.updatedAt)} · {form.origin}{form.adminEdited ? ' (edited in console)' : ''}{form.stats ? ` · started ${form.stats.started}, completed ${form.stats.completed}${form.stats.avgQuizRatio !== null ? `, avg quiz ${Math.round(form.stats.avgQuizRatio * 100)}%` : ''}` : ''}</p></div>
            <div className="row">
              {canEdit && form.status === 'draft' && <button className="btn btn-sm" onClick={() => setStatus('in_review')} disabled={busy}>Send to review</button>}
              {canPublish && form.status !== 'published' && <button className="btn btn-primary btn-sm" onClick={() => setStatus('published')} disabled={busy || !templateOk}>Publish</button>}
              {canPublish && form.status === 'published' && <button className="btn btn-sm" onClick={() => setStatus('archived')} disabled={busy}>Archive (unpublish)</button>}
              {canEdit && form.status === 'archived' && <button className="btn btn-sm" onClick={() => setStatus('draft')} disabled={busy}>Back to draft</button>}
              {can('content:delete') && form.status !== 'published' && <ConfirmButton label="Delete" confirm="Delete this lesson for good?" onConfirm={remove} className="btn btn-danger btn-sm" />}
            </div>
          </div>
          {(form.templateProblems?.length ?? 0) > 0 && <div className="alert alert-warn"><strong>Template problems:</strong> {form.templateProblems!.join(' · ')}</div>}
          {form.curriculum.length > 0 && (
            <div className="table-wrap" style={{ marginTop: 12 }}><table>
              <thead><tr><th>Framework</th><th>Grade</th><th>Syllabus topic</th><th>Source</th><th>Verification</th>{canVerify && <th />}</tr></thead>
              <tbody>
                {form.curriculum.map((m, i) => (
                  <tr key={i}>
                    <td>{m.framework}{m.board ? ` · ${m.board}` : ''}</td><td>{m.grade}</td><td>{m.syllabusTopic}{m.learningOutcome ? <div className="small muted">{m.learningOutcome}</div> : null}</td><td className="small">{m.sourceRef}</td>
                    <td><span className={`badge ${m.verificationStatus === 'verified' ? 'badge-good' : m.verificationStatus === 'rejected' ? 'badge-danger' : 'badge-warn'}`}>{m.verificationStatus}</span>{m.lastReviewedAt && <div className="small muted">{m.lastReviewedAt}</div>}</td>
                    {canVerify && <td className="row">{m.verificationStatus !== 'verified' && <button className="btn btn-sm" onClick={() => verify(i, 'verified')} disabled={busy}>Verify</button>}{m.verificationStatus !== 'rejected' && <button className="btn btn-sm" onClick={() => verify(i, 'rejected')} disabled={busy}>Reject</button>}</td>}
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
          <p className="small muted" style={{ marginTop: 8 }}>Only a <em>verified</em> mapping lets the app show “Aligned with the selected curriculum topic”, and only to a child whose guardian chose that framework and grade. LoJi makes no endorsement claims.</p>
        </section>
      )}
      <form onSubmit={save} className="card">
        <fieldset disabled={!canEdit || busy} style={{ border: 0, padding: 0, margin: 0 }}>
          <div className="grid-2">
            {isNew && <label className="field"><span>Id (slug)</span><input className="input" value={form.id} onChange={(e) => set('id', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} required /></label>}
            <label className="field"><span>Title</span><input className="input" value={form.title} onChange={(e) => set('title', e.target.value)} required /></label>
            <label className="field"><span>Section</span><select className="input" value={form.section} onChange={(e) => set('section', e.target.value)}><option value="study">Study Playfully</option><option value="music">Music</option><option value="sports">Sports</option></select></label>
            <label className="field"><span>Subject key</span><input className="input" value={form.subject} onChange={(e) => set('subject', e.target.value)} placeholder="maths, piano, cricket…" required /></label>
            <label className="field"><span>Topic</span><input className="input" value={form.topic} onChange={(e) => set('topic', e.target.value)} required /></label>
            <label className="field"><span>Subtopic</span><input className="input" value={form.subtopic} onChange={(e) => set('subtopic', e.target.value)} /></label>
            <label className="field"><span>Recommended age</span><input className="input" type="number" min={3} max={12} value={form.recommendedAge} onChange={(e) => set('recommendedAge', Number(e.target.value))} /></label>
            <label className="field"><span>Age range</span><div className="row"><input className="input" type="number" min={3} max={12} value={form.minAge} onChange={(e) => set('minAge', Number(e.target.value))} style={{ maxWidth: 90 }} /><span>to</span><input className="input" type="number" min={3} max={12} value={form.maxAge} onChange={(e) => set('maxAge', Number(e.target.value))} style={{ maxWidth: 90 }} /></div></label>
            <label className="field"><span>Difficulty</span><select className="input" value={form.difficulty} onChange={(e) => set('difficulty', e.target.value)}><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></label>
            <label className="field"><span>Level (order within subject and age)</span><input className="input" type="number" min={1} value={form.level} onChange={(e) => set('level', Number(e.target.value))} /></label>
            <label className="field"><span>Estimated minutes</span><input className="input" type="number" min={1} max={60} value={form.estimatedMinutes} onChange={(e) => set('estimatedMinutes', Number(e.target.value))} /></label>
            <label className="check"><input type="checkbox" checked={form.adultAssisted} onChange={(e) => set('adultAssisted', e.target.checked)} /> Best done with a grown-up</label>
          </div>
          <label className="field"><span>Summary</span><input className="input" value={form.summary} onChange={(e) => set('summary', e.target.value)} /></label>
          <label className="field"><span>Learning objective</span><textarea className="input" rows={2} value={form.learningObjective} onChange={(e) => set('learningObjective', e.target.value)} required /></label>
          <LinesField label="Prerequisites (one per line)" value={form.prerequisites} onChange={(v) => set('prerequisites', v)} rows={2} />
          <LinesField label="Safety notes (one per line)" value={form.safetyNotes} onChange={(v) => set('safetyNotes', v)} rows={2} help="Shown on the lesson. Swimming lessons must state that real swimming needs a qualified in-person instructor." />
          <JsonField label={`Steps (JSON, template order: ${TEMPLATE.join(' → ')})`} value={form.steps} onChange={(v, valid) => { setJsonOk((j) => ({ ...j, steps: valid })); if (valid) set('steps', v as unknown[]); }} rows={24} help="Each step: { kind, title?, text?, textByBracket?, visual?: {kind, props}, example?: {steps[]}, activity?: {kind,…}, points?[], fact?: {headline, body, source:{title,publisher,url}}, questions?[], safety? }. See docs/LEARNING.md for the visual and activity vocabulary." />
          <JsonField label="Curriculum mappings (JSON)" value={form.curriculum} onChange={(v, valid) => { setJsonOk((j) => ({ ...j, curriculum: valid })); if (valid) set('curriculum', v as Mapping[]); }} rows={8} help="{ framework: ncert|cbse|cisce|state|ib_pyp|ib_myp, board?, grade, syllabusTopic, learningOutcome?, sourceRef, verificationStatus: pending_review }. A fact checker verifies each mapping above." />
          <JsonField label="Sources (JSON)" value={form.sources} onChange={(v, valid) => { setJsonOk((j) => ({ ...j, sources: valid })); if (valid) set('sources', v as Lesson['sources']); }} rows={6} help="{ title, publisher, url, accessedOn? }. A lesson cannot be published without a source." />
          {!templateOk && <div className="alert alert-warn">Steps are not in the template order ({stepKinds.join(' → ') || 'none'}). Publishing is blocked until they are.</div>}
        </fieldset>
        {canEdit && <div className="row"><button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Saving…' : isNew ? 'Create draft' : 'Save'}</button></div>}
      </form>
      {form.approvals && form.approvals.length > 0 && (
        <section className="card" style={{ marginTop: 16 }}>
          <h2>Review trail</h2>
          <ul className="small">{form.approvals.map((a) => <li key={a.id}>{fmtDate(a.createdAt)} · {a.status}{a.note ? ` · ${a.note}` : ''}</li>)}</ul>
        </section>
      )}
    </div>
  );
}
