import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { recordView } from "@/lib/analytics/track";
import { getPublishedResultBySlug } from "@/lib/services/results";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { InformationTable } from "@/components/InformationTable";
import { RelatedContent } from "@/components/RelatedContent";
import { formatDate } from "@/lib/format";

type Params = { slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPublishedResultBySlug(slug);
  if (!data) return {};
  const { result } = data;
  return {
    title: `${result.title}`,
    description:
      result.description ||
      `${result.title}: declared ${formatDate(result.resultDate) ?? "date not specified"}.`,
    alternates: { canonical: `/results/${result.slug}` },
  };
}

export default async function ResultDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const data = await getPublishedResultBySlug(slug);
  if (!data) notFound();
  const { result, relatedResults } = data;
  await recordView("Result", result.id, `/results/${slug}`);

  return (
    <main className="flex w-full flex-col gap-8 px-4 py-8 sm:px-8 lg:px-12">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Results", href: "/results" },
          { label: result.title },
        ]}
      />

      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">
          {result.title}
        </h1>
        <p className="text-sm text-slate-500">
          {result.exam.organization.name} · {result.exam.title}
        </p>
        {result.description ? (
          <p className="text-sm text-slate-700">{result.description}</p>
        ) : null}
      </div>

      <InformationTable
        rows={[
          { label: "Organization", value: result.exam.organization.name },
          { label: "Exam", value: result.exam.title },
          { label: "Result Date", value: formatDate(result.resultDate) },
        ]}
      />

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-slate-900">
          Important Links
        </h2>
        <div className="flex flex-wrap gap-3">
          {result.resultUrl ? (
            <a
              href={result.resultUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-900"
            >
              View Result
            </a>
          ) : null}
          {result.officialWebsite ? (
            <a
              href={result.officialWebsite}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Official Website
            </a>
          ) : null}
        </div>
      </section>

      <RelatedContent
        title="Related Admit Card"
        items={
          result.relatedAdmitCard && result.relatedAdmitCard.status === "PUBLISHED"
            ? [
                {
                  title: result.relatedAdmitCard.title,
                  href: `/admit-card/${result.relatedAdmitCard.slug}`,
                },
              ]
            : []
        }
      />
      <RelatedContent
        title="Related Answer Key"
        items={
          result.relatedAnswerKey && result.relatedAnswerKey.status === "PUBLISHED"
            ? [
                {
                  title: result.relatedAnswerKey.title,
                  href: `/answer-key/${result.relatedAnswerKey.slug}`,
                },
              ]
            : []
        }
      />

      <RelatedContent
        title="Related Results"
        items={relatedResults.map((r) => ({
          title: r.title,
          href: `/results/${r.slug}`,
        }))}
      />

      <Link
        href={`/exam/${result.exam.slug}`}
        className="text-sm text-brand-700 hover:underline"
      >
        View full exam page for {result.exam.title} →
      </Link>
    </main>
  );
}
