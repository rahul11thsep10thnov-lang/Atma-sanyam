"use client";

import { useMemo, useState } from "react";
import { FileText, Rocket, Target, CheckCircle2, Timer } from "lucide-react";
import { STATES } from "@/data/states";
import { getQuestionsForProfile } from "@/data/questions";
import { getMocksForProfile } from "@/data/mockTests";
import { getPyqPapersForProfile } from "@/data/pyq";
import { SUBJECT_MAP } from "@/data/subjects";
import { CtaBar, Pill, SubjectTile } from "@/components/app/primitives";
import { cn } from "@/lib/utils";
import type { ExamType, StateCode } from "@/types";

export default function StateExamHub() {
  const [state, setState] = useState<StateCode>("up");
  const [exam, setExam] = useState<ExamType>("constable");

  const data = useMemo(() => {
    const questions = getQuestionsForProfile(state, exam);
    const mocks = getMocksForProfile(state, exam);
    const papers = getPyqPapersForProfile(state, exam);
    const bySubject = new Map<string, number>();
    questions.forEach((q) => bySubject.set(q.subject, (bySubject.get(q.subject) ?? 0) + 1));
    const topSubjects = [...bySubject.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
    const fullMock = mocks.find((m) => m.type === "full");
    return { questions, mocks, papers, topSubjects, fullMock };
  }, [state, exam]);

  const stateInfo = STATES.find((s) => s.code === state)!;
  const examLabel = exam === "constable" ? "Constable" : "SI";

  return (
    <section className="card card-top overflow-hidden" style={{ ["--accent" as string]: "#ff6a13" }}>
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-orange-light text-brand-orange">
            <Target size={24} />
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-[1.35rem] font-bold leading-tight text-brand-dark">
              {stateInfo.hinglishName} Police Practice Papers &amp; Mock Tests
            </h2>
            <p className="mt-1 text-[15px] text-slate-500">
              Constable &amp; SI · subject-wise practice · full mocks · Hinglish
            </p>
          </div>
        </div>

        {/* State picker */}
        <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 sm:-mx-5 sm:px-5" role="tablist" aria-label="Choose state">
          {STATES.map((s) => (
            <button
              key={s.code}
              role="tab"
              aria-selected={s.code === state}
              onClick={() => setState(s.code)}
              className={cn(
                "shrink-0 rounded-full border px-3.5 py-1.5 font-display text-sm font-semibold transition-colors",
                s.code === state
                  ? "border-brand-orange bg-brand-orange text-white"
                  : "border-[var(--card-border)] bg-white text-slate-600 hover:border-brand-orange/50"
              )}
            >
              {s.hinglishName}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-dashed border-[var(--card-border)] p-4 sm:p-5">
        {/* Exam toggle */}
        <div className="flex gap-2" role="tablist" aria-label="Choose exam">
          {(["constable", "si"] as ExamType[]).map((e) => (
            <button
              key={e}
              role="tab"
              aria-selected={e === exam}
              onClick={() => setExam(e)}
              className={cn(
                "rounded-xl px-4 py-2 font-display text-[15px] font-semibold transition-colors",
                e === exam ? "bg-brand-green text-white" : "border border-[var(--card-border)] bg-white text-slate-600"
              )}
            >
              {e === "constable" ? "Constable" : "Sub-Inspector"}
            </button>
          ))}
        </div>

        {/* Practice papers block */}
        <div className="card card-accent mt-4 bg-[#fafbfd] p-4" style={{ ["--accent" as string]: "#10a760" }}>
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 font-display text-[15px] font-medium text-slate-500">
              <FileText size={16} /> Practice Papers
            </span>
            <Pill>Free</Pill>
          </div>
          <h3 className="mt-2 font-display text-[1.2rem] font-semibold leading-snug text-brand-dark">
            {stateInfo.hinglishName} Police {examLabel} Practice Papers in Hinglish
          </h3>
          <div className="mt-3 inline-flex items-center gap-2 rounded-xl border border-[#bfe9d2] bg-brand-green-light px-3 py-1.5 font-display text-sm font-semibold text-[#0b7a45]">
            <CheckCircle2 size={15} /> Free for every student
          </div>
          <CtaBar
            className="mt-4"
            href={`/pyq?state=${state}&exam=${exam}`}
            label="Practice Full Papers Online"
            icon={FileText}
            variant="green"
          />
          <p className="mt-2.5 text-[15px] text-slate-500">
            {data.papers.length} sets · {data.questions.length} Qs · answers + explanation
          </p>

          <p className="mt-4 font-display text-base font-semibold text-brand-dark">Practice Subjectwise</p>
          <div className="mt-2.5 grid grid-cols-2 gap-2.5">
            {data.topSubjects.map(([subject, count]) => (
              <SubjectTile
                key={subject}
                href={`/practice?state=${state}&exam=${exam}&subject=${subject}`}
                subject={subject}
                title={SUBJECT_MAP[subject]?.hinglishName ?? subject}
                subtitle={`${count} Qs`}
              />
            ))}
          </div>
        </div>

        {/* Mock tests block */}
        <div className="card card-accent mt-4 bg-[#fafbfd] p-4" style={{ ["--accent" as string]: "#ff6a13" }}>
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 font-display text-[15px] font-medium text-slate-500">
              <Rocket size={16} /> Mock Tests
            </span>
            <Pill>{data.mocks.length} free</Pill>
          </div>
          <h3 className="mt-2 font-display text-[1.2rem] font-semibold leading-snug text-brand-dark">
            {stateInfo.hinglishName} Police {examLabel} Mock Tests in Hinglish
          </h3>
          <div className="mt-3 rounded-xl border border-[#f5dd9a] bg-[#fffaeb] px-3 py-2 font-display text-sm font-medium text-[#8a5a00]">
            <Timer size={14} className="mr-1 inline -mt-0.5" /> Real timer, question palette aur detailed result analysis
          </div>
          {data.fullMock && (
            <CtaBar
              className="mt-4"
              href={`/mock-test/${data.fullMock.id}`}
              label="Practice Full Mocks Online"
              icon={Rocket}
              variant="orange"
            />
          )}
          {data.fullMock && (
            <p className="mt-2.5 text-[15px] text-slate-500">
              {data.fullMock.questionCount} Qs · {data.fullMock.durationMinutes} min · +{data.fullMock.marksPerQuestion} per correct
            </p>
          )}

          <p className="mt-4 font-display text-base font-semibold text-brand-dark">Practice Subjectwise</p>
          <div className="mt-2.5 grid grid-cols-2 gap-2.5">
            {data.topSubjects.map(([subject]) => {
              const mock = data.mocks.find((m) => m.subject === subject);
              return (
                <SubjectTile
                  key={subject}
                  href={mock ? `/mock-test/${mock.id}` : `/practice?state=${state}&exam=${exam}&subject=${subject}`}
                  subject={subject}
                  title={SUBJECT_MAP[subject]?.hinglishName ?? subject}
                  subtitle={mock ? `${mock.questionCount} Qs · ${mock.durationMinutes} min` : "Quick practice"}
                />
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
