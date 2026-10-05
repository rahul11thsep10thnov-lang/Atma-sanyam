import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublishedRecruitmentBySlug } from "@/lib/services/recruitments";
import { recordView } from "@/lib/analytics/track";
import { deadlineInfo } from "@/lib/deadline";
import { formatDate } from "@/lib/format";
import { SITE_URL, SITE_NAME } from "@/lib/siteConfig";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { DeadlineBadge } from "@/components/DeadlineBadge";
import { ImportantDates } from "@/components/ImportantDates";
import { RecruitmentCard } from "@/components/cards/RecruitmentCard";
import { JsonLd } from "@/components/JsonLd";
import { AlertSubscribeForm } from "@/components/AlertSubscribeForm";
import type { NoticeType } from "@/generated/prisma/enums";
import { resolveLang } from "@/lib/i18n/lang";

type Params = { slug: string };

export async function generateMetadata({ params, searchParams }: { params: Promise<Params>; searchParams: Promise<{ lang?: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const lang = await resolveLang((await searchParams).lang);
  const data = await getPublishedRecruitmentBySlug(slug);
  if (!data) return {};
  const r = data.recruitment;
  const info = deadlineInfo(r.applicationEndDate);
  const canonical = `/recruitments/${r.slug}`;
  const title = lang === "hi" && r.titleHi ? r.titleHi : r.title;
  const description = (lang === "hi" && r.summaryHi ? r.summaryHi : r.summary) ?? `${r.title} by ${r.organization.name}: notification, dates, admit card, answer key and result updates. ${info.label}.`;
  return {
    title: `${title} — ${r.organization.shortName ?? r.organization.name}`,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: `${SITE_URL}${canonical}`, siteName: SITE_NAME, type: "article", locale: "en_IN", modifiedTime: r.updatedAt.toISOString() },
    twitter: { card: "summary", title, description },
  };
}

const TYPE_LABEL: Record<NoticeType, { en: string; hi: string; tone: string }> = {
  JOB: { en: "Notification", hi: "अधिसूचना", tone: "bg-brand-50 text-brand-700 border-brand-200" },
  ADMIT_CARD: { en: "Admit card", hi: "एडमिट कार्ड", tone: "bg-blue-50 text-blue-700 border-blue-200" },
  EXAM_DATE: { en: "Exam date", hi: "परीक्षा तिथि", tone: "bg-blue-50 text-blue-700 border-blue-200" },
  ANSWER_KEY: { en: "Answer key", hi: "उत्तर कुंजी", tone: "bg-violet-50 text-violet-700 border-violet-200" },
  RESULT: { en: "Result", hi: "परिणाम", tone: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  MERIT_LIST: { en: "Merit list", hi: "मेरिट सूची", tone: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  SELECTION_LIST: { en: "Selection list", hi: "चयन सूची", tone: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  INTERVIEW: { en: "Interview", hi: "साक्षात्कार", tone: "bg-slate-50 text-slate-700 border-slate-200" },
  DOCUMENT_VERIFICATION: { en: "Document verification", hi: "दस्तावेज़ सत्यापन", tone: "bg-slate-50 text-slate-700 border-slate-200" },
  CORRIGENDUM: { en: "Corrigendum", hi: "शुद्धिपत्र", tone: "bg-amber-50 text-amber-800 border-amber-200" },
  DEADLINE_EXTENSION: { en: "Last date extended", hi: "अंतिम तिथि बढ़ी", tone: "bg-amber-50 text-amber-800 border-amber-200" },
  EXAM_POSTPONED: { en: "Exam postponed", hi: "परीक्षा स्थगित", tone: "bg-red-50 text-red-700 border-red-200" },
  EXAM_CANCELLED: { en: "Exam cancelled", hi: "परीक्षा रद्द", tone: "bg-red-50 text-red-700 border-red-200" },
  OTHER: { en: "Update", hi: "अपडेट", tone: "bg-slate-50 text-slate-700 border-slate-200" },
};

const contentHref = (type: string | null, slug: string | null | undefined) =>
  !slug ? null : type === "Job" ? `/jobs/${slug}` : type === "AdmitCard" ? `/admit-card/${slug}` : type === "AnswerKey" ? `/answer-key/${slug}` : type === "Result" ? `/results/${slug}` : null;

export default async function RecruitmentPage({ params, searchParams }: { params: Promise<Params>; searchParams: Promise<{ lang?: string }> }) {
  const { slug } = await params;
  const { lang: langParam } = await searchParams;
  const lang = await resolveLang(langParam);
  const data = await getPublishedRecruitmentBySlug(slug);
  if (!data) notFound();
  const { recruitment: r, related } = data;
  await recordView("Recruitment", r.id, `/recruitments/${slug}`);
  const info = deadlineInfo(r.applicationEndDate);
  const job = r.jobs[0];
  const title = lang === "hi" && r.titleHi ? r.titleHi : r.title;
  const summary = lang === "hi" && r.summaryHi ? r.summaryHi : r.summary;
  const slugByContent = new Map<string, string>();
  for (const j of r.jobs) slugByContent.set(`Job:${j.slug}`, j.slug);
  const t = lang === "hi"
    ? { timeline: "समय-रेखा", timelineSub: "इस भर्ती की हर आधिकारिक सूचना, नवीनतम पहले", dates: "महत्वपूर्ण तिथियाँ", start: "आवेदन प्रारंभ", end: "आवेदन की अंतिम तिथि", exam: "परीक्षा तिथि", glance: "एक नज़र में", vac: "रिक्तियाँ", qual: "योग्यता", age: "आयु सीमा", fee: "शुल्क", salary: "वेतन", sel: "चयन प्रक्रिया", apply: "ऑनलाइन आवेदन करें", notif: "आधिकारिक अधिसूचना", source: "आधिकारिक स्रोत", related: "इसी संगठन की अन्य भर्तियाँ", none: "अभी कोई सूचना प्रकाशित नहीं।", official: "आधिकारिक वेबसाइट", yrs: "वर्ष", docs: "दस्तावेज़" }
    : { timeline: "Timeline", timelineSub: "Every official update for this recruitment, newest first", dates: "Important dates", start: "Application starts", end: "Last date to apply", exam: "Exam date", glance: "At a glance", vac: "Vacancies", qual: "Qualification", age: "Age limit", fee: "Application fee", salary: "Pay", sel: "Selection process", apply: "Apply online", notif: "Official notification", source: "official source", related: "More from this organization", none: "No updates published yet.", official: "Official website", yrs: "years", docs: "Documents" };
  const selection = Array.isArray(job?.selectionProcess) ? (job!.selectionProcess as unknown[]).filter((s): s is string => typeof s === "string") : [];

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: r.title,
    description: r.summary ?? r.title,
    datePosted: (r.publishedAt ?? r.updatedAt).toISOString(),
    ...(r.applicationEndDate ? { validThrough: r.applicationEndDate.toISOString() } : {}),
    hiringOrganization: { "@type": "GovernmentOrganization", name: r.organization.name, ...(r.organization.website ? { sameAs: r.organization.website } : {}) },
    jobLocation: { "@type": "Place", address: { "@type": "PostalAddress", addressCountry: "IN", ...(r.organization.state ? { addressRegion: r.organization.state.name } : {}) } },
    employmentType: "FULL_TIME",
    ...(job?.vacancies ? { totalJobOpenings: job.vacancies } : {}),
    url: `${SITE_URL}/recruitments/${r.slug}`,
    publisher: { "@type": "Organization", name: SITE_NAME },
  };

  return (
    <main className="flex w-full flex-col gap-8 px-4 py-8 sm:px-8 lg:px-12">
      <JsonLd data={jsonLd} />
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: lang === "hi" ? "भर्तियाँ" : "Recruitments", href: "/recruitments" }, { label: r.title }]} />

      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <Link href={`/organization/${r.organization.slug}`} className="text-brand-700 hover:underline">{r.organization.name}</Link>
          {r.categories.map((c) => <Link key={c.category.slug} href={`/recruitments?category=${c.category.slug}`} className="rounded-full border border-slate-200 bg-white px-2 py-0.5 hover:bg-slate-50">{c.category.name}</Link>)}
          {r.year ? <span>{r.year}</span> : null}
        </div>
        <h1 className="text-2xl font-semibold text-slate-900" lang={lang === "hi" && r.titleHi ? "hi" : undefined}>
          {title}
          {lang === "hi" && r.titleHi && r.translationSource === "claude" ? <span className="ml-2 align-middle rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-normal text-slate-500" title="यह शीर्षक और सारांश AI द्वारा अनूदित हैं; मूल अंग्रेज़ी पाठ आधिकारिक है।">AI अनुवाद</span> : null}
        </h1>
        {summary ? <p className="text-sm text-slate-600" lang={lang === "hi" && r.summaryHi ? "hi" : undefined}>{summary}</p> : null}
        <div className="flex flex-wrap items-center gap-2">
          <DeadlineBadge endDate={r.applicationEndDate} lang={lang} />
          {info.state !== "closed" && job?.applyUrl ? <a href={job.applyUrl} target="_blank" rel="noopener noreferrer nofollow" className="rounded-md bg-brand-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-800">{t.apply} ↗</a> : null}
          {job?.notificationDocument ? <a href={job.notificationDocument.storageUrl} target="_blank" rel="noopener noreferrer nofollow" className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">{t.notif} (PDF)</a> : null}
        </div>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-slate-900">{t.dates}</h2>
        <ImportantDates rows={[{ label: t.start, date: r.applicationStartDate }, { label: t.end, date: r.applicationEndDate }, { label: t.exam, date: r.examDate }]} />
        {!r.applicationStartDate && !r.applicationEndDate && !r.examDate ? <p className="text-sm text-slate-500">{lang === "hi" ? "तिथियाँ अधिसूचना में निर्दिष्ट नहीं।" : "Not specified in the available notification."}</p> : null}
      </section>

      {job ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-slate-900">{t.glance}</h2>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-2 rounded-lg border border-slate-200 p-4 text-sm sm:grid-cols-2">
            {job.vacancies ? <><dt className="text-slate-500">{t.vac}</dt><dd className="font-medium text-slate-900">{job.vacancies.toLocaleString("en-IN")}</dd></> : null}
            {job.qualification ? <><dt className="text-slate-500">{t.qual}</dt><dd className="text-slate-900">{job.qualification}</dd></> : null}
            {job.ageLimitMin || job.ageLimitMax ? <><dt className="text-slate-500">{t.age}</dt><dd className="text-slate-900">{job.ageLimitMin ?? "—"} – {job.ageLimitMax ?? "—"} {t.yrs}</dd></> : null}
            {job.applicationFee ? <><dt className="text-slate-500">{t.fee}</dt><dd className="text-slate-900">₹{Number(job.applicationFee).toLocaleString("en-IN")}</dd></> : null}
            {job.salary ? <><dt className="text-slate-500">{t.salary}</dt><dd className="text-slate-900">{job.salary}</dd></> : null}
            {selection.length ? <><dt className="text-slate-500">{t.sel}</dt><dd className="text-slate-900">{selection.join(" → ")}</dd></> : null}
            {job.advertisementNumber ? <><dt className="text-slate-500">Advt. No.</dt><dd className="text-slate-900">{job.advertisementNumber}</dd></> : null}
          </dl>
          <Link href={`/jobs/${job.slug}`} className="text-sm text-brand-700 hover:underline">{lang === "hi" ? "पूरा विवरण देखें →" : "Full job details →"}</Link>
        </section>
      ) : null}

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{t.timeline}</h2>
          <p className="text-sm text-slate-500">{t.timelineSub}</p>
        </div>
        {r.notices.length === 0 ? <p className="text-sm text-slate-500">{t.none}</p> : null}
        <ol className="relative flex flex-col gap-4 border-l border-slate-200 pl-5">
          {r.notices.map((n) => {
            const label = TYPE_LABEL[n.noticeType];
            const ex = (n.extracted ?? {}) as { application_end_date?: string | null; exam_date?: string | null; admit_card_date?: string | null; result_date?: string | null };
            const change = (n.changeSummary ?? null) as { diff?: Array<{ old: string | null; new: string | null }> } | null;
            const href = n.publishedContentType === "Recruitment" ? null : contentHref(n.publishedContentType, n.publishedContentType === "Job" ? r.jobs.find((j) => j.slug)?.slug && r.jobs[0].slug : n.publishedContentType === "AdmitCard" ? r.admitCards.find(() => true)?.slug : n.publishedContentType === "AnswerKey" ? r.answerKeys[0]?.slug : n.publishedContentType === "Result" ? r.results[0]?.slug : null);
            const nTitle = lang === "hi" && n.titleHi ? n.titleHi : n.title;
            const nSummary = lang === "hi" && n.summaryHi ? n.summaryHi : n.summary;
            return (
              <li key={n.id} className="relative">
                <span className="absolute -left-[27px] top-1.5 h-3 w-3 rounded-full border-2 border-white bg-brand-600 ring-1 ring-slate-300" aria-hidden />
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className={`rounded-full border px-2 py-0.5 font-medium ${label.tone}`}>{lang === "hi" ? label.hi : label.en}</span>
                  <time dateTime={(n.sourcePublishedAt ?? n.publishedAt ?? r.updatedAt).toISOString()} className="text-slate-500">{formatDate(n.sourcePublishedAt ?? n.publishedAt)}</time>
                  {n.priority === "URGENT" ? <span className="rounded-full bg-red-600 px-2 py-0.5 font-medium text-white">{lang === "hi" ? "तत्काल" : "urgent"}</span> : null}
                </div>
                <h3 className="mt-1 text-sm font-medium text-slate-900" lang={lang === "hi" && n.titleHi ? "hi" : undefined}>
                  {href ? <Link href={href} className="hover:underline">{nTitle}</Link> : nTitle}
                  {lang === "hi" && n.titleHi && n.translationSource === "claude" ? <span className="ml-1 align-middle rounded bg-slate-100 px-1 text-[10px] font-normal text-slate-500">AI अनुवाद</span> : null}
                </h3>
                {nSummary ? <p className="mt-0.5 text-sm text-slate-600" lang={lang === "hi" && n.summaryHi ? "hi" : undefined}>{nSummary}</p> : null}
                <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-600">
                  {ex.application_end_date ? <li>{t.end}: <b>{ex.application_end_date}</b></li> : null}
                  {ex.exam_date ? <li>{t.exam}: <b>{ex.exam_date}</b></li> : null}
                  {ex.admit_card_date ? <li>{lang === "hi" ? "एडमिट कार्ड" : "Admit card from"}: <b>{ex.admit_card_date}</b></li> : null}
                  {ex.result_date ? <li>{lang === "hi" ? "परिणाम" : "Result"}: <b>{ex.result_date}</b></li> : null}
                </ul>
                {change?.diff?.length ? (
                  <ul className="mt-1 text-xs text-amber-800">{change.diff.slice(0, 3).map((d, i) => <li key={i}><span className="line-through opacity-60">{d.old}</span> → <b>{d.new}</b></li>)}</ul>
                ) : null}
                {n.sourceUrl ? <a href={n.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="mt-1 inline-block text-xs text-brand-700 hover:underline">{t.source} ({n.sourceDomain}) ↗</a> : null}
              </li>
            );
          })}
        </ol>
      </section>

      {(r.admitCards.length || r.answerKeys.length || r.results.length) ? (
        <section className="flex flex-col gap-2 text-sm">
          <h2 className="text-lg font-semibold text-slate-900">{t.docs}</h2>
          <ul className="flex flex-col gap-1">
            {r.admitCards.map((a) => <li key={a.slug}><Link href={`/admit-card/${a.slug}`} className="text-brand-700 hover:underline">{a.title}</Link>{a.examDate ? <span className="text-slate-500"> · {t.exam} {formatDate(a.examDate)}</span> : null}</li>)}
            {r.answerKeys.map((a) => <li key={a.slug}><Link href={`/answer-key/${a.slug}`} className="text-brand-700 hover:underline">{a.title}</Link></li>)}
            {r.results.map((a) => <li key={a.slug}><Link href={`/results/${a.slug}`} className="text-brand-700 hover:underline">{a.title}</Link>{a.resultDate ? <span className="text-slate-500"> · {formatDate(a.resultDate)}</span> : null}</li>)}
          </ul>
        </section>
      ) : null}

      <AlertSubscribeForm scope={{ recruitmentId: r.id, label: r.title }} lang={lang} compact />

      <section className="flex flex-col gap-1 text-sm text-slate-600">
        <h2 className="text-lg font-semibold text-slate-900">{r.organization.name}</h2>
        {r.organization.website ? <a href={r.organization.website} target="_blank" rel="noopener noreferrer nofollow" className="w-fit text-brand-700 hover:underline">{t.official} ↗</a> : null}
        <Link href={`/organization/${r.organization.slug}`} className="w-fit text-brand-700 hover:underline">{lang === "hi" ? "संगठन का पृष्ठ →" : "Organization page →"}</Link>
      </section>

      {related.length ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-slate-900">{t.related}</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{related.map((x) => <RecruitmentCard key={x.slug} recruitment={x} lang={lang} />)}</div>
        </section>
      ) : null}
    </main>
  );
}
