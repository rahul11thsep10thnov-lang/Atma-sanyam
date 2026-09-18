"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getBookmarks, toggleBookmark } from "@/lib/localStore";
import { getQuestion } from "@/data/questions";
import { Star } from "lucide-react";

export default function BookmarksPage() {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    // Hydrate from browser-only localStorage after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIds(getBookmarks());
  }, []);

  const questions = ids.map((id) => getQuestion(id)).filter(Boolean) as NonNullable<
    ReturnType<typeof getQuestion>
  >[];

  return (
    <div className="container-page py-8 max-w-2xl">
      <h1 className="text-2xl font-extrabold text-gray-900">My Saved Questions</h1>
      <p className="mt-1 text-sm text-gray-600 mb-6">{questions.length} questions bookmarked.</p>

      {questions.length === 0 ? (
        <p className="text-sm text-gray-500">
          Koi bhi question ka ⭐ icon dabakar use bookmark karein — wo yahan dikhega.
        </p>
      ) : (
        <div className="space-y-3">
          {questions.map((q) => (
            <div key={q.id} className="card p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-gray-900">{q.question}</p>
                <button
                  onClick={() => {
                    toggleBookmark(q.id);
                    setIds(getBookmarks());
                  }}
                  className="text-amber-500 shrink-0"
                >
                  <Star size={18} fill="currentColor" />
                </button>
              </div>
              <p className="mt-2 text-sm text-brand-green font-semibold">{q.options[q.correctAnswer]}</p>
              <p className="mt-1 text-xs text-gray-600">{q.explanation}</p>
            </div>
          ))}
          <Link
            href={`/practice/run?ids=${questions.map((q) => q.id).join(",")}`}
            className="btn-primary inline-flex px-5 py-3 text-sm mt-2"
          >
            Sabhi Bookmarks Practice Karein
          </Link>
        </div>
      )}
    </div>
  );
}
