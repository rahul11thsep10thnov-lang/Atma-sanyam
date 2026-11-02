'use client';

import { ACTIVITY_KINDS, CHARACTERS, type Localised } from '@/lib/dadu';
import { LocalisedInput } from './LocalisedInput';

export interface ActivityItem { key: string; label: Localised; ok?: boolean; group?: string; order?: number; icon?: string }
export type Step =
  | { type: 'dialogue'; who: string; text: Localised; emotion?: string; echo?: boolean }
  | { type: 'activity'; activity: { kind: string; prompt: Localised; items: ActivityItem[]; success: Localised; retry: Localised } }
  | { type: 'quiz'; question: Localised; items: ActivityItem[]; explain: Localised }
  | { type: 'echo'; clauses: Localised[] };

const L = (en = ''): Localised => ({ en });

export function newStep(type: Step['type']): Step {
  switch (type) {
    case 'dialogue': return { type, who: 'dadaji', text: L() };
    case 'activity': return { type, activity: { kind: 'choose', prompt: L(), items: [], success: L(), retry: L() } };
    case 'quiz': return { type, question: L(), items: [], explain: L() };
    case 'echo': return { type, clauses: [L()] };
  }
}

function ItemsEditor({ items, onChange, withOk }: { items: ActivityItem[]; onChange: (i: ActivityItem[]) => void; withOk: boolean }) {
  const update = (i: number, patch: Partial<ActivityItem>) => onChange(items.map((it, k) => (k === i ? { ...it, ...patch } : it)));
  return (
    <div className="stack" style={{ marginTop: 8 }}>
      {items.map((it, i) => (
        <div key={i} className="card" style={{ padding: 10 }}>
          <div className="form-grid">
            <label className="field">
              <span className="small">Key</span>
              <input className="input" value={it.key} onChange={(e) => update(i, { key: e.target.value })} required />
            </label>
            <label className="field">
              <span className="small">Icon / sprite (optional)</span>
              <input className="input" value={it.icon ?? ''} onChange={(e) => update(i, { icon: e.target.value || undefined })} />
            </label>
            <label className="field">
              <span className="small">Group (sort activities)</span>
              <input className="input" value={it.group ?? ''} onChange={(e) => update(i, { group: e.target.value || undefined })} />
            </label>
            <label className="field">
              <span className="small">Order (sequence activities)</span>
              <input className="input" type="number" value={it.order ?? ''} onChange={(e) => update(i, { order: e.target.value === '' ? undefined : Number(e.target.value) })} />
            </label>
          </div>
          <LocalisedInput label="Label" value={it.label} onChange={(label) => update(i, { label })} />
          <div className="row">
            {withOk && (
              <label className="check" style={{ marginBottom: 0 }}>
                <input type="checkbox" checked={!!it.ok} onChange={(e) => update(i, { ok: e.target.checked })} /> Correct answer
              </label>
            )}
            <button type="button" className="btn btn-sm btn-danger" onClick={() => onChange(items.filter((_, k) => k !== i))}>Remove item</button>
          </div>
        </div>
      ))}
      <button type="button" className="btn btn-sm" onClick={() => onChange([...items, { key: `item${items.length + 1}`, label: L() }])}>Add item</button>
    </div>
  );
}

