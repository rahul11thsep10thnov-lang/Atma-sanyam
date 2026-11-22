"use client";

import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Lock, LogIn, ShieldCheck } from "lucide-react";
import { openEnrollPopup } from "@/lib/enroll";
import ExamRunner, { type RunnerAnswers, type SyncStatus } from "@/components/exam/ExamRunner";
import ExamResult from "@/components/exam/ExamResult";
import { LiveState } from "@/components/mock/LiveState";
import { recordAnswer, saveAttempt } from "@/lib/localStore";
import { cacheDelete, cacheGet, cacheSet, liveApi, liveApiEnabled, LiveApiError, type LiveResult, type LiveTest } from "@/lib/liveApi";
import { changedQuestions, dirtyQuestions, dropLocal, loadLocal, mergeServer, storeLocal, toAnswerPayload, type LocalAttempt } from "@/lib/attemptSync";

type Phase = "starting" | "running" | "submitting" | "failed" | "done";

/** A submission that has not been confirmed by the server yet. */
interface Pending {
  attemptId: string;
}

interface Clock {
  attemptId: string;
  startedAtMs: number;
  deadlineMs: number;
  /** Server clock minus device clock (ms). */
  offsetMs: number;
  /** Seconds left when the runner was opened (the runner then follows deadlineMs). */
  initialSeconds: number;
}

const RETRY_STEPS_MS = [2000, 5000, 10_000, 20_000, 30_000];

