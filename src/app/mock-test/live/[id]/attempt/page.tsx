"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Lock, ShieldCheck } from "lucide-react";
import { openEnrollPopup } from "@/lib/enroll";
import ExamRunner, { type RunnerAnswers } from "@/components/exam/ExamRunner";
import ExamResult from "@/components/exam/ExamResult";
import { LiveState } from "@/components/mock/LiveState";
import { saveAttempt } from "@/lib/localStore";
import { cacheDelete, cacheGet, cacheSet, liveApi, liveApiEnabled, LiveApiError, type LiveResult, type LiveTest, type StartedAttempt } from "@/lib/liveApi";
import { useLiveTest } from "@/lib/useLiveTest";

type Phase = "starting" | "running" | "submitting" | "failed" | "done";

interface Pending {
  attemptId: string;
  answers: RunnerAnswers;
}

/** Answers as the API expects them: option labels, never a score. */
function toPayload(test: LiveTest, answers: RunnerAnswers) {
  return test.questions.map((q) => {
    const a = answers[q.id];
    const i = a?.selected;
    return {
      questionId: q.id,
      selectedOption: i === null || i === undefined ? null : (q.options[i]?.label ?? null),
      markedForReview: !!a?.marked,
    };
  });
}

export default function LiveAttemptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { test, error: loadError, reload } = useLiveTest(id);
  const [phase, setPhase] = useState<Phase>("starting");
  const [attempt, setAttempt] = useState<(StartedAttempt & { remainingSeconds: number }) | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const [paywall, setPaywall] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<LiveResult | null>(null);

  const start = useCallback(async () => {
    setStartError(null);
    // A submission that failed earlier (e.g. offline) is finished first.
    const pending = cacheGet<Pending>(`pending_${id}`);
    if (pending) {
      setAttempt({ attemptId: pending.attemptId, startedAt: "", deadlineAt: "", serverTime: "", resumed: true, totalQuestions: 0, remainingSeconds: 0 });
      setPhase("failed");
      setSubmitError("Pichhli baar test submit nahi ho paaya tha. Answers is device par safe hain.");
      return;
    }
    try {
      const a = await liveApi.start(id);
      // Time left by the server's own clock, so a wrong phone clock can't add time.
      const remainingSeconds = Math.max(0, Math.round((Date.parse(a.deadlineAt) - Date.parse(a.serverTime)) / 1000));
      setAttempt({ ...a, remainingSeconds });
      setPhase("running");
    } catch (e) {
      if (e instanceof LiveApiError && e.status === 402) {
        // Free quota used up: the server decided; show the enrolment popup.
        setPaywall(e.message);
        openEnrollPopup(e.message);
        return;
      }
      setStartError(e instanceof LiveApiError && e.status !== 0 ? e.message : "Unable to start the test. Check your connection and try again.");
    }
  }, [id]);

  useEffect(() => {
    if (!liveApiEnabled || !test) return;
    // Start (or resume) the attempt on the server once the test is loaded.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void start();
  }, [test, start]);

  const saveKey = attempt ? `answers_${attempt.attemptId}` : null;
  const initialAnswers = useMemo(() => (saveKey ? (cacheGet<RunnerAnswers>(saveKey) ?? undefined) : undefined), [saveKey]);
  const persist = useCallback((a: RunnerAnswers) => saveKey && cacheSet(saveKey, a), [saveKey]);

  const submit = useCallback(
    async (answers: RunnerAnswers) => {
      if (!test || !attempt) return;
      setPhase("submitting");
      setSubmitError(null);
      cacheSet(`pending_${id}`, { attemptId: attempt.attemptId, answers } satisfies Pending);
      try {
        const r = await liveApi.submit(id, attempt.attemptId, toPayload(test, answers));
        cacheDelete(`pending_${id}`);
        cacheDelete(`answers_${attempt.attemptId}`);
        // Mirror the server's result locally so the dashboard, badges and
        // "Attempted" labels keep working.
        saveAttempt({
          id: `live-${r.attemptId}`,
          userId: null,
          mockId: id,
          answers: r.questions.map((q) => ({
            questionId: q.questionId,
            selected: q.selectedOption ? "ABCD".indexOf(q.selectedOption) : null,
            markedForReview: false,
            timeTakenSeconds: 0,
          })),
          score: r.summary.score,
          correct: r.summary.correct,
          incorrect: r.summary.incorrect,
          skipped: r.summary.unanswered,
          accuracy: r.summary.attempted ? Math.round((r.summary.correct / r.summary.attempted) * 100) : 0,
          timeTakenSeconds: r.timeTakenSeconds ?? 0,
          submittedAt: new Date().toISOString(),
        });
        setResult(r);
        setPhase("done");
      } catch (e) {
        setSubmitError(
          e instanceof LiveApiError && e.status !== 0
            ? e.message
            : "Unable to submit. Check your internet connection — your answers are saved on this device."
        );
        setPhase("failed");
      }
    },
    [test, attempt, id]
  );

  const retrySubmit = useCallback(() => {
    const pending = cacheGet<Pending>(`pending_${id}`);
    if (pending && test) {
      if (!attempt || attempt.attemptId !== pending.attemptId) {
        setAttempt({ attemptId: pending.attemptId, startedAt: "", deadlineAt: "", serverTime: "", resumed: true, totalQuestions: 0, remainingSeconds: 0 });
      }
      void (async () => {
        setPhase("submitting");
        try {
          const r = await liveApi.submit(id, pending.attemptId, toPayload(test, pending.answers));
          cacheDelete(`pending_${id}`);
          cacheDelete(`answers_${pending.attemptId}`);
          setResult(r);
          setPhase("done");
        } catch (e) {
          setSubmitError(e instanceof LiveApiError && e.status !== 0 ? e.message : "Still offline. Try again in a moment.");
          setPhase("failed");
        }
      })();
    }
  }, [id, test, attempt]);

  if (!liveApiEnabled) return <LiveState message="Live mock tests abhi available nahi hain." />;
  if (loadError) return <LiveState message={loadError} onRetry={reload} />;
  if (!test) return <LiveState message="Questions load ho rahe hain…" busy />;
  if (startError) return <LiveState message={startError} onRetry={() => void start()} />;
  if (paywall) {
    return (
      <div className="exam-shell container-page container-narrow py-10 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#ffece9] text-brand-coral">
          <Lock size={26} />
        </span>
        <h1 className="mt-4 font-display text-[1.5rem] font-bold">Yeh test Mock Test Pass ke saath available hai</h1>
        <p className="mt-2 text-[16px] text-slate-600">{paywall}</p>
        <div className="mt-5 flex flex-col justify-center gap-2.5 sm:flex-row">
          <button onClick={() => openEnrollPopup(paywall)} className="btn-cta px-6 py-3 text-[16px]">
            Enrol karein →
          </button>
          <Link href="/mock-test" className="btn-secondary px-6 py-3 text-[16px]">
            Sabhi Mock Tests
          </Link>
        </div>
      </div>
    );
  }

  if (phase === "done" && result) {
    const s = result.summary;
    return (
      <ExamResult
        title={result.title}
        exitHref="/mock-test"
        retryHref={`/mock-test/live/${id}`}
        score={s.score}
        maxScore={s.maxScore}
        accuracy={s.attempted ? Math.round((s.correct / s.attempted) * 100) : 0}
        percentage={s.percentage}
        timeTaken={result.timeTakenSeconds ?? 0}
        correct={s.correct}
        incorrect={s.incorrect}
        skipped={s.unanswered}
        subjects={result.sections.map((x) => ({ label: x.subjectName, correct: x.correct, total: x.total }))}
        solutions={result.questions.map((q) => ({
          id: q.questionId,
          text: q.questionText,
          options: q.options.map((o) => o.text),
          correctIndex: q.options.findIndex((o) => o.label === q.correctOption),
          selected: q.selectedOption ? q.options.findIndex((o) => o.label === q.selectedOption) : null,
          explanation: q.explanation,
        }))}
        note={
          <p className="mt-4 flex items-center gap-2 rounded-2xl border border-[#bfe9d2] bg-brand-green-light px-4 py-3 font-display text-[14px] text-[#0b6b3d]">
            <ShieldCheck size={18} className="shrink-0" />
            Result server par check kiya gaya hai{result.late ? " (time khatam hone ke baad submit hua)" : ""}.
          </p>
        }
      />
    );
  }

  if (phase === "failed") {
    return <LiveState message={submitError ?? "Submission failed."} onRetry={retrySubmit} />;
  }

  if (!attempt || phase === "starting") return <LiveState message="Test shuru ho raha hai…" busy />;

  return (
    <ExamRunner
      title={test.title}
      exitHref={`/mock-test/live/${id}`}
      questions={test.questions.map((q) => ({
        id: q.id,
        subjectKey: q.subjectId ?? "general",
        subjectLabel: q.subjectName,
        text: q.questionText,
        options: q.options.map((o) => o.text),
      }))}
      initialSeconds={attempt.remainingSeconds}
      initialAnswers={initialAnswers}
      onAnswersChange={persist}
      onSubmit={(a) => void submit(a)}
      locked={phase === "submitting"}
    />
  );
}
