import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getOrganizationBySlug } from "@/lib/services/directory";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ExamCard } from "@/components/cards/ExamCard";
import { EmptyState } from "@/components/EmptyState";
import { RecruitmentCard } from "@/components/cards/RecruitmentCard";
import { AlertSubscribeForm } from "@/components/AlertSubscribeForm";
import { listPublishedRecruitments } from "@/lib/services/recruitments";

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
    title: `${org.name} — Exams & Jobs`,
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
  const recruitments = await listPublishedRecruitments({ organizationSlug: slug, window: "all" });

  return (
    <main className="flex w-full flex-col gap-6 px-4 py-8 sm:px-8 lg:px-12">
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

      {recruitments.rows.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Recruitments</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recruitments.rows.map((r) => <RecruitmentCard key={r.slug} recruitment={r} />)}
          </div>
        </section>
      ) : null}

      <AlertSubscribeForm scope={{ organizationId: org.id, label: org.name }} compact />

      <h2 className="text-lg font-semibold text-slate-900">Exams</h2>
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