export default function LiveAttemptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  // The paper is served only after the attempt has started (server rule).
  const [test, setTest] = useState<LiveTest | null>(null);
  const testRef = useRef<LiveTest | null>(null);
  const [phase, setPhase] = useState<Phase>("starting");
  const [clock, setClock] = useState<Clock | null>(null);
  const [initialAnswers, setInitialAnswers] = useState<RunnerAnswers | undefined>(undefined);
  const [startError, setStartError] = useState<string | null>(null);
  const [paywall, setPaywall] = useState<string | null>(null);
  const [loginNeeded, setLoginNeeded] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<LiveResult | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [sync, setSync] = useState<SyncStatus>("saved");

  const localRef = useRef<LocalAttempt | null>(null);
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryStep = useRef(0);
  const flushing = useRef(false);
  const flushRef = useRef<() => Promise<void>>(async () => {});
  /** Set once the attempt is being submitted or finished: no more autosaves,
   * and the result (with its local mirror) is applied only once. */
  const finishedRef = useRef<string | null>(null);

  const showResult = useCallback(
    (r: LiveResult, attemptId: string) => {
      if (finishedRef.current === `shown:${attemptId}`) return;
      finishedRef.current = `shown:${attemptId}`;
      cacheDelete(`pending_${id}`);
      dropLocal(attemptId);
      // Mirror the server's result locally (dashboard, "Attempted" labels,
      // mistake notebook). The server copy stays the source of truth.
      saveAttempt({
        id: `live-${r.attemptId}`,
        userId: null,
        mockId: id,
        answers: r.questions.map((q) => ({
          questionId: q.questionId,
          selected: q.selectedOption ? "ABCD".indexOf(q.selectedOption) : null,
          markedForReview: false,
          timeTakenSeconds: q.timeSpentSeconds ?? 0,
        })),
        score: r.summary.score,
        correct: r.summary.correct,
        incorrect: r.summary.incorrect,
        skipped: r.summary.unanswered,
        accuracy: r.summary.attempted ? Math.round((r.summary.correct / r.summary.attempted) * 100) : 0,
        timeTakenSeconds: r.timeTakenSeconds ?? 0,
        submittedAt: new Date().toISOString(),
      });
      for (const q of r.questions) if (q.selectedOption) recordAnswer(q.questionId, q.selectedOption === q.correctOption);
      setResult(r);
      setPhase("done");
    },
    [id]
  );

  // ---- autosave -------------------------------------------------------------
  const flush = useCallback(async () => {
    const l = localRef.current;
    const test = testRef.current;
    if (!l || !test || flushing.current || finishedRef.current) return;
    const dirty = dirtyQuestions(l);
    if (!dirty.length) {
      setSync("saved");
      return;
    }
    flushing.current = true;
    setSync("saving");
    try {
      const payload = dirty.map((q) => toAnswerPayload(test, l, q)).filter((x) => x !== null);
      const r = await liveApi.saveAnswers(l.attemptId, payload);
      const cur = localRef.current!;
      for (const s of r.saved) cur.saved[s.questionId] = Math.max(cur.saved[s.questionId] ?? 0, s.version);
      // A newer copy exists on the server (another tab/device): fetch it.
      if (r.stale.length) {
        const state = await liveApi.attemptState(l.attemptId);
        localRef.current = mergeServer(cur, test, state);
        setInitialAnswers(localRef.current.answers);
      }
      storeLocal(localRef.current!);
      retryStep.current = 0;
      setSync(dirtyQuestions(localRef.current!).length ? "pending" : "saved");
    } catch (e) {
      if (e instanceof LiveApiError && e.code === "attempt_closed") {
        // Time ran out (or another device submitted): show the server's result.
        try {
          const r = await liveApi.result(l.attemptId);
          setNotice("Samay khatam hone par test aapke save kiye gaye answers ke saath submit ho gaya.");
          showResult(r, l.attemptId);
        } catch {
          setSync("offline");
        }
        return;
      }
      setSync(e instanceof LiveApiError && e.status !== 0 ? "pending" : "offline");
      const wait = RETRY_STEPS_MS[Math.min(retryStep.current, RETRY_STEPS_MS.length - 1)]!;
      retryStep.current++;
      if (flushTimer.current) clearTimeout(flushTimer.current);
      flushTimer.current = setTimeout(() => void flushRef.current(), wait);
    } finally {
      flushing.current = false;
    }
  }, [showResult]);
  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);

  const scheduleFlush = useCallback(
    (delay = 800) => {
      if (flushTimer.current) clearTimeout(flushTimer.current);
      flushTimer.current = setTimeout(() => void flushRef.current(), delay);
    },
    []
  );

  useEffect(() => {
    const online = () => {
      retryStep.current = 0;
      scheduleFlush(0);
    };
    window.addEventListener("online", online);
    return () => {
      window.removeEventListener("online", online);
      if (flushTimer.current) clearTimeout(flushTimer.current);
    };
  }, [scheduleFlush]);

  const onAnswersChange = useCallback(
    (answers: RunnerAnswers) => {
      const l = localRef.current;
      if (!l || !clock) return;
      const changed = changedQuestions(l.answers, answers);
      const now = Math.round(Date.now() + clock.offsetMs - clock.startedAtMs);
      for (const q of changed) l.versions[q] = Math.max((l.versions[q] ?? 0) + 1, now);
      l.answers = answers;
      storeLocal(l);
      if (changed.length) {
        setSync("pending");
        scheduleFlush();
      }
    },
    [clock, scheduleFlush]
  );

  // Keep the device clock offset fresh (phones drift; a user may change it).
  useEffect(() => {
    if (phase !== "running") return;
    const t = setInterval(async () => {
      try {
        const sent = Date.now();
        const { serverTime } = await liveApi.serverTime();
        const rtt = Date.now() - sent;
        setClock((c) => (c ? { ...c, offsetMs: Date.parse(serverTime) + rtt / 2 - Date.now() } : c));
      } catch {
        // Offline: keep the last offset.
      }
    }, 120_000);
    return () => clearInterval(t);
  }, [phase]);

  // ---- submit ---------------------------------------------------------------
  const submitNow = useCallback(
    async (attemptId: string) => {
      const test = testRef.current;
      if (!test) return;
      // The submission carries every answer; pending autosaves are dropped.
      if (flushTimer.current) clearTimeout(flushTimer.current);
      if (!finishedRef.current) finishedRef.current = `submitting:${attemptId}`;
      setPhase("submitting");
      setSubmitError(null);
      cacheSet(`pending_${id}`, { attemptId } satisfies Pending);
      const l = localRef.current && localRef.current.attemptId === attemptId ? localRef.current : loadLocal(attemptId);
      const payload = test.questions.map((q) => toAnswerPayload(test, l, q.id)).filter((x) => x !== null);
      try {
        // The server finalises with the same routine as autosave and expiry;
        // a repeat returns the stored result. Success is shown only after this.
        const r = await liveApi.submit(id, attemptId, payload);
        if (r.status === "auto_submitted") setNotice("Time khatam ho chuka tha, isliye sirf samay par save hue answers gine gaye.");
        showResult(r, attemptId);
      } catch (e) {
        setSubmitError(
          e instanceof LiveApiError && e.status !== 0
            ? e.message
            : "Submit nahi ho paaya — internet check karein. Aapke answers is device par safe hain; connection aate hi dobara koshish hogi."
        );
        setPhase("failed");
      }
    },
    [id, showResult]
  );

  const submit = useCallback(
    (answers: RunnerAnswers) => {
      if (!clock) return;
      onAnswersChange(answers);
      void submitNow(clock.attemptId);
    },
    [clock, onAnswersChange, submitNow]
  );

  // A failed submission retries by itself when the connection returns.
  useEffect(() => {
    if (phase !== "failed") return;
    const pending = cacheGet<Pending>(`pending_${id}`);
    if (!pending) return;
    const retry = () => void submitNow(pending.attemptId);
    window.addEventListener("online", retry);
    return () => window.removeEventListener("online", retry);
  }, [phase, id, submitNow]);

  // ---- start / resume -------------------------------------------------------
  /** The paper for a started attempt; the last copy on this device if offline. */
  const loadPaper = useCallback(async (): Promise<LiveTest | null> => {
    try {
      const t = await liveApi.paper(id);
      if (t.questions.length) {
        cacheSet(`test_${id}`, t);
        testRef.current = t;
        setTest(t);
        return t;
      }
    } catch (e) {
      if (e instanceof LiveApiError && e.status === 404) return null;
    }
    const cached = cacheGet<LiveTest>(`test_${id}`);
    if (cached?.questions?.length) {
      testRef.current = cached;
      setTest(cached);
      return cached;
    }
    return null;
  }, [id]);

  const start = useCallback(async () => {
    setStartError(null);
    // A submission that did not reach the server earlier is finished first.
    const pending = cacheGet<Pending>(`pending_${id}`);
    if (pending?.attemptId) {
      if (!(await loadPaper())) {
        setStartError("Questions load nahi ho paaye. Internet check karke dobara try karein.");
        return;
      }
      await submitNow(pending.attemptId);
      return;
    }
    try {
      const sent = Date.now();
      const a = await liveApi.start(id);
      const test = await loadPaper();
      if (!test) {
        setStartError("Questions load nahi ho paaye. Internet check karke dobara try karein.");
        return;
      }
      const offsetMs = Date.parse(a.serverTime) + (Date.now() - sent) / 2 - Date.now();
      let local = loadLocal(a.attemptId);
      if (a.resumed) {
        // Refresh, crash or another device: bring in what the server saved.
        try {
          local = mergeServer(local, test, await liveApi.attemptState(a.attemptId));
        } catch {
          // Offline right now: continue from this device's copy.
        }
      }
      storeLocal(local);
      localRef.current = local;
      setInitialAnswers(local.answers);
      const deadlineMs = Date.parse(a.deadlineAt);
      setClock({
        attemptId: a.attemptId,
        startedAtMs: Date.parse(a.startedAt),
        deadlineMs,
        offsetMs,
        initialSeconds: Math.max(0, Math.round((deadlineMs - (Date.now() + offsetMs)) / 1000)),
      });
      setSync(dirtyQuestions(local).length ? "pending" : "saved");
      if (dirtyQuestions(local).length) scheduleFlush(0);
      setPhase("running");
    } catch (e) {
      if (e instanceof LiveApiError && e.status === 402) {
        // Free quota used up: the server decided; show the enrolment popup.
        setPaywall(e.message);
        openEnrollPopup(e.message);
        return;
      }
      if (e instanceof LiveApiError && e.code === "login_required") {
        setLoginNeeded(e.message);
        return;
      }
      setStartError(e instanceof LiveApiError && e.status !== 0 ? e.message : "Unable to start the test. Check your connection and try again.");
    }
  }, [id, loadPaper, submitNow, scheduleFlush]);

  useEffect(() => {
    if (!liveApiEnabled) return;
    // Start (or resume) the attempt on the server, then load its paper.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void start();
  }, [start]);

  const runnerQuestions = useMemo(
    () =>
      (test as LiveTest | null)?.questions.map((q) => ({
        id: q.id,
        subjectKey: q.subjectId ?? "general",
        subjectLabel: q.subjectName,
        text: q.questionText,
        options: q.options.map((o) => o.text),
        figure: q.figureSvg ?? null,
        optionFigures: q.options.map((o) => o.svg ?? null),
      })) ?? [],
    [test]
  );

  if (!liveApiEnabled) return <LiveState message="Live mock tests abhi available nahi hain." />;
  if (startError) return <LiveState message={startError} onRetry={() => void start()} />;
  if (loginNeeded) {
    return (
      <div className="exam-shell container-page container-narrow py-10 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-green-light text-brand-green">
          <LogIn size={26} />
        </span>
        <h1 className="mt-4 font-display text-[1.5rem] font-bold">Free mein login karke jaari rakhein</h1>
        <p className="mt-2 text-[16px] text-slate-600">{loginNeeded}</p>
        <div className="mt-5 flex flex-col justify-center gap-2.5 sm:flex-row">
          <Link href={`/login?next=${encodeURIComponent(`/mock-test/live/${id}`)}`} className="btn-cta px-6 py-3 text-[16px]">
            Login karein →
          </Link>
          <Link href="/mock-test" className="btn-secondary px-6 py-3 text-[16px]">
            Sabhi Mock Tests
          </Link>
        </div>
      </div>
    );
  }
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
        accuracy={s.accuracy ?? (s.attempted ? Math.round((s.correct / s.attempted) * 100) : 0)}
        percentage={s.percentage}
        timeTaken={result.timeTakenSeconds ?? 0}
        correct={s.correct}
        incorrect={s.incorrect}
        skipped={s.unanswered}
        negativeMarksLost={s.negativeMarksLost}
        averageSeconds={s.averageSecondsPerAnswered ?? null}
        subjects={result.sections.map((x) => ({ label: x.subjectName, correct: x.correct, total: x.total }))}
        topics={result.topics?.map((t) => ({ label: `${t.subjectName} › ${t.chapterName}`, correct: t.correct, incorrect: t.incorrect, total: t.total }))}
        solutions={result.questions.map((q) => ({
          id: q.questionId,
          text: q.questionText,
          options: q.options.map((o) => o.text),
          figure: q.figureSvg ?? null,
          optionFigures: q.options.map((o) => o.svg ?? null),
          correctIndex: q.options.findIndex((o) => o.label === q.correctOption),
          selected: q.selectedOption ? q.options.findIndex((o) => o.label === q.selectedOption) : null,
          explanation: q.explanation,
          seconds: q.timeSpentSeconds ?? null,
        }))}
        note={
          <p className="mt-4 flex items-center gap-2 rounded-2xl border border-[#bfe9d2] bg-brand-green-light px-4 py-3 font-display text-[14px] text-[#0b6b3d]">
            <ShieldCheck size={18} className="shrink-0" />
            Result server par check kiya gaya hai{result.late ? " (time khatam hone ke baad submit hua)" : ""}.{notice ? ` ${notice}` : ""}
          </p>
        }
      />
    );
  }

  if (phase === "failed") {
    const pending = cacheGet<Pending>(`pending_${id}`);
    return <LiveState message={submitError ?? "Submission failed."} onRetry={pending ? () => void submitNow(pending.attemptId) : () => void start()} />;
  }
  if (phase === "submitting") return <LiveState message="Answers server par bheje ja rahe hain…" busy />;

  if (!clock || !test || phase === "starting") return <LiveState message="Test shuru ho raha hai…" busy />;

  return (
    <ExamRunner
      key={clock.attemptId}
      title={test.title}
      exitHref={`/mock-test/live/${id}`}
      questions={runnerQuestions}
      initialSeconds={clock.initialSeconds}
      deadlineAt={clock.deadlineMs}
      clockOffsetMs={clock.offsetMs}
      initialAnswers={initialAnswers}
      onAnswersChange={onAnswersChange}
      onSubmit={submit}
      locked={false}
      syncStatus={sync}
    />
  );
}
