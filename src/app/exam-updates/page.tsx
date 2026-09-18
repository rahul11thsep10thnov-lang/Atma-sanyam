import Link from "next/link";
import type { Metadata } from "next";
import { STATES } from "@/data/states";
import { EXAM_UPDATES } from "@/data/examUpdates";
import Badge from "@/components/ui/Badge";
import DisclaimerBanner from "@/components/ui/DisclaimerBanner";
import { formatDate } from "@/lib/utils";
import { Bell } from "lucide-react";

export const metadata: Metadata = {
  title: "Latest Police Exam Updates",
  description: "Notification, application, admit card, exam date, answer key, result, cutoff aur physical test updates — sabhi 9 states ke liye.",
  alternates: { canonical: "/exam-updates" },
};

const TYPE_LABELS: Record<string, string> = {
  notification: "Notification",
  application: "Application",
  correction: "Correction",
  admit_card: "Admit Card",
  exam_date: "Exam Date",
  answer_key: "Answer Key",
  result: "Result",
  cutoff: "Cut-off",
  physical_test: "Physical Test",
  document_verification: "Document Verification",
};

export default async function ExamUpdatesPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const sp = await searchParams;
  const filtered = EXAM_UPDATES.filter((u) => !sp.state || u.state === sp.state);

  return (
    <div className="container-page py-8">
      <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900">Latest Police Exam Updates</h1>
      <p className="mt-1 text-sm text-gray-600">Notification se result tak — sabhi updates ek jagah.</p>

      <div className="mt-4">
        <DisclaimerBanner>
          Yahan sample/demo placeholders dikh rahe hain kyunki koi bhi live
          official notification abhi fabricate nahi ki gayi hai. Real
          updates admin panel se verified source ke saath publish honge.
        </DisclaimerBanner>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Link href="/exam-updates" className={`rounded-full px-3 py-1.5 text-xs font-semibold ${!sp.state ? "bg-brand-navy text-white" : "bg-gray-100 text-gray-600"}`}>
          Sabhi States
        </Link>
        {STATES.map((s) => (
          <Link
            key={s.code}
            href={`/exam-updates?state=${s.code}`}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${sp.state === s.code ? "bg-brand-navy text-white" : "bg-gray-100 text-gray-600"}`}
          >
            {s.hinglishName}
          </Link>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((u) => (
          <div key={u.id} className="card p-4">
            <div className="flex items-center gap-2">
              <Bell size={14} className="text-brand-navy" />
              <Badge tone="navy">{TYPE_LABELS[u.type]}</Badge>
              <Badge tone="gray">{u.state.toUpperCase()} · {u.exam.toUpperCase()}</Badge>
            </div>
            <h3 className="mt-2 text-sm font-bold text-gray-900">{u.title}</h3>
            <p className="mt-1 text-xs text-amber-700">{u.status}</p>
            <p className="mt-1 text-[11px] text-gray-400">{formatDate(u.date)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