function StepEditor({ step, onChange }: { step: Step; onChange: (s: Step) => void }) {
  switch (step.type) {
    case 'dialogue':
      return (
        <>
          <div className="form-grid">
            <label className="field">
              <span>Speaker</span>
              <select className="input" value={step.who} onChange={(e) => onChange({ ...step, who: e.target.value })}>
                {CHARACTERS.map((c) => <option key={c.key} value={c.key}>{c.name}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Emotion (optional)</span>
              <input className="input" value={step.emotion ?? ''} placeholder="warm, surprised, thinking…" onChange={(e) => onChange({ ...step, emotion: e.target.value || undefined })} />
            </label>
          </div>
          <LocalisedInput label="Line" multiline value={step.text} onChange={(text) => onChange({ ...step, text })} />
          <label className="check">
            <input type="checkbox" checked={!!step.echo} onChange={(e) => onChange({ ...step, echo: e.target.checked || undefined })} /> Key clause (Mitthu may repeat it in revision)
          </label>
        </>
      );
    case 'activity':
      return (
        <>
          <label className="field">
            <span>Activity kind</span>
            <select className="input" value={step.activity.kind} onChange={(e) => onChange({ ...step, activity: { ...step.activity, kind: e.target.value } })}>
              {ACTIVITY_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </label>
          <LocalisedInput label="Prompt" value={step.activity.prompt} onChange={(prompt) => onChange({ ...step, activity: { ...step.activity, prompt } })} />
          <LocalisedInput label="Success line" value={step.activity.success} onChange={(success) => onChange({ ...step, activity: { ...step.activity, success } })} />
          <LocalisedInput label="Retry line (never shaming)" value={step.activity.retry} onChange={(retry) => onChange({ ...step, activity: { ...step.activity, retry } })} />
          <strong className="small">Items</strong>
          <ItemsEditor items={step.activity.items} withOk onChange={(items) => onChange({ ...step, activity: { ...step.activity, items } })} />
        </>
      );
    case 'quiz':
      return (
        <>
          <LocalisedInput label="Question" value={step.question} onChange={(question) => onChange({ ...step, question })} />
          <LocalisedInput label="Explanation after answering" multiline value={step.explain} onChange={(explain) => onChange({ ...step, explain })} />
          <strong className="small">Choices (mark the correct one)</strong>
          <ItemsEditor items={step.items} withOk onChange={(items) => onChange({ ...step, items })} />
        </>
      );
    case 'echo':
      return (
        <>
          {step.clauses.map((c, i) => (
            <div key={i} className="row" style={{ alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <LocalisedInput label={`Clause ${i + 1}`} value={c} onChange={(v) => onChange({ ...step, clauses: step.clauses.map((x, k) => (k === i ? v : x)) })} />
              </div>
              <button type="button" className="btn btn-sm btn-danger" disabled={step.clauses.length <= 1} onClick={() => onChange({ ...step, clauses: step.clauses.filter((_, k) => k !== i) })}>Remove</button>
            </div>
          ))}
          <button type="button" className="btn btn-sm" disabled={step.clauses.length >= 3} onClick={() => onChange({ ...step, clauses: [...step.clauses, L()] })}>Add clause (max 3)</button>
        </>
      );
  }
}

const TYPE_LABEL: Record<Step['type'], string> = { dialogue: 'Dialogue', activity: 'Activity', quiz: 'Quick check', echo: "Mitthu's Echo" };

/** Ordered step list for one level (Little or Explorer). */
export function LessonStepsEditor({ steps, onChange }: { steps: Step[]; onChange: (s: Step[]) => void }) {
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= steps.length) return;
    const next = steps.slice();
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div className="stack">
      {steps.length === 0 && <p className="small muted">No steps yet. The canonical order is: Dadaji introduces, Chintu asks, a friend joins, Dadaji explains, activity, feedback, quick check, Mitthu&apos;s Echo.</p>}
      {steps.map((s, i) => (
        <section key={i} className="card">
          <div className="card-head">
            <strong>
              {i + 1}. {TYPE_LABEL[s.type]}
            </strong>
            <div className="row">
              <button type="button" className="btn btn-sm" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">↑</button>
              <button type="button" className="btn btn-sm" disabled={i === steps.length - 1} onClick={() => move(i, 1)} aria-label="Move down">↓</button>
              <button type="button" className="btn btn-sm btn-danger" onClick={() => onChange(steps.filter((_, k) => k !== i))}>Remove</button>
            </div>
          </div>
          <StepEditor step={s} onChange={(ns) => onChange(steps.map((x, k) => (k === i ? ns : x)))} />
        </section>
      ))}
      <div className="row">
        {(['dialogue', 'activity', 'quiz', 'echo'] as const).map((t) => (
          <button key={t} type="button" className="btn btn-sm" onClick={() => onChange([...steps, newStep(t)])}>
            + {TYPE_LABEL[t]}
          </button>
        ))}
      </div>
    </div>
  );
}
