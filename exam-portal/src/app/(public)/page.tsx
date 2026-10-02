import type { Metadata } from "next";
import Link from "next/link";
import { SectionHeading } from "@/components/SectionHeading";
import { EmptyState } from "@/components/EmptyState";
import { Chip } from "@/components/Chip";
import { JobCard } from "@/components/cards/JobCard";
import { ExamCard } from "@/components/cards/ExamCard";
import { ResultCard } from "@/components/cards/ResultCard";
import { AdmitCard } from "@/components/cards/AdmitCard";
import { AnswerKeyCard } from "@/components/cards/AnswerKeyCard";
import { ArticleCard } from "@/components/cards/ArticleCard";
import { RecruitmentCard } from "@/components/cards/RecruitmentCard";
import { DeadlineBadge } from "@/components/DeadlineBadge";
import { getLatestRecruitments, getClosingSoonRecruitments } from "@/lib/services/recruitments";
import { formatDate } from "@/lib/format";
import {
  getLatestJobs,
  getLatestResults,
  getLatestAdmitCards,
  getLatestAnswerKeys,
  getLatestArticles,
  getPopularExams,
  getPopularOrganizations,
  getStatesWithExams,
  getClosingSoonExams,
} from "@/lib/services/home";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const [
    jobs,
    results,
    admitCards,
    answerKeys,
    articles,
    popularExams,
    popularOrganizations,
    states,
    closingSoon,
    recruitments,
    closingRecruitments,
  ] = await Promise.all([
    getLatestJobs(),
    getLatestResults(),
    getLatestAdmitCards(),
    getLatestAnswerKeys(),
    getLatestArticles(),
    getPopularExams(),
    getPopularOrganizations(),
    getStatesWithExams(),
    getClosingSoonExams(),
    getLatestRecruitments(6),
    getClosingSoonRecruitments(8),
  ]);

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-8 sm:px-6">
      <section className="flex flex-col gap-2 border-b border-slate-100 pb-8">
        <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
          Government exam information, in one place
        </h1>
        <p className="max-w-2xl text-sm text-slate-600 sm:text-base">
          Jobs, results, admit cards, answer keys, syllabus, admissions and
          scholarships — sourced from official notifications, reviewed
          before publishing.
        </p>
      </section>

      {closingRecruitments.length > 0 ? (
        <section aria-labelledby="closing-recruitments-heading" className="flex flex-col gap-3">
          <SectionHeading id="closing-recruitments-heading" title="Last dates approaching" subtitle="Recruitments closing in the next two weeks" />
          <ul className="flex flex-col gap-2">
            {closingRecruitments.map((r) => (
              <li key={r.slug} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm">
                <Link href={`/recruitments/${r.slug}`} className="font-medium text-slate-900 hover:underline">{r.title}</Link>
                <DeadlineBadge endDate={r.applicationEndDate} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section id="recruitments" className="flex flex-col gap-3 scroll-mt-20">
        <div className="flex items-baseline justify-between gap-3">
          <SectionHeading title="Latest Recruitments" subtitle="One page per recruitment: notification, admit card, answer key, result" />
          <Link href="/recruitments" className="text-sm text-brand-700 hover:underline">All recruitments →</Link>
        </div>
        {recruitments.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recruitments.map((r) => <RecruitmentCard key={r.slug} recruitment={r} />)}
          </div>
        ) : (
          <EmptyState message="No recruitments published yet." />
        )}
      </section>

      {closingSoon.length > 0 ? (
        <section aria-labelledby="announcements-heading" className="flex flex-col gap-3">
          <SectionHeading
            id="announcements-heading"
            title="Closing soon"
            subtitle="Application windows ending in the next two weeks"
          />
          <ul className="flex flex-col gap-2">
            {closingSoon.map((exam) => (
              <li
                key={exam.slug}
                className="flex flex-wrap items-baseline justify-between gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm"
              >
                <Link
                  href={`/exam/${exam.slug}`}
                  className="font-medium text-slate-900 hover:underline"
                >
                  {exam.title}
                </Link>
                <span className="text-accent-500 font-semibold">
                  Apply by {formatDate(exam.applicationEndDate)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section id="jobs" className="flex flex-col gap-3 scroll-mt-20">
        <SectionHeading title="Latest Jobs" />
        {jobs.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {jobs.map((job) => (
              <JobCard key={job.slug} job={job} />
            ))}
          </div>
        ) : (
          <EmptyState message="No job notifications published yet." />
        )}
      </section>

      <section id="results" className="flex flex-col gap-3 scroll-mt-20">
        <SectionHeading title="Latest Results" />
        {results.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((result) => (
              <ResultCard key={result.slug} result={result} />
            ))}
          </div>
        ) : (
          <EmptyState message="No results published yet." />
        )}
      </section>

      <section id="admit-cards" className="flex flex-col gap-3 scroll-mt-20">
        <SectionHeading title="Latest Admit Cards" />
        {admitCards.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {admitCards.map((admitCard) => (
              <AdmitCard key={admitCard.slug} admitCard={admitCard} />
            ))}
          </div>
        ) : (
          <EmptyState message="No admit cards published yet." />
        )}
      </section>

      <section id="answer-keys" className="flex flex-col gap-3 scroll-mt-20">
        <SectionHeading title="Latest Answer Keys" />
        {answerKeys.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {answerKeys.map((answerKey) => (
              <AnswerKeyCard key={answerKey.slug} answerKey={answerKey} />
            ))}
          </div>
        ) : (
          <EmptyState message="No answer keys published yet." />
        )}
      </section>

      <section className="flex flex-col gap-3">
        <SectionHeading
          title="Popular Exams"
          subtitle="Currently open, ordered by closest deadline"
        />
        {popularExams.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {popularExams.map((exam) => (
              <ExamCard key={exam.slug} exam={exam} />
            ))}
          </div>
        ) : (
          <EmptyState message="No exams currently accepting applications." />
        )}
      </section>

      {popularOrganizations.length > 0 ? (
        <section className="flex flex-col gap-3">
          <SectionHeading title="Popular Organizations" />
          <div className="flex flex-wrap gap-2">
            {popularOrganizations.map((org) => (
              <Chip
                key={org.slug}
                label={org.name}
                count={org.examCount}
                href={`/organization/${org.slug}`}
              />
            ))}
          </div>
        </section>
      ) : null}

      {states.length > 0 ? (
        <section className="flex flex-col gap-3">
          <SectionHeading title="Browse by State" />
          <div className="flex flex-wrap gap-2">
            {states.map((state) => (
              <Chip
                key={state.slug}
                label={state.name}
                count={state.examCount}
                href={`/state/${state.slug}`}
              />
            ))}
          </div>
        </section>
      ) : null}

      <section id="articles" className="flex flex-col gap-3 scroll-mt-20">
        <SectionHeading title="Articles" />
        {articles.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {articles.map((article) => (
              <ArticleCard key={article.slug} article={article} />
            ))}
          </div>
        ) : (
          <EmptyState message="No articles published yet." />
        )}
      </section>
    </main>
  );
}
