"use client";

import { use } from "react";
import InstructionsView from "@/components/exam/InstructionsView";
import { LiveState } from "@/components/mock/LiveState";
import { liveApiEnabled } from "@/lib/liveApi";
import { LANGUAGE_LABEL, useLiveTest } from "@/lib/useLiveTest";

export default function LiveInstructionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { test, error, reload } = useLiveTest(id);

  if (!liveApiEnabled) return <LiveState message="Live mock tests abhi available nahi hain." />;
  if (error) return <LiveState message={error} onRetry={reload} />;
  if (!test) return <LiveState message="Test load ho raha hai…" busy />;

  const counts = new Map<string, { label: string; count: number }>();
  for (const q of test.questions) {
    const key = q.subjectId ?? "general";
    const c = counts.get(key) ?? { label: q.subjectName, count: 0 };
    c.count++;
    counts.set(key, c);
  }

  return (
    <InstructionsView
      backHref="/mock-test"
      startHref={`/mock-test/live/${id}/attempt`}
      title={test.title}
      subtitle={`${test.examName} · ${LANGUAGE_LABEL[test.language] ?? test.language}`}
      questionCount={test.questions.length}
      durationMinutes={test.durationMinutes}
      marksPerQuestion={test.marksPerQuestion}
      negativeMarks={test.negativeMarks}
      subjects={[...counts.values()].map((c) => ({ key: c.label.toLowerCase(), label: c.label, count: c.count }))}
    />
  );
}
