import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getPublishedJobBySlug } from "@/lib/services/jobs";
import { recordView } from "@/lib/analytics/track";
import { buildJobFaq } from "@/lib/faq";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ImportantDates } from "@/components/ImportantDates";
import { InformationTable } from "@/components/InformationTable";
import { FAQ } from "@/components/FAQ";
import { RelatedContent } from "@/components/RelatedContent";
import { JsonLd } from "@/components/JsonLd";

type Params = { slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPublishedJobBySlug(slug);
  if (!data) return {};
  const { job } = data;
  return {
    title: job.seoTitle || `${job.title}`,
    description:
      job.seoDescription ||
      job.description ||
      `${job.title} at ${job.organization.name}. Important dates, eligibility, and application details.`,
    alternates: { canonical: `/jobs/${job.slug}` },
  };
}

export default async function JobDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const data = await getPublishedJobBySlug(slug);
  if (!data) notFound();
  const { job, relatedJobs } = data;
  await recordView("Job", job.id, `/jobs/${slug}`);

  const selectionProcess = Array.isArray(job.selectionProcess)
    ? (job.selectionProcess as unknown[]).filter(
        (s): s is string => typeof s === "string",
      )
    : [];

  const faqItems = buildJobFaq({
    applicationEndDate: job.applicationEndDate,
    qualification: job.qualification,
    applicationFee: job.applicationFee,
    ageLimitMin: job.ageLimitMin,
    ageLimitMax: job.ageLimitMax,
    exam: { examDate: job.exam.examDate },
    officialWebsite: job.officialWebsite,
  });

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-8 sm:px-6">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Jobs", href: "/jobs" },
          { label: job.title },
        ]}
      />

      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">
          {job.title}
        </h1>
        <p className="text-sm text-slate-500">
          {job.organization.name}
          {job.advertisementNumber ? ` · Advt. No. ${job.advertisementNumber}` : ""}
        </p>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-slate-900">Important Dates</h2>
        <ImportantDates
          rows={[
            { label: "Application Last Date", date: job.applicationEndDate },
            { label: "Exam Date", date: job.exam.examDate },
          ]}
        />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-slate-900">Job Details</h2>
        <InformationTable
          rows={[
            { label: "Organization", value: job.organization.name },
            { label: "Vacancies", value: job.vacancies },
            { label: "Educational Qualification", value: job.qualification },
            {
              label: "Age Limit",
              value:
                job.ageLimitMin != null || job.ageLimitMax != null
                  ? `${job.ageLimitMin ?? "—"} to ${job.ageLimitMax ?? "—"} years`
                  : null,
            },
            {
              label: "Application Fee",
              value: job.applicationFee != null ? `₹${job.applicationFee}` : null,
            },
            { label: "Salary", value: job.salary },
            { label: "Eligibility", value: job.eligibility },
          ]}
        />
      </section>

      {selectionProcess.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-slate-900">
            Selection Process
          </h2>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-700">
            {selectionProcess.map((stage, i) => (
              <li key={i}>{stage}</li>
            ))}
          </ol>
        </section>
      ) : null}

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-slate-900">
          Important Links
        </h2>
        <div className="flex flex-wrap gap-3">
          {job.applyUrl ? (
            <a
              href={job.applyUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-900"
            >
              Apply Online
            </a>
          ) : null}
          {job.officialWebsite ? (
            <a
              href={job.officialWebsite}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Official Website
            </a>
          ) : null}
          {job.importantLinks.map((link) => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {link.label}
            </a>
          ))}
        </div>
      </section>

      {faqItems.length > 0 ? (
        <section className="flex flex-col gap-2">
          {/* FAQPage schema only emitted here, where the page genuinely has
              FAQs generated from verified fields (Section 24: never on a
              page without real FAQ content). */}
          <JsonLd
            data={{
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: faqItems.map((item) => ({
                "@type": "Question",
                name: item.question,
                acceptedAnswer: { "@type": "Answer", text: item.answer },
              })),
            }}
          />
          <h2 className="text-sm font-semibold text-slate-900">
            Frequently Asked Questions
          </h2>
          <FAQ items={faqItems} />
        </section>
      ) : null}

      <RelatedContent
        title="Related Jobs"
        items={relatedJobs.map((j) => ({ title: j.title, href: `/jobs/${j.slug}` }))}
      />

      <Link
        href={`/exam/${job.exam.slug}`}
        className="text-sm text-brand-700 hover:underline"
      >
        View full exam page for {job.exam.title} →
      </Link>
    </main>
  );
}
