"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search as SearchIcon } from "lucide-react";
import { EXAM_CONFIGS } from "@/data/examConfigs";
import { STATES } from "@/data/states";
import { QUESTIONS } from "@/data/questions";
import { STUDY_NOTES } from "@/data/studyNotes";
import { PYQ_PAPERS } from "@/data/pyq";
import { MOCK_TESTS } from "@/data/mockTests";
import { EXAM_UPDATES } from "@/data/examUpdates";

interface Result {
  title: string;
  subtitle: string;
  href: string;
  group: string;
}

export default function SearchPage() {
  const [q, setQ] = useState("");

  const results = useMemo<Result[]>(() => {
    const query = q.trim().toLowerCase();
    if (query.length < 2) return [];

    const out: Result[] = [];

    for (const s of STATES) {
      if (s.name.toLowerCase().includes(query) || s.hinglishName.toLowerCase().includes(query)) {
        out.push({ title: `${s.hinglishName} Police`, subtitle: "State", href: `/exams/${s.code}`, group: "States" });
      }
    }

    for (const c of EXAM_CONFIGS) {
      if (c.title.toLowerCase().includes(query) || c.slug.includes(query)) {
        out.push({ title: c.title, subtitle: "Exam", href: `/${c.slug}`, group: "Exams" });
      }
    }

    for (const m of MOCK_TESTS) {
      if (m.title.toLowerCase().includes(query)) {
        out.push({ title: m.title, subtitle: "Mock Test", href: `/mock-test/${m.id}`, group: "Mock Tests" });
      }
      if (out.filter((r) => r.group === "Mock Tests").length >= 5) break;
    }

    for (const p of PYQ_PAPERS) {
      if (p.title.toLowerCase().includes(query)) {
        out.push({ title: p.title, subtitle: "PYQ", href: `/pyq/${p.id}`, group: "PYQ" });
      }
      if (out.filter((r) => r.group === "PYQ").length >= 5) break;
    }

    for (const n of STUDY_NOTES) {
      if (n.title.toLowerCase().includes(query)) {
        out.push({ title: n.title, subtitle: "Study Note", href: `/study-notes/${n.slug}`, group: "Study Notes" });
      }
    }

    for (const u of EXAM_UPDATES) {
      if (u.title.toLowerCase().includes(query)) {
        out.push({ title: u.title, subtitle: "Update", href: `/exam-updates?state=${u.state}`, group: "Updates" });
      }
      if (out.filter((r) => r.group === "Updates").length >= 5) break;
    }

    let qCount = 0;
    for (const question of QUESTIONS) {
      if (qCount >= 8) break;
      if (
        question.question.toLowerCase().includes(query) ||
        question.topic.toLowerCase().includes(query) ||
        question.tags.some((t) => t.includes(query))
      ) {
        out.push({
          title: question.question,
          subtitle: `Question · ${question.topic}`,
          href: `/practice?state=${question.state}&exam=${question.exam}&subject=${question.subject}`,
          group: "Questions",
        });
        qCount++;
      }
    }

    return out;
  }, [q]);

  const grouped = results.reduce<Record<string, Result[]>>((acc, r) => {
    (acc[r.group] ??= []).push(r);
    return acc;
  }, {});

  return (
    <div className="container-page py-8 max-w-2xl">
      <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900">Search</h1>
      <p className="mt-1 text-sm text-gray-600 mb-5">
        Exam, state, question, topic, PYQ, mock, study note ya update search karein.
      </p>

      <div className="relative">
        <SearchIcon size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="e.g. UP SI, State GK, Percentage..."
          className="w-full rounded-xl border border-[var(--card-border)] py-3.5 pl-11 pr-4 text-sm outline-none focus:border-brand-navy"
        />
      </div>

      {q.trim().length >= 2 && results.length === 0 && (
        <p className="mt-6 text-sm text-gray-500">Koi result nahi mila &quot;{q}&quot; ke liye.</p>
      )}

      <div className="mt-6 space-y-6">
        {Object.entries(grouped).map(([group, items]) => (
          <div key={group}>
            <h2 className="text-xs font-bold text-gray-500 uppercase mb-2">{group}</h2>
            <div className="space-y-1.5">
              {items.map((r, i) => (
                <Link key={i} href={r.href} className="card p-3 flex items-center justify-between hover:shadow-md transition-shadow block">
                  <span className="text-sm font-medium text-gray-800 truncate pr-3">{r.title}</span>
                  <span className="text-[11px] text-gray-400 shrink-0">{r.subtitle}</span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
