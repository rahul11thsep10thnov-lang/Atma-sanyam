import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PYQ_MAP, PYQ_PAPERS } from "@/data/pyq";
import { getState } from "@/data/states";
import PyqAttemptClient from "@/components/PyqAttemptClient";

export function generateStaticParams() {
  return PYQ_PAPERS.map((p) => ({ id: p.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const paper = PYQ_MAP[id];
  if (!paper) return {};
  return {
    title: paper.title,
    description: `${paper.title} — ${paper.questionIds.length} questions online attempt karein, answers aur explanation ke saath.`,
    alternates: { canonical: `/pyq/${id}` },
  };
}

export default async function PyqDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const paper = PYQ_MAP[id];
  if (!paper) notFound();
  const state = getState(paper.state)!;

  return <PyqAttemptClient paper={paper} state={state} />;
}
