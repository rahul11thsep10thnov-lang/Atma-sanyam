'use client';

import { useState } from 'react';
import { api, ApiError, errorMessage } from '@/lib/api';
import type { Issue, QuestionDetail } from '@/lib/types';
import { useLanguages, useTaxonomy } from '@/lib/useTaxonomy';
import { ScopePicker, type Scope } from './ScopePicker';
import { ErrorAlert } from './ui';

const LABELS = ['A', 'B', 'C', 'D'] as const;

/** Create or edit an MCQ. The API re-runs every validation rule on save and
 * refuses questions with errors; warnings are saved and shown. */
export function QuestionEditor({
  initial,
  onSaved,
  onCancel,
}: {
  initial?: QuestionDetail;
  onSaved: (q: QuestionDetail) => void;
  onCancel?: () => void;
}) {
  const { tree } = useTaxonomy();
  const languages = useLanguages();
  const [scope, setScope] = useState<Scope>({
    examId: initial?.examId ?? '',
    subjectId: initial?.subjectId ?? '',
    chapterId: initial?.chapterId ?? '',
    topicId: initial?.topicId ?? '',
  });
  const [text, setText] = useState(initial?.questionText ?? '');
  const [options, setOptions] = useState<string[]>(LABELS.map((l) => initial?.options.find((o) => o.label === l)?.text ?? ''));
  const [correct, setCorrect] = useState(initial?.correctOption ?? 'A');
  const [explanation, setExplanation] = useState(initial?.explanation ?? '');
  const [difficulty, setDifficulty] = useState(initial?.difficulty ?? 'medium');
  const [language, setLanguage] = useState(initial?.language ?? 'hi-Latn');
  const [computation, setComputation] = useState(initial?.computation ?? '');
  const [sourceName, setSourceName] = useState(initial?.sourceName ?? '');
  const [sourceReference, setSourceReference] = useState(initial?.sourceReference ?? '');
  const [validAsOf, setValidAsOf] = useState(initial?.validAsOf ?? '');
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setIssues([]);
    try {
      const body = {
        ...scope,
        topicId: scope.topicId || null,
        questionText: text,
        options: LABELS.map((label, i) => ({ label, text: options[i] ?? '' })),
        correctOption: correct,
        explanation,
        difficulty,
        language,
        computation: computation.trim() || null,
        sourceName: sourceName.trim() || null,
        sourceReference: sourceReference.trim() || null,
        validAsOf: validAsOf || null,
      };
      const saved = initial
        ? await api<QuestionDetail>(`questions/${initial.id}`, { method: 'PUT', body })
        : await api<QuestionDetail>('questions', { method: 'POST', body });
      onSaved(saved);
    } catch (err) {
      if (err instanceof ApiError && err.status === 422 && Array.isArray(err.details)) {
        setError(err.message);
        setIssues(err.details as Issue[]);
      } else setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save}>
      <ErrorAlert error={error} />
      {issues.length > 0 && (
        <ul className="alert alert-error" style={{ paddingLeft: 28, marginTop: -4 }}>
          {issues.map((i, k) => (
            <li key={k}>{i.message}</li>
          ))}
        </ul>
      )}
      <div className="form-grid">
        <ScopePicker tree={tree} value={scope} onChange={setScope} />
      </div>
      <label className="field">
        <span>Question</span>
        <textarea className="input" rows={3} required maxLength={5000} value={text} onChange={(e) => setText(e.target.value)} />
      </label>
      <fieldset style={{ border: 0, padding: 0, margin: '0 0 14px' }}>
        <legend style={{ fontWeight: 600, marginBottom: 6 }}>Options — select the correct one</legend>
        <div className="option-list" style={{ margin: 0 }}>
          {LABELS.map((l, i) => (
            <label key={l} className={`option ${correct === l ? 'correct' : ''}`} style={{ alignItems: 'center' }}>
              <input type="radio" name="correct" value={l} checked={correct === l} onChange={() => setCorrect(l)} aria-label={`Option ${l} is correct`} />
              <span className="letter">{l}</span>
              <input
                className="input"
                required
                maxLength={1000}
                value={options[i]}
                aria-label={`Option ${l}`}
                onChange={(e) => setOptions(options.map((o, k) => (k === i ? e.target.value : o)))}
              />
            </label>
          ))}
        </div>
      </fieldset>
      <label className="field">
        <span>Explanation</span>
        <textarea className="input" rows={3} required maxLength={5000} value={explanation} onChange={(e) => setExplanation(e.target.value)} />
        <small>Show the working and end at the answer. Don’t refer to options by letter.</small>
      </label>
      <div className="form-grid">
        <label className="field">
          <span>Difficulty</span>
          <select className="input" value={difficulty} onChange={(e) => setDifficulty(e.target.value as typeof difficulty)}>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </label>
        <label className="field">
          <span>Language</span>
          <select className="input" value={language} onChange={(e) => setLanguage(e.target.value)}>
            {languages.map((l) => (
              <option key={l.code} value={l.code}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Calculation (numerical questions, optional)</span>
          <input className="input mono" placeholder="e.g. 500*20/100" maxLength={300} value={computation} onChange={(e) => setComputation(e.target.value)} />
          <small>Re-evaluated on save; must equal the correct option.</small>
        </label>
        <label className="field">
          <span>Correct as of (changing facts, optional)</span>
          <input className="input" type="date" value={validAsOf} onChange={(e) => setValidAsOf(e.target.value)} />
        </label>
        <label className="field">
          <span>Source name (optional)</span>
          <input className="input" maxLength={300} value={sourceName} onChange={(e) => setSourceName(e.target.value)} />
        </label>
        <label className="field">
          <span>Source reference (optional)</span>
          <input className="input" maxLength={1000} placeholder="Book + edition, notification no., URL" value={sourceReference} onChange={(e) => setSourceReference(e.target.value)} />
        </label>
      </div>
      <div className="row">
        <button className="btn btn-primary" disabled={busy || !scope.chapterId}>
          {busy ? 'Saving…' : initial ? 'Save changes' : 'Create question'}
        </button>
        {onCancel && (
          <button type="button" className="btn" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
