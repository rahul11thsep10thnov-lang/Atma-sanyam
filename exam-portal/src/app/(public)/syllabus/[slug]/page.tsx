import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublishedSyllabusBySlug } from "@/lib/services/syllabi";
import { recordView } from "@/lib/analytics/track";
import { Breadcrumbs } from "@/components/Breadcrumbs";

type Params = { slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const syllabus = await getPublishedSyllabusBySlug(slug);
  if (!syllabus) return {};
  return {
    title: `${syllabus.title}`,
    description:
      syllabus.description ||
      `${syllabus.title}: paper-wise subjects and topics.`,
    alternates: { canonical: `/syllabus/${syllabus.slug}` },
  };
}

export default async function SyllabusDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const syllabus = await getPublishedSyllabusBySlug(slug);
  if (!syllabus) notFound();
  await recordView("Syllabus", syllabus.id, `/syllabus/${slug}`);

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-8 sm:px-6">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Syllabus", href: "/syllabus" },
          { label: syllabus.title },
        ]}
      />

      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">
          {syllabus.title}
        </h1>
        <p className="text-sm text-slate-500">
          {syllabus.exam.organization.name} · {syllabus.exam.title}
        </p>
        {syllabus.description ? (
          <p className="text-sm text-slate-700">{syllabus.description}</p>
        ) : null}
      </div>

      {syllabus.papers.length > 0 ? (
        <div className="flex flex-col gap-6">
          {syllabus.papers.map((paper) => (
            <section key={paper.id} className="flex flex-col gap-3">
              <h2 className="text-base font-semibold text-slate-900">
                {paper.name}
              </h2>
              {paper.subjects.map((subject) => (
                <div key={subject.id} className="flex flex-col gap-1.5 pl-4">
                  <h3 className="text-sm font-medium text-slate-800">
                    {subject.name}
                  </h3>
                  <ul className="flex flex-col gap-1 pl-4">
                    {subject.topics.map((topic) => (
                      <li key={topic.id} className="text-sm text-slate-700">
                        <span className="font-medium">{topic.name}</span>
                        {topic.subtopics.length > 0 ? (
                          <span className="text-slate-500">
                            {" "}
                            — {topic.subtopics.join(", ")}
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500 italic">
          Not specified in the available notification.
        </p>
      )}

      <Link
        href={`/exam/${syllabus.exam.slug}`}
        className="text-sm text-brand-700 hover:underline"
      >
        View full exam page for {syllabus.exam.title} →
      </Link>
    </main>
  );
}
