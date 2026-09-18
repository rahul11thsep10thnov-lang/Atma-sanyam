"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAdminQuestions, getQuestionReports } from "@/lib/localStore";
import { Question } from "@/types";
import DisclaimerBanner from "@/components/ui/DisclaimerBanner";
import { SUBJECT_MAP } from "@/data/subjects";

export default function AdminDashboardPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [reportsCount, setReportsCount] = useState(0);
  const [openReportsCount, setOpenReportsCount] = useState(0);

  useEffect(() => {
    // Hydrate from browser-only localStorage after mount (SSR has no access).
    const qs = getAdminQuestions();
    const reports = getQuestionReports();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQuestions(qs);
     
    setReportsCount(reports.length);
     
    setOpenReportsCount(reports.filter((r) => r.status === "open").length);
  }, []);

  const published = questions.filter((q) => q.status === "published").length;
  const pending = questions.filter((q) => q.status === "draft" || q.status === "under_review").length;

  const stateCounts = new Map<string, number>();
  const examCounts = new Map<string, number>();
  const subjectCounts = new Map<string, number>();
  questions.forEach((q) => {
    stateCounts.set(q.state, (stateCounts.get(q.state) ?? 0) + 1);
    examCounts.set(q.exam, (examCounts.get(q.exam) ?? 0) + 1);
    subjectCounts.set(q.subject, (subjectCounts.get(q.subject) ?? 0) + 1);
  });
  const topState = [...stateCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  const topSubject = [...subjectCounts.entries()].sort((a, b) => b[1] - a[1])[0];

  return (
    <div>
      <DisclaimerBanner>
        Demo mode: yeh dashboard localStorage me stored data dikha raha hai
        (koi Supabase project configure nahi hai). Production me yeh live
        database se aayega — dekhein <code>supabase/schema.sql</code> aur{" "}
        <code>README.md</code>.
      </DisclaimerBanner>

      <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Total Questions" value={questions.length} />
        <Stat label="Published" value={published} tone="text-brand-green" />
        <Stat label="Pending Review" value={pending} tone="text-amber-600" />
        <Stat label="Reported Questions" value={reportsCount} tone="text-brand-red" />
        <Stat label="Open Reports" value={openReportsCount} tone="text-brand-red" />
        <Stat label="States Covered" value={stateCounts.size} />
        <Stat label="Most Popular State" value={topState ? topState[0].toUpperCase() : "—"} isText />
        <Stat
          label="Most Practiced Subject"
          value={topSubject ? SUBJECT_MAP[topSubject[0]]?.hinglishName ?? topSubject[0] : "—"}
          isText
        />
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link href="/admin/questions" className="card p-4 hover:shadow-md transition-shadow">
          <p className="text-sm font-bold text-gray-900">Manage Questions</p>
          <p className="text-xs text-gray-500 mt-1">Add, edit, publish, duplicate ya delete karein</p>
        </Link>
        <Link href="/admin/reports" className="card p-4 hover:shadow-md transition-shadow">
          <p className="text-sm font-bold text-gray-900">Review Reports</p>
          <p className="text-xs text-gray-500 mt-1">{openReportsCount} open reports pending</p>
        </Link>
        <Link href="/admin/analytics" className="card p-4 hover:shadow-md transition-shadow">
          <p className="text-sm font-bold text-gray-900">Analytics</p>
          <p className="text-xs text-gray-500 mt-1">State, exam aur subject-wise breakdown</p>
        </Link>
      </div>

      <div className="card p-5 mt-6">
        <h2 className="text-sm font-bold text-gray-900 mb-2">Other Content Types</h2>
        <p className="text-xs text-gray-500 mb-3">
          Exams, States, PYQs, Mock Tests, Study Notes, Current Affairs,
          Exam Updates, Physical Requirements aur Users — sab kuch
          database-driven hai (dekhein <code>supabase/schema.sql</code>).
          Ek baar Supabase project connect karne ke baad, inhe seed script
          (<code>npm run seed:supabase</code>) se load karein ya seedhe
          Supabase Table Editor se manage karein.
        </p>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
  isText,
}: {
  label: string;
  value: number | string;
  tone?: string;
  isText?: boolean;
}) {
  return (
    <div className="card p-3.5">
      <p className={`font-extrabold text-gray-900 ${isText ? "text-sm" : "text-xl"} ${tone ?? ""}`}>{value}</p>
      <p className="text-[11px] text-gray-500 mt-1">{label}</p>
    </div>
  );
}
