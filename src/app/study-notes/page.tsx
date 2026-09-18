import Link from "next/link";
import type { Metadata } from "next";
import { STUDY_NOTES } from "@/data/studyNotes";
import { SUBJECT_MAP } from "@/data/subjects";
import Badge from "@/components/ui/Badge";
import { NotebookText } from "lucide-react";

export const metadata: Metadata = {
  title: "Study Notes — Quick Revision",
  description: "Police exam ke liye short, exam-focused study notes — Polity, State GK aur zyada, 5-minute revision ke saath.",
  alternates: { canonical: "/study-notes" },
};

export default function StudyNotesPage() {
  return (
    <div className="container-page py-8">
      <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900">Study Notes</h1>
      <p className="mt-1 text-sm text-gray-600">Short, concise notes — quick revision ke liye.</p>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {STUDY_NOTES.map((n) => (
          <Link key={n.id} href={`/study-notes/${n.slug}`} className="card p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <NotebookText size={16} className="text-brand-navy" />
              <Badge tone="navy">{SUBJECT_MAP[n.subject]?.hinglishName ?? n.subject}</Badge>
            </div>
            <h3 className="mt-2 text-sm font-bold text-gray-900">{n.title}</h3>
            <p className="mt-1 text-xs text-gray-500 line-clamp-2">{n.quickConcept}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
