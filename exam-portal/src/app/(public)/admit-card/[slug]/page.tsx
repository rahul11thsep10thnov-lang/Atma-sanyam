import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublishedAdmitCardBySlug } from "@/lib/services/admitCards";
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
  const data = await getPublishedAdmitCardBySlug(slug);
  if (!data) return {};
  const { admitCard } = data;
  return {
    title: `${admitCard.title} — Exam Portal`,
    description:
      admitCard.description ||
      `${admitCard.title}: download link, exam date, and instructions.`,
    alternates: { canonical: `/admit-card/${admitCard.slug}` },
  };
}

export default async function AdmitCardDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const data = await getPublishedAdmitCardBySlug(slug);
  if (!data) notFound();
  const { admitCard, relatedAnswerKeys } = data;

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-8 sm:px-6">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Admit Cards", href: "/admit-card" },
          { label: admitCard.title },
        ]}
      />

      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">
          {admitCard.title}
        </h1>
        <p className="text-sm text-slate-500">
          {admitCard.exam.organization.name} · {admitCard.exam.title}
        </p>
        {admitCard.description ? (
          <p className="text-sm text-slate-700">{admitCard.description}</p>
        ) : null}
      </div>

      <InformationTable
        rows={[
          { label: "Organization", value: admitCard.exam.organization.name },
          { label: "Exam", value: admitCard.exam.title },
          { label: "Release Date", value: formatDate(admitCard.releaseDate) },
          { label: "Exam Date", value: formatDate(admitCard.examDate) },
          { label: "Instructions", value: admitCard.instructions },
        ]}
      />

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-slate-900">
          Important Links
        </h2>
        <div className="flex flex-wrap gap-3">
          {admitCard.downloadUrl ? (
            <a
              href={admitCard.downloadUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-900"
            >
              Download Admit Card
            </a>
          ) : null}
          {admitCard.officialWebsite ? (
            <a
              href={admitCard.officialWebsite}
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
        title="Related Result"
        items={admitCard.results.map((r) => ({
          title: r.title,
          href: `/results/${r.slug}`,
        }))}
      />

      <RelatedContent
        title="Related Answer Key"
        items={relatedAnswerKeys.map((a) => ({
          title: a.title,
          href: `/answer-key/${a.slug}`,
        }))}
      />

      <Link
        href={`/exam/${admitCard.exam.slug}`}
        className="text-sm text-brand-700 hover:underline"
      >
        View full exam page for {admitCard.exam.title} →
      </Link>
    </main>
  );
}
