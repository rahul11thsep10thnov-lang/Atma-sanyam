"use client";

import { useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { STATES } from "@/data/states";
import { SUBJECTS } from "@/data/subjects";
import { getSubjectsForProfile, getTopicsForSubject, filterQuestions } from "@/data/questions";
import { getSubjectAccent } from "@/lib/accentColors";
import { SubjectIcon } from "@/components/app/primitives";
import { cn } from "@/lib/utils";
import { StateCode, ExamType, Difficulty } from "@/types";
import { PenSquare } from "lucide-react";

function PracticeForm() {
  const router = useRouter();
  const params = useSearchParams();

  const [state, setState] = useState<StateCode>((params.get("state") as StateCode) || "up");
  const [exam, setExam] = useState<ExamType>((params.get("exam") as ExamType) === "si" ? "si" : "constable");
  const [subject, setSubject] = useState<string>(params.get("subject") ?? "");
  const [topic, setTopic] = useState<string>("");
  const [count, setCount] = useState(10);
  const [difficulty, setDifficulty] = useState<Difficulty | "mixed">("mixed");

  const availableSubjects = useMemo(() => {
    const ids = getSubjectsForProfile(state, exam);
    return SUBJECTS.filter((s) => ids.includes(s.id)).map((s) => ({
      ...s,
      count: filterQuestions({ state, exam, subject: s.id }).length,
    }));
  }, [state, exam]);

  // A subject carried over from a link may not exist for this state/exam.
  const subjectValid = !subject || availableSubjects.some((s) => s.id === subject);
  const effectiveSubject = subjectValid ? subject : "";

  const availableTopics = useMemo(() => {
    if (!effectiveSubject) return [];
    return getTopicsForSubject(state, exam, effectiveSubject);
  }, [state, exam, effectiveSubject]);

  const availableCount = useMemo(
    () =>
      filterQuestions({
        state,
        exam,
        subject: effectiveSubject || undefined,
        topic: topic || undefined,
        difficulty,
      }).length,
    [state, exam, effectiveSubject, topic, difficulty]
  );

  function start() {
    const q = new URLSearchParams({ state, exam, count: String(count), difficulty });
    if (effectiveSubject) q.set("subject", effectiveSubject);
    if (topic) q.set("topic", topic);
    router.push(`/practice/run?${q.toString()}`);
  }

  return (
    <div className="space-y-4">
      <Block label="State">
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          {STATES.map((s) => (
            <Chip
              key={s.code}
              active={state === s.code}
              onClick={() => {
                setState(s.code);
                setTopic("");
              }}
            >
              {s.hinglishName}
            </Chip>
          ))}
        </div>
      </Block>

      <Block label="Exam">
        <Segmented
          value={exam}
          onChange={(v) => {
            setExam(v as ExamType);
            setTopic("");
          }}
          options={[
            { value: "constable", label: "Constable" },
            { value: "si", label: "Sub-Inspector" },
          ]}
        />
      </Block>

      <Block label="Subject">
        {!subjectValid && (
          <p className="mb-2 text-[14px] text-[#a16207]">Is exam me yeh subject available nahi hai — koi aur chunein.</p>
        )}
        <div className="grid grid-cols-2 gap-2.5">
          <SubjectButton
            active={!effectiveSubject}
            onClick={() => {
              setSubject("");
              setTopic("");
            }}
            title="Sabhi Subjects"
            sub="Mixed practice"
            subject="gk"
          />
          {availableSubjects.map((s) => (
            <SubjectButton
              key={s.id}
              active={effectiveSubject === s.id}
              onClick={() => {
                setSubject(s.id);
                setTopic("");
              }}
              title={s.hinglishName}
              sub={`${s.count} Qs`}
              subject={s.id}
            />
          ))}
        </div>
      </Block>

      {availableTopics.length > 1 && (
        <Block label="Topic (optional)">
          <div className="flex flex-wrap gap-2">
            <Chip active={!topic} onClick={() => setTopic("")}>
              Sabhi Topics
            </Chip>
            {availableTopics.map((t) => (
              <Chip key={t} active={topic === t} onClick={() => setTopic(t)}>
                {t}
              </Chip>
            ))}
          </div>
        </Block>
      )}

      <Block label="Number of Questions">
        <Segmented
          value={String(count)}
          onChange={(v) => setCount(Number(v))}
          options={[10, 20, 25, 50].map((c) => ({ value: String(c), label: String(c) }))}
        />
      </Block>

      <Block label="Difficulty">
        <Segmented
          value={difficulty}
          onChange={(v) => setDifficulty(v as Difficulty | "mixed")}
          options={[
            { value: "mixed", label: "Easy + Moderate" },
            { value: "easy", label: "Easy" },
            { value: "moderate", label: "Moderate" },
          ]}
        />
      </Block>

      <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-10 rounded-2xl border border-[var(--card-border)] bg-white/95 p-3 backdrop-blur md:bottom-3">
        <p className="mb-2 text-center font-display text-[14px] text-slate-500">
          {availableCount} questions available
          {availableCount > 0 && count > availableCount && ` · ${availableCount} milenge`}
        </p>
        <button onClick={start} disabled={availableCount === 0} className="btn-cta w-full py-3.5 text-[17px] disabled:opacity-40">
          Practice Start Karein →
        </button>
      </div>
    </div>
  );
}

export default function PracticePage() {
  return (
    <div className="container-page max-w-3xl py-5">
      <div className="mb-5 flex items-start gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-purple-light text-brand-purple">
          <PenSquare size={24} />
        </span>
        <div>
          <p className="eyebrow text-[#5b5bd6]">Subject-wise Practice</p>
          <h1 className="font-display text-[1.6rem] font-bold leading-tight text-brand-dark">Quick Practice</h1>
          <p className="mt-0.5 text-[15px] text-slate-500">
            Har answer ke baad turant result aur explanation.
          </p>
        </div>
      </div>
      <Suspense fallback={null}>
        <PracticeForm />
      </Suspense>
    </div>
  );
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="card p-4">
      <p className="mb-3 font-display text-[15px] font-semibold text-brand-dark">{label}</p>
      {children}
    </section>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "shrink-0 rounded-full border px-3.5 py-1.5 font-display text-sm font-semibold transition-colors",
        active ? "border-brand-orange bg-brand-orange text-white" : "border-[var(--card-border)] bg-white text-slate-600"
      )}
    >
      {children}
    </button>
  );
}

function Segmented({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex rounded-2xl bg-brand-orange-light p-1" role="radiogroup">
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "flex-1 rounded-xl py-2.5 font-display text-[15px] font-semibold transition-colors",
            value === o.value ? "bg-gradient-to-r from-[#ff6a00] to-[#ff8b3d] text-white shadow-md shadow-orange-300/40" : "text-[#9a4a12]"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function SubjectButton({
  active,
  onClick,
  title,
  sub,
  subject,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  sub: string;
  subject: string;
}) {
  const a = getSubjectAccent(subject);
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn("tile text-left", active && "ring-2 ring-brand-orange ring-offset-1")}
      style={{ ["--tile-bg" as string]: a.tileBg, ["--tile-border" as string]: a.tileBorder, ["--tile-text" as string]: a.tileText }}
    >
      <span className="tile-icon">
        <SubjectIcon subject={subject} size={16} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-[14px] font-semibold leading-tight tracking-[-0.01em] text-brand-dark break-words line-clamp-2">{title}</span>
        <span className="mt-0.5 block text-[13px] leading-snug text-slate-500 line-clamp-2">{sub}</span>
      </span>
    </button>
  );
}
