import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { STATES, getState } from "@/data/states";
import { getStateGkQuestions } from "@/data/questions";
import Badge from "@/components/ui/Badge";

const ALL_CATEGORIES = [
  "History",
  "Geography",
  "Districts",
  "Rivers",
  "Dams",
  "National Parks",
  "Wildlife",
  "Economy",
  "Agriculture",
  "Culture",
  "Folk Dances",
  "Festivals",
  "Important Personalities",
  "Government Schemes",
  "Sports",
  "Awards",
  "State Current Affairs",
  "Important Places",
  "Monuments",
  "Symbols",
];

export function generateStaticParams() {
  return STATES.map((s) => ({ state: s.code }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ state: string }>;
}): Promise<Metadata> {
  const { state: code } = await params;
  const state = getState(code);
  if (!state) return {};
  return {
    title: `${state.hinglishName} GK — History, Geography, Culture`,
    description: `${state.hinglishName} General Knowledge — history, geography, rivers, national parks, culture, folk dance aur important facts, Police exam ke liye.`,
    alternates: { canonical: `/state-gk/${code}` },
  };
}

export default async function StateGkDetailPage({
  params,
}: {
  params: Promise<{ state: string }>;
}) {
  const { state: code } = await params;
  const state = getState(code);
  if (!state) notFound();

  const questions = getStateGkQuestions(state.code);
  const byTopic = new Map<string, typeof questions>();
  for (const q of questions) {
    const arr = byTopic.get(q.topic) ?? [];
    arr.push(q);
    byTopic.set(q.topic, arr);
  }
  const coveredTopics = Array.from(byTopic.keys());
  const missingTopics = ALL_CATEGORIES.filter((c) => !coveredTopics.includes(c));

  return (
    <div className="container-page py-8">
      <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900">{state.hinglishName} GK</h1>
      <p className="mt-1 text-sm text-gray-600">
        Rajdhani: {state.capital} · High Court: {state.highCourt} · {state.totalDistricts} jile ·
        {" "}Formation: {state.formationYear}
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {ALL_CATEGORIES.map((cat) => (
          <Badge key={cat} tone={coveredTopics.includes(cat) ? "navy" : "gray"}>
            {cat}
          </Badge>
        ))}
      </div>

      <div className="mt-6 space-y-6">
        {Array.from(byTopic.entries()).map(([topic, qs]) => (
          <div key={topic} className="card p-4">
            <h2 className="text-sm font-bold text-gray-900 mb-3">{topic}</h2>
            <div className="space-y-2">
              {qs.map((q) => (
                <details key={q.id} className="rounded-lg border border-gray-100 p-3 group">
                  <summary className="cursor-pointer text-sm font-medium text-gray-800 marker:text-brand-navy">
                    {q.question}
                  </summary>
                  <p className="mt-2 text-sm text-brand-green font-semibold">
                    {q.options[q.correctAnswer]}
                  </p>
                  <p className="mt-1 text-xs text-gray-600">{q.explanation}</p>
                </details>
              ))}
            </div>
          </div>
        ))}
      </div>

      {missingTopics.length > 0 && (
        <div className="card p-4 mt-6 bg-amber-50 border-amber-100">
          <p className="text-sm font-semibold text-amber-800">Jald aa raha hai</p>
          <p className="text-xs text-amber-700 mt-1">
            {missingTopics.join(", ")} — is state ke liye content abhi available nahi hai. Admin panel se add kiya jaayega.
          </p>
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href={`/practice?state=${state.code}&exam=constable&subject=state-gk`} className="btn-primary px-5 py-2.5 text-sm">
          {state.hinglishName} GK Practice Karein
        </Link>
        <Link href={`/study-notes/${state.code}-gk-quick-notes`} className="btn-secondary bg-white px-5 py-2.5 text-sm">
          Quick Revision Notes
        </Link>
      </div>
    </div>
  );
}
