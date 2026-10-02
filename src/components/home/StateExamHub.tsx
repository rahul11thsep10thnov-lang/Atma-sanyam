"use client";

import { useMemo, useState } from "react";
import { FileText, Rocket, Target, Timer, BadgeCheck } from "lucide-react";
import { STATES } from "@/data/states";
import { getQuestionsForProfile } from "@/data/questions";
import { getMocksForProfile } from "@/data/mockTests";
import { getPyqPapersForProfile } from "@/data/pyq";
import { SUBJECT_MAP } from "@/data/subjects";
import { CtaBar, Pill, SubjectTile } from "@/components/app/primitives";
import { useSiteSettings } from "@/lib/site";
import { cn } from "@/lib/utils";
import type { ExamType, StateCode } from "@/types";

/** State tabs (Constable / SI underneath) → that profile's mock tests:
 * full mocks, previous-year practice papers and subject-wise tests. */
export default function StateExamHub() {
  const [state, setState] = useState<StateCode>("up");
  const [exam, setExam] = useState<ExamType>("constable");
  const site = useSiteSettings();

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
    <section className="card card-top overflow-hidden" style={{ ["--accent" as string]: "#ff6a5a" }}>
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#ffece9] text-brand-coral">
            <Target size={24} />
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-[1.4rem] font-bold leading-tight">Apna State chunein</h2>
            <p className="mt-1 text-[15px] text-slate-500">Constable &amp; SI · full mocks · practice papers · subject-wise · Hinglish</p>
          </div>
        </div>

        {/* State tabs */}
        <div className="no-scrollbar -mx-4 mt-4 flex gap-2.5 overflow-x-auto px-4 pb-1 sm:-mx-5 sm:px-5 lg:flex-wrap" role="tablist" aria-label="Choose state">
          {STATES.map((s) => (
            <button key={s.code} role="tab" aria-selected={s.code === state} onClick={() => setState(s.code)} className="state-tab">
              {s.hinglishName}
            </button>
          ))}
        </div>

        {/* Exam toggle, directly beneath the state tabs */}
        <div className="mt-3 flex gap-2.5" role="tablist" aria-label="Choose exam">
          {(["constable", "si"] as ExamType[]).map((e) => (
            <button
              key={e}
              role="tab"
              aria-selected={e === exam}
              onClick={() => setExam(e)}
              className={cn(
                "rounded-xl border-2 px-5 py-2.5 font-display text-[16px] font-extrabold transition-colors",
                e === exam ? "border-brand-mint bg-brand-mint text-white shadow-md" : "border-[var(--card-border)] bg-white text-slate-600 hover:border-brand-mint"
              )}
            >
              {e === "constable" ? "Constable" : "Sub-Inspector"}
            </button>
          ))}
        </div>
      </div>

      {/* Mock tests block (full mocks + practice papers + subject-wise) */}
      <div className="border-t border-dashed border-[var(--card-border)] p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 font-display text-[15px] font-medium text-slate-500">
            <Rocket size={16} /> Mock Tests
          </span>
          <Pill>
            {site.freeQuota.full} full + {site.freeQuota.subject} subject free
          </Pill>
        </div>
        <h3 className="mt-2 font-display text-[1.25rem] font-bold leading-snug">
          {stateInfo.hinglishName} Police {examLabel} Mock Tests in Hinglish
        </h3>
        <div className="mt-3 rounded-xl border border-[#f5dd9a] bg-[#fffaeb] px-3 py-2 font-display text-sm font-medium text-[#8a5a00]">
          <Timer size={14} className="-mt-0.5 mr-1 inline" /> Real timer, question palette aur detailed result analysis
        </div>

        {data.fullMock && (
          <CtaBar className="mt-4" href={`/mock-test/${data.fullMock.id}`} label="Full Mock Test shuru karein" icon={Rocket} variant="orange" />
        )}
        {data.fullMock && (
          <p className="mt-2 text-[15px] text-slate-500">
            {data.fullMock.questionCount} Qs · {data.fullMock.durationMinutes} min · +{data.fullMock.marksPerQuestion} per correct
          </p>
        )}

        <CtaBar className="mt-3" href={`/pyq?state=${state}&exam=${exam}`} label="Previous-year practice papers" icon={FileText} variant="green" pill="Open" />
        <p className="mt-2 text-[15px] text-slate-500">
          {data.papers.length} sets · {data.questions.length} Qs · answers + explanation
        </p>

        <p className="mt-4 font-display text-base font-bold text-brand-dark">Subject-wise Mock Tests</p>
        <div className="mt-2.5 grid grid-cols-2 gap-2.5">
          {data.topSubjects.map(([subject, count]) => {
            const mock = data.mocks.find((m) => m.subject === subject);
            return (
              <SubjectTile
                key={subject}
                href={mock ? `/mock-test/${mock.id}` : `/practice?state=${state}&exam=${exam}&subject=${subject}`}
                subject={subject}
                title={SUBJECT_MAP[subject]?.hinglishName ?? subject}
                subtitle={mock ? `${mock.questionCount} Qs · ${mock.durationMinutes} min` : `${count} Qs · quick practice`}
              />
            );
          })}
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-[14px] text-slate-500">
          <BadgeCheck size={15} className="text-[#0b8a4e]" /> Login ke baad {site.freeQuota.full} full + {site.freeQuota.subject} subject-wise tests free — uske baad ₹
          {site.plan.priceInr}/saal ka Mock Test Pass.
        </p>
      </div>
    </section>
  );
}
