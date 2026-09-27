import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getMockTest, MOCK_TESTS } from "@/data/mockTests";
import { getQuestion } from "@/data/questions";
import { getState } from "@/data/states";
import { SUBJECT_MAP } from "@/data/subjects";
import InstructionsView from "@/components/exam/InstructionsView";

export function generateStaticParams() {
  return MOCK_TESTS.map((m) => ({ id: m.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const mock = getMockTest(id);
  if (!mock) return {};
  return {
    title: mock.title,
    description: `${mock.title} — ${mock.questionCount} questions, ${mock.durationMinutes} minute. Timer, question palette aur detailed result analysis ke saath.`,
    alternates: { canonical: `/mock-test/${id}` },
  };
}

export default async function MockTestInstructionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const mock = getMockTest(id);
  if (!mock) notFound();
  const state = getState(mock.state)!;
  const examLabel = mock.exam === "constable" ? "Constable" : "SI";

  const counts = new Map<string, number>();
  mock.questionIds.forEach((qid) => {
    const s = getQuestion(qid)?.subject;
    if (s) counts.set(s, (counts.get(s) ?? 0) + 1);
  });

  return (
    <InstructionsView
      backHref="/mock-test"
      startHref={`/mock-test/${mock.id}/attempt`}
      title={mock.title}
      subtitle={`${state.hinglishName} Police · ${examLabel}`}
      questionCount={mock.questionCount}
      durationMinutes={mock.durationMinutes}
      marksPerQuestion={mock.marksPerQuestion}
      negativeMarks={mock.negativeMarks}
      subjects={[...counts.entries()].map(([key, count]) => ({ key, label: SUBJECT_MAP[key]?.hinglishName ?? key, count }))}
    />
  );
}
