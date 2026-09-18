"use client";

import { useEffect, useMemo, useState } from "react";
import { Question, QuestionStatus, StateCode, ExamType, Difficulty } from "@/types";
import { STATES } from "@/data/states";
import { SUBJECTS } from "@/data/subjects";
import {
  deleteAdminQuestion,
  getAdminQuestions,
  upsertAdminQuestion,
} from "@/lib/localStore";
import Badge from "@/components/ui/Badge";
import { Copy, Trash2, Pencil, Plus } from "lucide-react";

const STATUS_TONE: Record<QuestionStatus, "navy" | "gold" | "green" | "red" | "gray"> = {
  draft: "gray",
  under_review: "gold",
  approved: "navy",
  published: "green",
  rejected: "red",
};

function emptyQuestion(): Question {
  return {
    id: `CUSTOM-${Date.now()}`,
    state: "up",
    exam: "constable",
    subject: "gk",
    topic: "",
    difficulty: "easy",
    question: "",
    options: ["", "", "", ""],
    correctAnswer: 0,
    explanation: "",
    source: "",
    language: "hinglish",
    tags: [],
    status: "draft",
    isSample: false,
  };
}

export default function AdminQuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [filterState, setFilterState] = useState("");
  const [filterExam, setFilterExam] = useState("");
  const [filterSubject, setFilterSubject] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Question | null>(null);

  useEffect(() => {
    // Hydrate from the browser-only localStorage admin store after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQuestions(getAdminQuestions());
  }, []);

  const filtered = useMemo(() => {
    return questions.filter((q) => {
      if (filterState && q.state !== filterState) return false;
      if (filterExam && q.exam !== filterExam) return false;
      if (filterSubject && q.subject !== filterSubject) return false;
      if (filterStatus && q.status !== filterStatus) return false;
      if (search && !q.question.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [questions, filterState, filterExam, filterSubject, filterStatus, search]);

  function refresh() {
    setQuestions(getAdminQuestions());
  }

  function handleDelete(id: string) {
    if (!confirm("Is question ko delete karein?")) return;
    deleteAdminQuestion(id);
    refresh();
  }

  function handleDuplicate(q: Question) {
    const dup: Question = { ...q, id: `${q.id}-copy-${crypto.randomUUID().slice(0, 8)}`, status: "draft" };
    upsertAdminQuestion(dup);
    refresh();
  }

  function handleStatusChange(q: Question, status: QuestionStatus) {
    upsertAdminQuestion({ ...q, status });
    refresh();
  }

  function handleSave(q: Question) {
    upsertAdminQuestion(q);
    setEditing(null);
    refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Questions</h2>
          <p className="text-xs text-gray-500">{filtered.length} / {questions.length} questions</p>
        </div>
        <button onClick={() => setEditing(emptyQuestion())} className="btn-primary px-4 py-2.5 text-sm inline-flex items-center gap-1.5">
          <Plus size={15} /> Add Question
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <select className="select w-auto" value={filterState} onChange={(e) => setFilterState(e.target.value)}>
          <option value="">Sabhi States</option>
          {STATES.map((s) => (
            <option key={s.code} value={s.code}>{s.hinglishName}</option>
          ))}
        </select>
        <select className="select w-auto" value={filterExam} onChange={(e) => setFilterExam(e.target.value)}>
          <option value="">Sabhi Exams</option>
          <option value="constable">Constable</option>
          <option value="si">SI</option>
        </select>
        <select className="select w-auto" value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)}>
          <option value="">Sabhi Subjects</option>
          {SUBJECTS.map((s) => (
            <option key={s.id} value={s.id}>{s.hinglishName}</option>
          ))}
        </select>
        <select className="select w-auto" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">Sabhi Status</option>
          {(["draft", "under_review", "approved", "published", "rejected"] as QuestionStatus[]).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search question text..."
          className="select w-auto flex-1 min-w-[180px]"
        />
      </div>

      <div className="space-y-2">
        {filtered.slice(0, 100).map((q) => (
          <div key={q.id} className="card p-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 mb-1">
                  <Badge tone={STATUS_TONE[q.status]}>{q.status}</Badge>
                  <Badge tone="gray">{q.state.toUpperCase()} · {q.exam.toUpperCase()}</Badge>
                  <Badge tone="navy">{q.subject}</Badge>
                  <Badge tone="gray">{q.difficulty}</Badge>
                </div>
                <p className="text-sm font-medium text-gray-800 truncate">{q.question}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{q.id}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button onClick={() => setEditing(q)} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500" aria-label="Edit">
                  <Pencil size={15} />
                </button>
                <button onClick={() => handleDuplicate(q)} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500" aria-label="Duplicate">
                  <Copy size={15} />
                </button>
                <button onClick={() => handleDelete(q.id)} className="p-1.5 rounded-md hover:bg-red-50 text-brand-red" aria-label="Delete">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(["draft", "under_review", "approved", "published", "rejected"] as QuestionStatus[]).map((s) => (
                <button
                  key={s}
                  onClick={() => handleStatusChange(q, s)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold border ${
                    q.status === s ? "border-brand-navy bg-blue-50 text-brand-navy" : "border-gray-200 text-gray-500"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ))}
        {filtered.length > 100 && (
          <p className="text-xs text-gray-400 text-center py-2">
            {filtered.length - 100} more questions — filter karein narrow karne ke liye.
          </p>
        )}
      </div>

      {editing && (
        <QuestionEditor question={editing} onCancel={() => setEditing(null)} onSave={handleSave} />
      )}
    </div>
  );
}

function QuestionEditor({
  question,
  onCancel,
  onSave,
}: {
  question: Question;
  onCancel: () => void;
  onSave: (q: Question) => void;
}) {
  const [form, setForm] = useState<Question>(question);

  function update<K extends keyof Question>(key: K, value: Question[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function updateOption(i: number, value: string) {
    const next = [...form.options] as Question["options"];
    next[i] = value;
    setForm((f) => ({ ...f, options: next }));
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto p-5">
        <h3 className="text-base font-bold text-gray-900 mb-4">
          {question.question ? "Edit Question" : "Add Question"}
        </h3>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <select className="select" value={form.state} onChange={(e) => update("state", e.target.value as StateCode)}>
            {STATES.map((s) => (
              <option key={s.code} value={s.code}>{s.hinglishName}</option>
            ))}
          </select>
          <select className="select" value={form.exam} onChange={(e) => update("exam", e.target.value as ExamType)}>
            <option value="constable">Constable</option>
            <option value="si">SI</option>
          </select>
          <select className="select" value={form.subject} onChange={(e) => update("subject", e.target.value)}>
            {SUBJECTS.map((s) => (
              <option key={s.id} value={s.id}>{s.hinglishName}</option>
            ))}
          </select>
          <select className="select" value={form.difficulty} onChange={(e) => update("difficulty", e.target.value as Difficulty)}>
            <option value="easy">Easy</option>
            <option value="moderate">Moderate</option>
          </select>
        </div>

        <input
          className="select mb-3"
          placeholder="Topic"
          value={form.topic}
          onChange={(e) => update("topic", e.target.value)}
        />

        <textarea
          className="select mb-3"
          rows={3}
          placeholder="Question text"
          value={form.question}
          onChange={(e) => update("question", e.target.value)}
        />

        {form.options.map((opt, i) => (
          <div key={i} className="flex items-center gap-2 mb-2">
            <input
              type="radio"
              checked={form.correctAnswer === i}
              onChange={() => update("correctAnswer", i)}
              aria-label={`Correct answer option ${i + 1}`}
            />
            <input
              className="select"
              placeholder={`Option ${i + 1}`}
              value={opt}
              onChange={(e) => updateOption(i, e.target.value)}
            />
          </div>
        ))}

        <textarea
          className="select mb-3"
          rows={2}
          placeholder="Explanation"
          value={form.explanation}
          onChange={(e) => update("explanation", e.target.value)}
        />

        <input
          className="select mb-4"
          placeholder="Source"
          value={form.source}
          onChange={(e) => update("source", e.target.value)}
        />

        <div className="flex gap-3">
          <button onClick={onCancel} className="btn-secondary bg-white flex-1 py-2.5 text-sm">
            Cancel
          </button>
          <button
            onClick={() =>
              onSave({
                ...form,
                id: form.id || `CUSTOM-${Date.now()}`,
              })
            }
            disabled={!form.question || form.options.some((o) => !o) || !form.explanation}
            className="btn-primary flex-1 py-2.5 text-sm disabled:opacity-40"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
