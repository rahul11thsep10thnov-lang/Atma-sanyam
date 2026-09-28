import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getOrganizationBySlug } from "@/lib/services/directory";
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
  const org = await getOrganizationBySlug(slug);
  if (!org) return {};
  return {
    title: `${org.name} — Exams & Jobs — Exam Portal`,
    description:
      org.description || `Latest exams and job notifications from ${org.name}.`,
    alternates: { canonical: `/organization/${org.slug}` },
  };
}

export default async function OrganizationPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const org = await getOrganizationBySlug(slug);
  if (!org) notFound();

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: org.name }]} />
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">
          {org.name}
        </h1>
        {org.description ? (
          <p className="max-w-2xl text-sm text-slate-600">{org.description}</p>
        ) : null}
        {org.website ? (
          <a
            href={org.website}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="w-fit text-sm text-brand-700 hover:underline"
          >
            Official website ↗
          </a>
        ) : null}
      </div>

      {org.exams.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {org.exams.map((exam) => (
            <ExamCard key={exam.slug} exam={exam} />
          ))}
        </div>
      ) : (
        <EmptyState message={`No published exams from ${org.name} yet.`} />
      )}
    </main>
  );
}
