'use client';

import { useState } from 'react';
import { api, errorMessage } from '@/lib/api';
import type { ExamNode } from '@/lib/types';

const REASONS: Record<string, string> = {
  chapter_not_in_subject: 'chapter is in another subject',
  topic_not_in_chapter: 'topic is in another chapter',
  archived: 'archived',
  not_found: 'not found',
};

/** Changes chapter / difficulty / source on the selected questions. Each
 * question keeps its previous version in its history. */
export function BulkEditForm({
  ids,
  tree,
  onDone,
  onCancel,
}: {
  ids: string[];
  tree: ExamNode[];
  onDone: (message: string) => void;
  onCancel: () => void;
}) {
  const [chapterId, setChapterId] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [sourceReference, setSourceReference] = useState('');
  const [summary, setSummary] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const set: Record<string, string> = {};
    if (chapterId) set.chapterId = chapterId;
    if (difficulty) set.difficulty = difficulty;
    if (sourceName.trim()) set.sourceName = sourceName.trim();
    if (sourceReference.trim()) set.sourceReference = sourceReference.trim();
    if (!Object.keys(set).length) return setErr('Choose at least one field to change.');
    setBusy(true);
    setErr(null);
    try {
      const r = await api<{ updated: string[]; skipped: { id: string; reason: string }[] }>('questions/bulk-edit', {
        method: 'POST',
        body: { ids, set, summary: summary.trim() || null },
      });
      const reasons = [...new Set(r.skipped.map((s) => REASONS[s.reason] ?? s.reason))].join(', ');
      onDone(`Updated ${r.updated.length} question(s)${r.skipped.length ? `; skipped ${r.skipped.length} (${reasons})` : ''}.`);
    } catch (e2) {
      setErr(errorMessage(e2));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card stack" onSubmit={save} style={{ marginBottom: 12 }}>
      <h3>Edit details of {ids.length} question(s)</h3>
      <p className="small muted">Leave a field empty to keep it. Every question keeps its previous version in its history.</p>
      <div className="row" style={{ flexWrap: 'wrap', gap: 12 }}>
        <label className="field">
          <span>Chapter</span>
          <select value={chapterId} onChange={(e) => setChapterId(e.target.value)}>
            <option value="">— keep —</option>
            {tree.map((ex) =>
              ex.subjects.map((s) => (
                <optgroup key={s.id} label={`${ex.name} › ${s.name}`}>
                  {s.chapters.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </optgroup>
              ))
            )}
          </select>
        </label>
        <label className="field">
          <span>Difficulty</span>
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
            <option value="">— keep —</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </label>
        <label className="field">
          <span>Source name</span>
          <input value={sourceName} onChange={(e) => setSourceName(e.target.value)} maxLength={500} placeholder="e.g. UPSI 2021 paper" />
        </label>
        <label className="field">
          <span>Source reference</span>
          <input value={sourceReference} onChange={(e) => setSourceReference(e.target.value)} maxLength={1000} placeholder="Page, URL or shift" />
        </label>
        <label className="field" style={{ flex: 1, minWidth: 200 }}>
          <span>Reason (kept in history)</span>
          <input value={summary} onChange={(e) => setSummary(e.target.value)} maxLength={500} />
        </label>
      </div>
      {err && <div className="alert alert-error">{err}</div>}
      <div className="row">
        <button className="btn btn-primary" disabled={busy}>
          {busy ? 'Saving…' : 'Apply'}
        </button>
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
