import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCategoryBySlug } from "@/lib/services/directory";
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
  const category = await getCategoryBySlug(slug);
  if (!category) return {};
  return {
    title: `${category.name} Exams — Exam Portal`,
    description:
      category.description || `Latest ${category.name} exams and notifications.`,
    alternates: { canonical: `/category/${category.slug}` },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: category.name }]} />
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">
          {category.name}
        </h1>
        {category.description ? (
          <p className="max-w-2xl text-sm text-slate-600">
            {category.description}
          </p>
        ) : null}
      </div>

      {category.exams.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {category.exams.map((exam) => (
            <ExamCard key={exam.slug} exam={exam} />
          ))}
        </div>
      ) : (
        <EmptyState message={`No published ${category.name} exams yet.`} />
      )}
    </main>
  );
}
