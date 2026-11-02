'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, errorMessage } from '@/lib/api';
import {
  BANDS, BAND_LABELS, CHARACTERS, EMPTY_BODY_BY_KIND, ID_RE, KINDS, LANGS, LANG_NAMES, RIGHTS, SECTIONS, WORLDS,
  missingEnglish, type DaduContentItem, type Kind, type Localised,
} from '@/lib/dadu';
import { useCan } from '@/components/ConsoleShell';
import { ErrorAlert, OkAlert } from '@/components/ui';
import { LocalisedInput } from './LocalisedInput';
import { LessonStepsEditor, type Step } from './LessonStepsEditor';

interface LessonBody {
  title: Localised;
  host: string;
  world: string;
  companion: string;
  concept: string;
  steps: { little: Step[]; explorer: Step[] };
  simpler: Localised;
  advanced: Localised;
  example: Localised;
  assignment?: string;
}

interface FormState {
  id: string;
  kind: Kind;
  section: string;
  subject: string;
  topic: string;
  bands: string[];
  difficulty: number;
  languages: string[];
  rights: string;
  provenance: string;
  objective: Localised;
  changeNote: string;
  body: unknown;
}

function fromItem(item?: DaduContentItem): FormState {
  return {
    id: item?.id ?? '',
    kind: item?.kind ?? 'lesson',
    section: item?.section ?? 'academic',
    subject: item?.subject ?? '',
    topic: item?.topic ?? '',
    bands: item?.bands ?? ['A2', 'A3'],
    difficulty: item?.difficulty ?? 2,
    languages: item?.languages ?? ['en'],
    rights: item?.rights ?? 'original',
    provenance: item?.provenance ?? '',
    objective: item?.objective ?? { en: '' },
    changeNote: '',
    body: item?.body ?? EMPTY_BODY_BY_KIND[item?.kind ?? 'lesson'],
  };
}

function isLessonBody(b: unknown): b is LessonBody {
  return !!b && typeof b === 'object' && 'steps' in (b as object) && 'title' in (b as object);
}

