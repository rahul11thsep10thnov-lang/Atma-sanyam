import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { recordView } from "@/lib/analytics/track";
import { getPublishedAnswerKeyBySlug } from "@/lib/services/answerKeys";
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
  const data = await getPublishedAnswerKeyBySlug(slug);
  if (!data) return {};
  const { answerKey } = data;
  return {
    title: `${answerKey.title}`,
    description:
      answerKey.description ||
      `${answerKey.title}: official answer key link and objection information.`,
    alternates: { canonical: `/answer-key/${answerKey.slug}` },
  };
}

export default async function AnswerKeyDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const data = await getPublishedAnswerKeyBySlug(slug);
  if (!data) notFound();
  const { answerKey, relatedAdmitCards } = data;
  await recordView("AnswerKey", answerKey.id, `/answer-key/${slug}`);

  return (
    <main className="flex w-full flex-col gap-8 px-4 py-8 sm:px-8 lg:px-12">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Answer Keys", href: "/answer-key" },
          { label: answerKey.title },
        ]}
      />

      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">
          {answerKey.title}
        </h1>
        <p className="text-sm text-slate-500">
          {answerKey.exam.organization.name} · {answerKey.exam.title}
        </p>
        {answerKey.description ? (
          <p className="text-sm text-slate-700">{answerKey.description}</p>
        ) : null}
      </div>

      <InformationTable
        rows={[
          { label: "Organization", value: answerKey.exam.organization.name },
          { label: "Exam", value: answerKey.exam.title },
          { label: "Answer Key Date", value: formatDate(answerKey.answerKeyDate) },
          {
            label: "Objection Deadline",
            value: formatDate(answerKey.objectionDeadline),
          },
          { label: "Objection Information", value: answerKey.objectionInfo },
        ]}
      />

      {answerKey.answerKeyUrl ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-slate-900">
            Important Links
          </h2>
          <div className="flex flex-wrap gap-3">
            <a
              href={answerKey.answerKeyUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-900"
            >
              View Official Answer Key
            </a>
          </div>
        </section>
      ) : null}

      <RelatedContent
        title="Related Result"
        items={answerKey.results.map((r) => ({
          title: r.title,
          href: `/results/${r.slug}`,
        }))}
      />

      <RelatedContent
        title="Related Admit Card"
        items={relatedAdmitCards.map((a) => ({
          title: a.title,
          href: `/admit-card/${a.slug}`,
        }))}
      />

      <Link
        href={`/exam/${answerKey.exam.slug}`}
        className="text-sm text-brand-700 hover:underline"
      >
        View full exam page for {answerKey.exam.title} →
      </Link>
    </main>
  );
}
