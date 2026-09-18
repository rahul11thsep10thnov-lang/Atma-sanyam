"use client";

import { useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { STATES } from "@/data/states";
import { SUBJECTS } from "@/data/subjects";
import { getSubjectsForProfile, getTopicsForSubject, filterQuestions } from "@/data/questions";
import { StateCode, ExamType, Difficulty } from "@/types";

function PracticeForm() {
  const router = useRouter();
  const params = useSearchParams();

  const [state, setState] = useState<StateCode | "">((params.get("state") as StateCode) || "");
  const [exam, setExam] = useState<ExamType | "">((params.get("exam") as ExamType) || "");
  const [subject, setSubject] = useState<string>("");
  const [topic, setTopic] = useState<string>("");
  const [count, setCount] = useState(10);
  const [difficulty, setDifficulty] = useState<Difficulty | "mixed">("mixed");

  const availableSubjects = useMemo(() => {
    if (!state || !exam) return SUBJECTS;
    const ids = getSubjectsForProfile(state, exam);
    return SUBJECTS.filter((s) => ids.includes(s.id));
  }, [state, exam]);

  const availableTopics = useMemo(() => {
    if (!state || !exam || !subject) return [];
    return getTopicsForSubject(state, exam, subject);
  }, [state, exam, subject]);

  const availableCount = useMemo(() => {
    if (!state || !exam) return 0;
    return filterQuestions({
      state,
      exam,
      subject: subject || undefined,
      topic: topic || undefined,
      difficulty,
    }).length;
  }, [state, exam, subject, topic, difficulty]);

  function start() {
    if (!state || !exam) return;
    const q = new URLSearchParams({
      state,
      exam,
      count: String(count),
      difficulty,
    });
    if (subject) q.set("subject", subject);
    if (topic) q.set("topic", topic);
    router.push(`/practice/run?${q.toString()}`);
  }

  return (
    <div className="card p-5 space-y-5">
      <Field label="State">
        <select
          className="select"
          value={state}
          onChange={(e) => {
            setState(e.target.value as StateCode);
            setSubject("");
            setTopic("");
          }}
        >
          <option value="">Apna State Select Karein</option>
          {STATES.map((s) => (
            <option key={s.code} value={s.code}>
              {s.hinglishName}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Exam">
        <div className="flex gap-2">
          {(["constable", "si"] as ExamType[]).map((e) => (
            <button
              key={e}
              onClick={() => {
                setExam(e);
                setSubject("");
                setTopic("");
              }}
              className={`flex-1 rounded-lg border px-3 py-2.5 text-sm font-semibold ${
                exam === e ? "border-brand-navy bg-blue-50 text-brand-navy" : "border-gray-200 text-gray-600"
              }`}
            >
              {e === "constable" ? "Constable" : "SI"}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Subject (optional)">
        <select
          className="select"
          value={subject}
          onChange={(e) => {
            setSubject(e.target.value);
            setTopic("");
          }}
          disabled={!state || !exam}
        >
          <option value="">Sabhi Subjects</option>
          {availableSubjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.hinglishName}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Topic (optional)">
        <select
          className="select"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          disabled={!subject}
        >
          <option value="">Sabhi Topics</option>
          {availableTopics.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Number of Questions">
        <div className="flex gap-2">
          {[10, 20, 25, 50].map((c) => (
            <button
              key={c}
              onClick={() => setCount(c)}
              className={`flex-1 rounded-lg border px-3 py-2.5 text-sm font-semibold ${
                count === c ? "border-brand-navy bg-blue-50 text-brand-navy" : "border-gray-200 text-gray-600"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Difficulty">
        <div className="flex gap-2">
          {(["easy", "moderate", "mixed"] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDifficulty(d)}
              className={`flex-1 rounded-lg border px-3 py-2.5 text-sm font-semibold capitalize ${
                difficulty === d ? "border-brand-navy bg-blue-50 text-brand-navy" : "border-gray-200 text-gray-600"
              }`}
            >
              {d === "mixed" ? "Easy + Moderate" : d}
            </button>
          ))}
        </div>
      </Field>

      <div className="pt-2">
        <p className="text-xs text-gray-500 mb-3">
          {state && exam ? `${availableCount} questions available is filter ke saath.` : "Pehle State aur Exam select karein."}
        </p>
        <button
          onClick={start}
          disabled={!state || !exam || availableCount === 0}
          className="btn-primary w-full py-3 text-sm disabled:opacity-40"
        >
          Practice Start Karein
        </button>
      </div>
    </div>
  );
}

export default function PracticePage() {
  return (
    <div className="container-page py-8 max-w-xl">
      <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900">Quick Practice</h1>
      <p className="mt-1 text-sm text-gray-600 mb-6">
        State, exam, subject aur topic choose karein — apna custom practice set banayein.
      </p>
      <Suspense fallback={null}>
        <PracticeForm />
      </Suspense>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1.5">{label}</label>
      {children}
    </div>
  );
}