export function DaduContentForm({ initial, onSaved }: { initial?: DaduContentItem; onSaved?: (item: DaduContentItem) => void }) {
  const router = useRouter();
  const can = useCan();
  const [form, setForm] = useState<FormState>(() => fromItem(initial));
  const [tab, setTab] = useState<'structured' | 'json'>(initial && initial.kind !== 'lesson' ? 'json' : 'structured');
  const [json, setJson] = useState(() => JSON.stringify(form.body, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));
  const setBody = (body: unknown) => {
    setForm((f) => ({ ...f, body }));
    setJson(JSON.stringify(body, null, 2));
  };
  const toggle = (k: 'bands' | 'languages', v: string) =>
    set(k, form[k].includes(v) ? form[k].filter((x) => x !== v) : [...form[k], v]);

  const readOnly = !can('dadu:content:write');
  const structuredAvailable = form.kind === 'lesson' && isLessonBody(form.body);
  const lesson = structuredAvailable ? (form.body as LessonBody) : null;
  const setLesson = (patch: Partial<LessonBody>) => lesson && setBody({ ...lesson, ...patch });

  function switchTab(next: 'structured' | 'json') {
    if (tab === 'json' && next === 'structured') {
      try {
        setForm((f) => ({ ...f, body: JSON.parse(json) }));
        setJsonError(null);
      } catch (e) {
        setJsonError(`Fix the JSON first: ${(e as Error).message}`);
        return;
      }
    }
    setTab(next);
  }

  function validate(body: unknown): string | null {
    if (!ID_RE.test(form.id)) return 'ID may only contain lowercase letters, digits, dots, hyphens and underscores.';
    if (!form.provenance.trim()) return 'Provenance is required: where this content comes from.';
    if (!form.subject.trim() || !form.topic.trim()) return 'Subject and topic are required.';
    if (form.bands.length === 0) return 'Pick at least one age band.';
    if (!form.languages.includes('en')) return 'English must be among the languages.';
    if (!form.objective.en.trim()) return 'The learning objective needs English text.';
    const missing = missingEnglish(body);
    if (missing.length) return `English text is missing at: ${missing.slice(0, 6).join(', ')}${missing.length > 6 ? '…' : ''}`;
    return null;
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(null);
    let body: unknown = form.body;
    if (tab === 'json') {
      try {
        body = JSON.parse(json);
        setJsonError(null);
      } catch (err) {
        setJsonError(`Invalid JSON: ${(err as Error).message}`);
        return;
      }
    }
    const problem = validate(body);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    const payload = {
      kind: form.kind,
      section: form.section,
      subject: form.subject.trim(),
      topic: form.topic.trim(),
      bands: form.bands,
      difficulty: form.difficulty,
      languages: form.languages,
      rights: form.rights,
      provenance: form.provenance.trim(),
      objective: form.objective,
      body,
      changeNote: form.changeNote.trim() || (initial ? 'Edited in the console' : 'Created in the console'),
    };
    try {
      const saved = initial
        ? await api<DaduContentItem>(`dadu/content/${initial.id}`, { method: 'PUT', body: payload })
        : await api<DaduContentItem>('dadu/content', { method: 'POST', body: { id: form.id, ...payload } });
      if (initial) {
        setOk(`Saved as version ${saved.version ?? '?'}.`);
        set('changeNote', '');
        onSaved?.(saved);
      } else {
        router.push(`/dadu/content/${encodeURIComponent(saved.id)}?created=1`);
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="stack">
      <ErrorAlert error={error} />
      <OkAlert message={ok} />
      <fieldset disabled={readOnly} style={{ border: 0, padding: 0, margin: 0 }}>
        <div className="grid grid-2" style={{ alignItems: 'start' }}>
          <section className="card">
            <h2 style={{ marginBottom: 12 }}>Metadata</h2>
            <div className="form-grid">
              <label className="field">
                <span>ID</span>
                <input className="input mono" required pattern="[a-z0-9_.\-]+" value={form.id} disabled={!!initial} placeholder="academic.math.counting.03" onChange={(e) => set('id', e.target.value)} />
                <small>Lowercase letters, digits, dots, hyphens, underscores. Fixed after creation.</small>
              </label>
              <label className="field">
                <span>Kind</span>
                <select className="input" value={form.kind} disabled={!!initial} onChange={(e) => { const kind = e.target.value as Kind; set('kind', kind); setBody(EMPTY_BODY_BY_KIND[kind]); setTab(kind === 'lesson' ? 'structured' : 'json'); }}>
                  {KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
                </select>
              </label>
              <label className="field">
                <span>Section</span>
                <select className="input" value={form.section} onChange={(e) => set('section', e.target.value)} style={{ borderLeft: `6px solid ${SECTIONS.find((s) => s.key === form.section)?.colour ?? 'transparent'}` }}>
                  {SECTIONS.map((s) => <option key={s.key} value={s.key}>{s.name}</option>)}
                </select>
              </label>
              <label className="field">
                <span>Difficulty (1–5)</span>
                <input className="input" type="number" min={1} max={5} required value={form.difficulty} onChange={(e) => set('difficulty', Number(e.target.value))} />
              </label>
              <label className="field">
                <span>Subject</span>
                <input className="input" required value={form.subject} placeholder="math" onChange={(e) => set('subject', e.target.value)} />
              </label>
              <label className="field">
                <span>Topic</span>
                <input className="input" required value={form.topic} placeholder="counting" onChange={(e) => set('topic', e.target.value)} />
              </label>
            </div>
            <LocalisedInput label="Learning objective" value={form.objective} onChange={(v) => set('objective', v)} />
            <div className="field" style={{ marginBottom: 14 }}>
              <span style={{ display: 'block', fontWeight: 600, marginBottom: 5 }}>Age bands</span>
              <div className="row">
                {BANDS.map((b) => (
                  <label key={b} className="check" style={{ marginBottom: 0 }}>
                    <input type="checkbox" checked={form.bands.includes(b)} onChange={() => toggle('bands', b)} /> {b} <span className="small muted">({BAND_LABELS[b]})</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="field" style={{ marginBottom: 14 }}>
              <span style={{ display: 'block', fontWeight: 600, marginBottom: 5 }}>Languages covered</span>
              <div className="row">
                {LANGS.map((l) => (
                  <label key={l} className="check" style={{ marginBottom: 0 }}>
                    <input type="checkbox" checked={form.languages.includes(l)} onChange={() => toggle('languages', l)} /> {LANG_NAMES[l]}
                  </label>
                ))}
              </div>
              <small className="muted">Tick a language only after its text has been proofread. English is mandatory.</small>
            </div>
          </section>

          <div className="stack">
            <section className="card">
              <h2 style={{ marginBottom: 4 }}>Rights &amp; provenance</h2>
              <p className="small muted" style={{ marginTop: 0 }}>Required on every item. Nothing with rights &ldquo;pending&rdquo; can be published.</p>
              <label className="field">
                <span>Rights</span>
                <select className="input" value={form.rights} onChange={(e) => set('rights', e.target.value)}>
                  {RIGHTS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </label>
              <label className="field">
                <span>Provenance</span>
                <textarea className="input" required value={form.provenance} placeholder="Written in-house by …; adapted from Panchatantra (public domain); licence #…" onChange={(e) => set('provenance', e.target.value)} />
              </label>
            </section>
            <section className="card">
              <h2 style={{ marginBottom: 12 }}>{initial ? 'Save a new version' : 'Create'}</h2>
              <label className="field">
                <span>Change note</span>
                <input className="input" value={form.changeNote} placeholder="What changed and why" onChange={(e) => set('changeNote', e.target.value)} />
                <small>Every save creates an immutable version. Saving a published item puts the new version back into draft; the published version stays live until it is published again.</small>
              </label>
              {!readOnly && <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : initial ? 'Save new version' : 'Create item'}</button>}
              {readOnly && <p className="small muted">Read-only: you need dadu:content:write to edit.</p>}
            </section>
          </div>
        </div>

        <section className="card">
          <div className="card-head">
            <h2>Body</h2>
            <div className="segmented" role="group" aria-label="Editor">
              <button type="button" aria-pressed={tab === 'structured'} disabled={!structuredAvailable} onClick={() => switchTab('structured')}>Structured (lesson)</button>
              <button type="button" aria-pressed={tab === 'json'} onClick={() => switchTab('json')}>Raw JSON</button>
            </div>
          </div>
          {jsonError && <div className="alert alert-error">{jsonError}</div>}
          {tab === 'structured' && lesson ? (
            <div className="stack">
              <div className="grid grid-2" style={{ alignItems: 'start' }}>
                <div>
                  <LocalisedInput label="Title" value={lesson.title} onChange={(title) => setLesson({ title })} />
                  <div className="form-grid">
                    <label className="field">
                      <span>Host object or location</span>
                      <input className="input mono" value={lesson.host} placeholder="villa.living.telescope" onChange={(e) => setLesson({ host: e.target.value })} />
                    </label>
                    <label className="field">
                      <span>Concept key (mastery)</span>
                      <input className="input mono" value={lesson.concept} placeholder="astronomy.telescope" onChange={(e) => setLesson({ concept: e.target.value })} />
                    </label>
                    <label className="field">
                      <span>World</span>
                      <select className="input" value={lesson.world} onChange={(e) => setLesson({ world: e.target.value })}>
                        {WORLDS.map((w) => <option key={w} value={w}>{w}</option>)}
                      </select>
                    </label>
                    <label className="field">
                      <span>Companion (step 3)</span>
                      <select className="input" value={lesson.companion} onChange={(e) => setLesson({ companion: e.target.value })}>
                        {CHARACTERS.filter((c) => c.key !== 'dadaji').map((c) => <option key={c.key} value={c.key}>{c.name}</option>)}
                      </select>
                    </label>
                    <label className="field">
                      <span>Real-world assignment ID (optional)</span>
                      <input className="input mono" value={lesson.assignment ?? ''} placeholder="rwa.gardening.plant_a_seed" onChange={(e) => setLesson({ assignment: e.target.value || undefined })} />
                    </label>
                  </div>
                </div>
                <div>
                  <LocalisedInput label="Simpler explanation" multiline value={lesson.simpler} onChange={(simpler) => setLesson({ simpler })} />
                  <LocalisedInput label="Advanced explanation" multiline value={lesson.advanced} onChange={(advanced) => setLesson({ advanced })} />
                  <LocalisedInput label="Additional example" multiline value={lesson.example} onChange={(example) => setLesson({ example })} />
                </div>
              </div>
              <h3>Little mode steps (ages 2–6)</h3>
              <LessonStepsEditor steps={lesson.steps?.little ?? []} onChange={(little) => setLesson({ steps: { ...lesson.steps, little } })} />
              <h3>Explorer mode steps (ages 6–12)</h3>
              <LessonStepsEditor steps={lesson.steps?.explorer ?? []} onChange={(explorer) => setLesson({ steps: { ...lesson.steps, explorer } })} />
            </div>
          ) : (
            <label className="field">
              <span>Body JSON ({form.kind})</span>
              <textarea className="input mono" style={{ minHeight: 360 }} value={json} onChange={(e) => setJson(e.target.value)} spellCheck={false} />
              <small>Shapes follow src/dadu/core/content.ts. Localised strings are objects like {'{ "en": "…", "hi": "…" }'}.</small>
            </label>
          )}
        </section>
      </fieldset>
    </form>
  );
}
