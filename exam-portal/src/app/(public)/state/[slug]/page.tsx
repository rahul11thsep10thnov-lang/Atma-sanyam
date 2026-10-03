import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getStateBySlug } from "@/lib/services/directory";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ExamCard } from "@/components/cards/ExamCard";
import { EmptyState } from "@/components/EmptyState";

type Params = { slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const state = await getStateBySlug(slug);
  if (!state) return {};
  return {
    title: `${state.name} Government Exams`,
    description: `Latest government exams and job notifications in ${state.name}.`,
    alternates: { canonical: `/state/${state.slug}` },
  };
}

export default async function StatePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const state = await getStateBySlug(slug);
  if (!state) notFound();

  return (
    <main className="flex w-full flex-col gap-6 px-4 py-8 sm:px-8 lg:px-12">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: state.name }]} />
      <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">
        {state.name}
      </h1>

      {state.exams.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {state.exams.map((exam) => (
            <ExamCard key={exam.slug} exam={exam} />
          ))}
        </div>
      ) : (
        <EmptyState message={`No published exams in ${state.name} yet.`} />
      )}
    </main>
  );
}
