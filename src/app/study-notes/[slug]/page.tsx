import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { STUDY_NOTES, STUDY_NOTE_MAP } from "@/data/studyNotes";
import { getQuestion } from "@/data/questions";
import { CheckCircle2 } from "lucide-react";

export function generateStaticParams() {
  return STUDY_NOTES.map((n) => ({ slug: n.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const note = STUDY_NOTE_MAP[slug];
  if (!note) return {};
  return {
    title: note.title,
    description: note.quickConcept,
    alternates: { canonical: `/study-notes/${slug}` },
  };
}

export default async function StudyNoteDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const note = STUDY_NOTE_MAP[slug];
  if (!note) notFound();

  const practiceQuestions = note.practiceQuestionIds.map((id) => getQuestion(id)).filter(Boolean);

  return (
    <div className="container-page py-8 max-w-2xl">
      <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900">{note.title}</h1>

      <div className="card p-4 mt-5">
        <h2 className="text-sm font-bold text-gray-900 mb-1.5">Quick Concept</h2>
        <p className="text-sm text-gray-700 leading-relaxed">{note.quickConcept}</p>
      </div>

      <div className="card p-4 mt-4">
        <h2 className="text-sm font-bold text-gray-900 mb-2">Important Facts</h2>
        <ul className="space-y-2">
          {note.importantFacts.map((f, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
              <CheckCircle2 size={15} className="text-brand-green mt-0.5 shrink-0" />
              {f}
            </li>
          ))}
        </ul>
      </div>

      <div className="card p-4 mt-4 bg-blue-50 border-blue-100">
        <h2 className="text-sm font-bold text-brand-navy mb-2">5-Minute Revision</h2>
        <ul className="space-y-1.5 list-disc pl-4">
          {note.revision.map((r, i) => (
            <li key={i} className="text-sm text-gray-700">{r}</li>
          ))}
        </ul>
      </div>

      {practiceQuestions.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-bold text-gray-900 mb-3">Practice Questions</h2>
          <div className="space-y-3">
            {practiceQuestions.map((q) => (
              <details key={q!.id} className="card p-3">
                <summary className="cursor-pointer text-sm font-medium text-gray-800">{q!.question}</summary>
                <p className="mt-2 text-sm text-brand-green font-semibold">{q!.options[q!.correctAnswer]}</p>
                <p className="mt-1 text-xs text-gray-600">{q!.explanation}</p>
              </details>
            ))}
          </div>
        </div>
      )}

      <Link href="/study-notes" className="mt-6 inline-block text-sm font-semibold text-brand-navy hover:underline">
        ← Sabhi Study Notes
      </Link>
    </div>
  );
}
