import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublishedAdmissionBySlug } from "@/lib/services/admissions";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { InformationTable } from "@/components/InformationTable";
import { formatDate } from "@/lib/format";

type Params = { slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const admission = await getPublishedAdmissionBySlug(slug);
  if (!admission) return {};
  return {
    title: `${admission.title} — Exam Portal`,
    description: admission.description || `${admission.title}: admission details and eligibility.`,
    alternates: { canonical: `/admission/${admission.slug}` },
  };
}

export default async function AdmissionDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const admission = await getPublishedAdmissionBySlug(slug);
  if (!admission) notFound();

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-8 sm:px-6">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Admissions", href: "/admission" },
          { label: admission.title },
        ]}
      />

      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">{admission.title}</h1>
        {admission.description ? (
          <p className="text-sm text-slate-700">{admission.description}</p>
        ) : null}
      </div>

      <InformationTable
        rows={[
          { label: "Organization", value: admission.organization?.name },
          { label: "Category", value: admission.category?.name },
          { label: "State", value: admission.state?.name },
          {
            label: "Application Start Date",
            value: formatDate(admission.applicationStartDate),
          },
          {
            label: "Application Last Date",
            value: formatDate(admission.applicationEndDate),
          },
          { label: "Eligibility", value: admission.eligibility },
        ]}
      />

      {admission.officialWebsite ? (
        <a
          href={admission.officialWebsite}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="w-fit rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-900"
        >
          Official Website
        </a>
      ) : null}
    </main>
  );
}
