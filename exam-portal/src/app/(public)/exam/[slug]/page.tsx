import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublishedExamBySlug } from "@/lib/services/exams";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ImportantDates } from "@/components/ImportantDates";
import { RelatedContent } from "@/components/RelatedContent";

type Params = { slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const exam = await getPublishedExamBySlug(slug);
  if (!exam) return {};
  return {
    title: `${exam.title}`,
    description:
      exam.description ||
      `${exam.title} by ${exam.organization.name}: notification, jobs, admit card, result, answer key and syllabus.`,
    alternates: { canonical: `/exam/${exam.slug}` },
  };
}

export default async function ExamDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const exam = await getPublishedExamBySlug(slug);
  if (!exam) notFound();

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-8 sm:px-6">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: exam.organization.name, href: `/organization/${exam.organization.slug}` },
          { label: exam.title },
        ]}
      />

      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">
          {exam.title}
        </h1>
        <p className="text-sm text-slate-500">
          {exam.organization.name}
          {exam.state ? ` · ${exam.state.name}` : ""}
        </p>
        {exam.description ? (
          <p className="text-sm text-slate-700">{exam.description}</p>
        ) : null}
      </div>

      <ImportantDates
        rows={[
          {
            label: "Application Start Date",
            date: exam.applicationStartDate,
          },
          { label: "Application Last Date", date: exam.applicationEndDate },
          { label: "Exam Date", date: exam.examDate },
        ]}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <RelatedContent
          title="Job Notification"
          items={exam.jobs.map((j) => ({ title: j.title, href: `/jobs/${j.slug}` }))}
        />
        <RelatedContent
          title="Results"
          items={exam.results.map((r) => ({ title: r.title, href: `/results/${r.slug}` }))}
        />
        <RelatedContent
          title="Admit Cards"
          items={exam.admitCards.map((a) => ({
            title: a.title,
            href: `/admit-card/${a.slug}`,
          }))}
        />
        <RelatedContent
          title="Answer Keys"
          items={exam.answerKeys.map((a) => ({
            title: a.title,
            href: `/answer-key/${a.slug}`,
          }))}
        />
        <RelatedContent
          title="Syllabus"
          items={exam.syllabi.map((s) => ({
            title: s.title,
            href: `/syllabus/${s.slug}`,
          }))}
        />
      </div>

      {exam.importantLinks.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-slate-900">
            Important Links
          </h2>
          <div className="flex flex-wrap gap-3">
            {exam.importantLinks.map((link) => (
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
        </div>
      ) : null}
    </main>
  );
}
