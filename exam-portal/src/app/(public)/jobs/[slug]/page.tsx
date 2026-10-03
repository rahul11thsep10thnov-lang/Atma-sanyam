import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getPublishedJobBySlug } from "@/lib/services/jobs";
import { recordView } from "@/lib/analytics/track";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { AppPromo } from "@/components/AppPromo";
import { AdSlot } from "@/components/ads/AdSlot";
import { formatDate } from "@/lib/format";
import { deadlineInfo } from "@/lib/deadline";
import { readPosts, readFees, readDates, totalVacancies } from "@/lib/jobDetails";
import { getCurrentUser, isMember } from "@/lib/users/session";
import { SITE_URL } from "@/lib/siteConfig";

type Params = { slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPublishedJobBySlug(slug);
  if (!data) return {};
  const { job } = data;
  return {
    title: job.seoTitle || job.exam.title || job.title,
    description: job.seoDescription || job.description || `${job.title} — ${job.organization.name}: important dates, eligibility, post-wise vacancies, fees and official links.`,
    alternates: { canonical: `/jobs/${job.slug}` },
  };
}

const NS = "Not specified in the available notification.";

export default async function JobDetailPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const data = await getPublishedJobBySlug(slug);
  if (!data) notFound();
  const { job } = data;
  await recordView("Job", job.id, `/jobs/${slug}`);
  const member = isMember(await getCurrentUser());

  const deadline = deadlineInfo(job.applicationEndDate);
  const posts = readPosts(job.posts);
  const total = totalVacancies(posts) ?? job.vacancies;
  const fees = readFees(job.applicationFeeByCategory);
  const extraDates = readDates(job.importantDates);
  const selection = Array.isArray(job.selectionProcess) ? (job.selectionProcess as unknown[]).filter((s): s is string => typeof s === "string") : [];

  const dates: Array<{ label: string; value: string }> = [
    job.exam.applicationStartDate ? { label: "Application starts", value: formatDate(job.exam.applicationStartDate)! } : null,
    job.applicationEndDate ? { label: "Last date to apply", value: formatDate(job.applicationEndDate)! } : null,
    ...extraDates.map((d) => ({ label: d.label, value: d.date })),
    job.exam.admitCards[0]?.releaseDate ? { label: "Admit card", value: formatDate(job.exam.admitCards[0].releaseDate)! } : null,
    job.exam.examDate ? { label: "Exam date", value: formatDate(job.exam.examDate)! } : null,
    job.exam.answerKeys[0]?.answerKeyDate ? { label: "Answer key", value: formatDate(job.exam.answerKeys[0].answerKeyDate)! } : null,
    job.exam.results[0]?.resultDate ? { label: "Result", value: formatDate(job.exam.results[0].resultDate)! } : null,
  ].filter((x): x is { label: string; value: string } => !!x);
  // De-duplicate labels (admin-entered dates may repeat the built-in ones).
  const seen = new Set<string>();
  const datesUnique = dates.filter((d) => (seen.has(d.label.toLowerCase()) ? false : (seen.add(d.label.toLowerCase()), true)));

  const eligibility: Array<{ label: string; value: string }> = [
    job.qualification ? { label: "Qualification", value: job.qualification } : null,
    job.ageLimitMin || job.ageLimitMax ? { label: "Age limit", value: `${job.ageLimitMin ?? "—"} to ${job.ageLimitMax ?? "—"} years (relaxation as per rules)` } : null,
    job.eligibility ? { label: "Other conditions", value: job.eligibility } : null,
    job.salary ? { label: "Pay scale", value: job.salary } : null,
    selection.length ? { label: "Selection process", value: selection.join(" → ") } : null,
  ].filter((x): x is { label: string; value: string } => !!x);

  const links: Array<{ label: string; href: string; external: boolean }> = [
    job.applyUrl ? { label: "Apply Online", href: job.applyUrl, external: true } : null,
    job.notificationDocument ? { label: "Official Notification (PDF)", href: job.notificationDocument.storageUrl, external: true } : null,
    job.syllabusUrl ? { label: "Syllabus", href: job.syllabusUrl, external: true } : job.exam.syllabi[0] ? { label: "Syllabus", href: `/syllabus/${job.exam.syllabi[0].slug}`, external: false } : null,
    job.examPatternUrl ? { label: "Exam Pattern", href: job.examPatternUrl, external: true } : null,
    job.exam.admitCards[0] ? { label: "Admit Card", href: `/admit-card/${job.exam.admitCards[0].slug}`, external: false } : null,
    job.exam.answerKeys[0] ? { label: "Answer Key", href: `/answer-key/${job.exam.answerKeys[0].slug}`, external: false } : null,
    job.exam.results[0] ? { label: "Result", href: `/results/${job.exam.results[0].slug}`, external: false } : null,
    ...job.importantLinks.map((l) => ({ label: l.label, href: l.url, external: /^https?:/.test(l.url) })),
    job.officialWebsite ? { label: "Official Website", href: job.officialWebsite, external: true } : null,
    job.recruitment?.status === "PUBLISHED" ? { label: "Full recruitment timeline", href: `/recruitments/${job.recruitment.slug}`, external: false } : null,
  ].filter((x): x is { label: string; href: string; external: boolean } => !!x);

  const th = "border border-orange-200 bg-[#fde3cc] px-3 py-2 text-left text-sm font-bold text-[#4a220a]";
  const td = "border border-orange-200 px-3 py-2 align-top text-sm text-slate-800";

  return (
    <main className="flex w-full flex-col gap-6 px-4 pb-10 sm:px-8 lg:px-12">
      <JsonLd data={{ "@context": "https://schema.org", "@type": "JobPosting", title: job.title, description: job.description ?? job.title, datePosted: (job.publishedAt ?? job.createdAt).toISOString(), ...(job.applicationEndDate ? { validThrough: job.applicationEndDate.toISOString() } : {}), hiringOrganization: { "@type": "GovernmentOrganization", name: job.organization.name }, jobLocation: { "@type": "Place", address: { "@type": "PostalAddress", addressCountry: "IN", ...(job.exam.state ? { addressRegion: job.exam.state.name } : {}) } }, ...(total ? { totalJobOpenings: total } : {}), url: `${SITE_URL}/jobs/${job.slug}` }} />
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Jobs", href: "/jobs" }, { label: job.exam.title }]} />

      <header className="flex flex-col items-center gap-2 rounded-2xl border border-orange-200 bg-white/90 px-4 py-6 text-center">
        <h1 className="text-2xl font-bold sm:text-3xl">{job.exam.title}</h1>
        {job.title !== job.exam.title ? <p className="text-sm text-slate-600">{job.title}</p> : null}
        <p className="text-sm text-slate-600">{job.organization.name}{job.advertisementNumber ? ` · Advt. No. ${job.advertisementNumber}` : ""}</p>
        <p className={`mt-1 rounded-xl px-4 py-2 text-lg font-bold ${deadline.state === "closed" ? "bg-slate-100 text-slate-600" : "bg-red-50 text-red-700"}`} data-testid="last-date">
          Last date to apply: {job.applicationEndDate ? formatDate(job.applicationEndDate) : "Not announced"}
          {deadline.state !== "unknown" ? <span className="ml-2 text-sm font-medium">({deadline.label})</span> : null}
        </p>
      </header>

      <section aria-label="Important dates and eligibility" className="grid w-full grid-cols-1 overflow-hidden rounded-2xl border border-orange-200 bg-white/95 md:grid-cols-2">
        <div className="border-b border-orange-200 md:border-b-0 md:border-r">
          <h2 className="bg-[#f6b483] px-4 py-2 text-center text-lg font-bold">Important Dates</h2>
          {datesUnique.length ? (
            <table className="w-full"><tbody>{datesUnique.map((d) => <tr key={d.label}><th scope="row" className={`${td} w-1/2 bg-orange-50/60 font-semibold`}>{d.label}</th><td className={td}>{d.value}</td></tr>)}</tbody></table>
          ) : <p className="p-4 text-sm text-slate-500">{NS}</p>}
        </div>
        <div>
          <h2 className="bg-[#f6b483] px-4 py-2 text-center text-lg font-bold">Eligibility (all posts)</h2>
          {eligibility.length ? (
            <table className="w-full"><tbody>{eligibility.map((d) => <tr key={d.label}><th scope="row" className={`${td} w-1/3 bg-orange-50/60 font-semibold`}>{d.label}</th><td className={`${td} whitespace-pre-line`}>{d.value}</td></tr>)}</tbody></table>
          ) : <p className="p-4 text-sm text-slate-500">{NS}</p>}
        </div>
      </section>

      <AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_JOB} hidden={member} />

      <section aria-labelledby="posts-h" className="w-full overflow-x-auto rounded-2xl border border-orange-200 bg-white/95">
        <h2 id="posts-h" className="bg-[#f6b483] px-4 py-2 text-center text-lg font-bold">Post-wise Vacancies &amp; Eligibility</h2>
        <table className="w-full min-w-[36rem] border-collapse">
          <thead><tr><th className={th}>Post</th><th className={th}>Eligibility</th><th className={`${th} text-right`}>Vacancies</th></tr></thead>
          <tbody>
            {posts.length ? posts.map((p) => (
              <tr key={p.name}><td className={`${td} font-semibold`}>{p.name}</td><td className={`${td} whitespace-pre-line`}>{p.eligibility || "As per notification"}</td><td className={`${td} text-right`}>{p.vacancies?.toLocaleString("en-IN") ?? "—"}</td></tr>
            )) : (
              <tr><td className={`${td} font-semibold`}>{job.title}</td><td className={td}>{job.qualification ?? "As per notification"}</td><td className={`${td} text-right`}>{job.vacancies?.toLocaleString("en-IN") ?? "—"}</td></tr>
            )}
          </tbody>
          <tfoot><tr><th colSpan={2} className={`${th} text-right`}>Total</th><th className={`${th} text-right`} data-testid="total-vacancies">{total?.toLocaleString("en-IN") ?? "—"}</th></tr></tfoot>
        </table>
      </section>

      <section aria-labelledby="fees-h" className="w-full overflow-hidden rounded-2xl border border-orange-200 bg-white/95">
        <h2 id="fees-h" className="bg-[#f6b483] px-4 py-2 text-center text-lg font-bold">Application Fee</h2>
        {fees.length || job.applicationFee ? (
          <table className="w-full border-collapse">
            <thead><tr><th className={th}>Category</th><th className={th}>Fee</th></tr></thead>
            <tbody>
              {fees.length ? fees.map((f) => <tr key={f.category}><td className={td}>{f.category}</td><td className={td}>{f.fee}</td></tr>) : <tr><td className={td}>All categories</td><td className={td}>₹{Number(job.applicationFee).toLocaleString("en-IN")}</td></tr>}
            </tbody>
          </table>
        ) : <p className="p-4 text-sm text-slate-500">{NS}</p>}
      </section>

      <section aria-labelledby="links-h" className="w-full overflow-hidden rounded-2xl border border-orange-200 bg-white/95">
        <h2 id="links-h" className="bg-[#f6b483] px-4 py-2 text-center text-lg font-bold">Important Links</h2>
        {links.length ? (
          <table className="w-full border-collapse"><tbody>
            {links.map((l) => (
              <tr key={l.label + l.href}><th scope="row" className={`${td} w-1/2 font-semibold`}>{l.label}</th><td className={td}>
                {l.external ? <a href={l.href} target="_blank" rel="noopener noreferrer nofollow" className="font-bold text-blue-700 underline">Click here ↗</a> : <Link href={l.href} className="font-bold text-blue-700 underline">Click here</Link>}
              </td></tr>
            ))}
          </tbody></table>
        ) : <p className="p-4 text-sm text-slate-500">{NS}</p>}
      </section>

      <p role="note" className="rounded-2xl border-2 border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
        Disclaimer: Candidates are strictly advised to read the full official notification before filling the application form. The details on this website are fed manually and may contain errors; the official notification and the recruiting organization&apos;s website are the only authoritative sources.
      </p>

      <AppPromo />
    </main>
  );
}
