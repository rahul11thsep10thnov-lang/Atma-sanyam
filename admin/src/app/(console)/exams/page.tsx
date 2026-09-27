'use client';

import { useState } from 'react';
import { Archive, ArchiveRestore, Pencil, Plus, Trash2 } from 'lucide-react';
import { useCan } from '@/components/ConsoleShell';
import { ErrorAlert, Loading, OkAlert, PageHead } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { useTaxonomy } from '@/lib/useTaxonomy';

type Level = 'exam' | 'subject' | 'chapter' | 'topic';
const PATH: Record<Level, string> = { exam: 'exams', subject: 'subjects', chapter: 'chapters', topic: 'topics' };
const PARENT_KEY: Record<Level, string | null> = { exam: null, subject: 'examId', chapter: 'subjectId', topic: 'chapterId' };

interface Item {
  id: string;
  name: string;
  status: string;
  count?: string;
}

interface Handlers {
  editable: boolean;
  add: (level: Level, parentId?: string) => void;
  rename: (level: Level, item: Item) => void;
  setStatus: (level: Level, item: Item, status: 'active' | 'archived') => void;
  remove: (level: Level, item: Item) => void;
}

function Column({
level,
title,
items,
parentId,
selected,
onSelect,
h,
}: {
level: Level;
title: string;
items: Item[] | null;
parentId?: string;
selected?: string;
onSelect: (id: string) => void;
h: Handlers;
}) {
const { editable, add, rename, setStatus, remove } = h;
  const current = items?.find((i) => i.id === selected);
  return (
    <div className="card tree-col">
      <div className="card-head">
        <h2>{title}</h2>
        {editable && items && (
          <button className="btn btn-sm" onClick={() => add(level, parentId)} aria-label={`Add ${level}`}>
            <Plus size={14} /> Add
          </button>
        )}
      </div>
      {!items ? (
        <p className="small muted">Select a {level === 'subject' ? 'exam' : level === 'chapter' ? 'subject' : 'chapter'} first.</p>
      ) : items.length === 0 ? (
        <p className="small muted">None yet.</p>
      ) : (
        <div role="listbox" aria-label={title}>
          {items.map((i) => (
            <button
              key={i.id}
              role="option"
              aria-selected={i.id === selected}
              className="tree-item"
              onClick={() => onSelect(i.id)}
              style={i.status === 'archived' ? { opacity: 0.55, textDecoration: 'line-through' } : undefined}
            >
              {i.name}
              {i.count && <span className="n">{i.count}</span>}
            </button>
          ))}
        </div>
      )}
      {editable && current && (
        <div className="row" style={{ marginTop: 10, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
          <button className="btn btn-sm" onClick={() => rename(level, current)}>
            <Pencil size={13} /> Rename
          </button>
          {current.status === 'archived' ? (
            <button className="btn btn-sm" onClick={() => setStatus(level, current, 'active')}>
              <ArchiveRestore size={13} /> Restore
            </button>
          ) : (
            <button className="btn btn-sm" onClick={() => setStatus(level, current, 'archived')}>
              <Archive size={13} /> Archive
            </button>
          )}
          <button className="btn btn-sm btn-danger" onClick={() => remove(level, current)} aria-label="Delete permanently">
            <Trash2 size={13} />
          </button>
        </div>
      )}
    </div>
  );
}


export default function ExamsPage() {
  const can = useCan();
  const [showArchived, setShowArchived] = useState(false);
  const { tree, loading, error, reload } = useTaxonomy(showArchived);
  const [sel, setSel] = useState<{ exam?: string; subject?: string; chapter?: string; topic?: string }>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const editable = can('taxonomy:write');

  const exam = tree.find((e) => e.id === sel.exam);
  const subject = exam?.subjects.find((s) => s.id === sel.subject);
  const chapter = subject?.chapters.find((c) => c.id === sel.chapter);

  async function run(fn: () => Promise<unknown>, ok: string) {
    setErr(null);
    try {
      await fn();
      setMsg(ok);
      await reload();
    } catch (e) {
      setErr(errorMessage(e));
    }
  }

  const add = (level: Level, parentId?: string) => {
    const name = window.prompt(`New ${level} name`);
    if (!name?.trim()) return;
    const body: Record<string, string> = { name: name.trim() };
    const key = PARENT_KEY[level];
    if (key && parentId) body[key] = parentId;
    void run(() => api(PATH[level], { method: 'POST', body }), `${level[0]!.toUpperCase()}${level.slice(1)} added.`);
  };
  const rename = (level: Level, item: Item) => {
    const name = window.prompt(`Rename ${level}`, item.name);
    if (!name?.trim() || name === item.name) return;
    void run(() => api(`${PATH[level]}/${item.id}`, { method: 'PUT', body: { name: name.trim() } }), 'Renamed.');
  };
  const setStatus = (level: Level, item: Item, status: 'active' | 'archived') =>
    void run(() => api(`${PATH[level]}/${item.id}`, { method: 'PUT', body: { status } }), status === 'archived' ? 'Archived.' : 'Restored.');
  const remove = (level: Level, item: Item) => {
    if (!window.confirm(`Delete "${item.name}" permanently? Only possible when nothing uses it — otherwise archive it.`)) return;
    void run(() => api(`${PATH[level]}/${item.id}`, { method: 'DELETE', query: { hard: 'true' } }), 'Deleted.');
  };

  const handlers: Handlers = { editable, add, rename, setStatus, remove };

  return (
    <>
      <PageHead
        title="Exams, Subjects & Chapters"
        subtitle="The syllabus tree every question and mock test hangs off. Archiving hides an item from new work but keeps its history."
        actions={
          <label className="check" style={{ margin: 0 }}>
            <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
            Show archived
          </label>
        }
      />
      <OkAlert message={msg} />
      <ErrorAlert error={err ?? error} />
      {loading && !tree.length ? (
        <Loading />
      ) : (
        <div className="tree">
          <Column
            h={handlers}
            level="exam"
            title="Exams"
            items={tree.map((e) => ({ id: e.id, name: e.name, status: e.status, count: `${e.subjects.length}` }))}
            selected={sel.exam}
            onSelect={(id) => setSel({ exam: id })}
          />
          <Column
            h={handlers}
            level="subject"
            title="Subjects"
            parentId={exam?.id}
            items={exam ? exam.subjects.map((s) => ({ id: s.id, name: s.name, status: s.status, count: `${s.chapters.length}` })) : null}
            selected={sel.subject}
            onSelect={(id) => setSel({ exam: sel.exam, subject: id })}
          />
          <Column
            h={handlers}
            level="chapter"
            title="Chapters"
            parentId={subject?.id}
            items={
              subject
                ? subject.chapters.map((c) => ({
                    id: c.id,
                    name: c.name,
                    status: c.status,
                    count: `${c.questionCounts.published}/${c.questionCounts.total}`,
                  }))
                : null
            }
            selected={sel.chapter}
            onSelect={(id) => setSel({ exam: sel.exam, subject: sel.subject, chapter: id })}
          />
          <Column
            h={handlers}
            level="topic"
            title="Topics"
            parentId={chapter?.id}
            items={chapter ? chapter.topics.map((t) => ({ id: t.id, name: t.name, status: t.status })) : null}
            selected={sel.topic}
            onSelect={(id) => setSel({ ...sel, topic: id })}
          />
        </div>
      )}
      <p className="small muted" style={{ marginTop: 12 }}>
        Chapter numbers show published / total questions.
      </p>
    </>
  );
}
