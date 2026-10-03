import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublishedScholarshipBySlug } from "@/lib/services/scholarships";
import { recordView } from "@/lib/analytics/track";
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
  const scholarship = await getPublishedScholarshipBySlug(slug);
  if (!scholarship) return {};
  return {
    title: `${scholarship.title}`,
    description:
      scholarship.description || `${scholarship.title}: eligibility and amount details.`,
    alternates: { canonical: `/scholarship/${scholarship.slug}` },
  };
}

export default async function ScholarshipDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const scholarship = await getPublishedScholarshipBySlug(slug);
  if (!scholarship) notFound();
  await recordView("Scholarship", scholarship.id, `/scholarship/${slug}`);

  return (
    <main className="flex w-full flex-col gap-8 px-4 py-8 sm:px-8 lg:px-12">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Scholarships", href: "/scholarship" },
          { label: scholarship.title },
        ]}
      />

      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">
          {scholarship.title}
        </h1>
        {scholarship.description ? (
          <p className="text-sm text-slate-700">{scholarship.description}</p>
        ) : null}
      </div>

      <InformationTable
        rows={[
          { label: "Organization", value: scholarship.organization?.name },
          { label: "State", value: scholarship.state?.name },
          { label: "Amount", value: scholarship.amount },
          {
            label: "Application Last Date",
            value: formatDate(scholarship.applicationEndDate),
          },
          { label: "Eligibility", value: scholarship.eligibility },
        ]}
      />

      {scholarship.officialWebsite ? (
        <a
          href={scholarship.officialWebsite}
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
