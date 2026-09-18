"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { clearMistake, getWrongQuestions } from "@/lib/localStore";
import { getQuestion } from "@/data/questions";
import { SUBJECT_MAP } from "@/data/subjects";
import { X } from "lucide-react";

export default function MistakesPage() {
  const [entries, setEntries] = useState<{ questionId: string; wrongCount: number }[]>([]);

  useEffect(() => {
    // Hydrate from browser-only localStorage after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEntries(getWrongQuestions());
  }, []);

  const rows = entries
    .map((e) => ({ ...e, question: getQuestion(e.questionId) }))
    .filter((e) => e.question);

  return (
    <div className="container-page py-8 max-w-2xl">
      <h1 className="text-2xl font-extrabold text-gray-900">Meri Mistakes</h1>
      <p className="mt-1 text-sm text-gray-600 mb-6">
        Jo questions galat hue hain, wo yahan automatically save hote hain.
      </p>

      {rows.length === 0 ? (
        <p className="text-sm text-gray-500">Abhi koi mistake nahi hai — great going!</p>
      ) : (
        <>
          <Link
            href={`/practice/run?ids=${rows.map((r) => r.questionId).join(",")}`}
            className="btn-primary inline-flex px-5 py-3 text-sm mb-4"
          >
            Practice My Mistakes
          </Link>
          <div className="space-y-3">
            {rows.map((r) => (
              <div key={r.questionId} className="card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs text-gray-400 uppercase font-semibold">
                      {SUBJECT_MAP[r.question!.subject]?.hinglishName} · {r.question!.topic} · Galat: {r.wrongCount}x
                    </p>
                    <p className="text-sm font-semibold text-gray-900 mt-1">{r.question!.question}</p>
                  </div>
                  <button
                    onClick={() => {
                      clearMistake(r.questionId);
                      setEntries(getWrongQuestions());
                    }}
                    className="text-gray-400 hover:text-gray-700 shrink-0"
                    aria-label="Remove"
                  >
                    <X size={16} />
                  </button>
                </div>
                <p className="mt-2 text-sm text-brand-green font-semibold">
                  {r.question!.options[r.question!.correctAnswer]}
                </p>
                <p className="mt-1 text-xs text-gray-600">{r.question!.explanation}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
