import Link from "next/link";
import type { Metadata } from "next";
import { STATES } from "@/data/states";
import { MOCK_TESTS } from "@/data/mockTests";
import Badge from "@/components/ui/Badge";
import { Timer } from "lucide-react";
import { getAccent } from "@/lib/accentColors";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "State Police Mock Tests",
  description: "Full mock tests, subject tests, state GK tests aur police GK tests — sabhi 9 states ke Constable aur SI exams ke liye.",
  alternates: { canonical: "/mock-test" },
};

export default async function MockTestPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string; exam?: string }>;
}) {
  const sp = await searchParams;
  const filtered = MOCK_TESTS.filter((m) => {
    if (sp.state && m.state !== sp.state) return false;
    if (sp.exam && m.exam !== sp.exam) return false;
    return true;
  });

  return (
    <div className="container-page py-8">
      <h1 className="font-display text-2xl md:text-3xl font-extrabold text-gray-900">State Police Mock Tests</h1>
      <p className="mt-1 text-sm text-gray-600">
        Full mock, subject test, state GK test — timer aur result analysis ke saath.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        <Link href="/mock-test" className={`rounded-full px-3 py-1.5 text-xs font-semibold ${!sp.state ? "bg-brand-orange text-white" : "bg-gray-100 text-gray-600"}`}>
          Sabhi States
        </Link>
        {STATES.map((s) => (
          <Link
            key={s.code}
            href={`/mock-test?state=${s.code}`}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${sp.state === s.code ? "bg-brand-orange text-white" : "bg-gray-100 text-gray-600"}`}
          >
            {s.hinglishName}
          </Link>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((m, i) => {
          const accent = getAccent(i);
          return (
            <Link
              key={m.id}
              href={`/mock-test/${m.id}`}
              className="card card-accent p-4 hover:shadow-md transition-shadow"
              style={{ ["--accent" as string]: accent.border }}
            >
              <div className="flex items-center justify-between">
                <Badge tone={m.exam === "constable" ? "navy" : "gold"}>{m.state.toUpperCase()} · {m.exam.toUpperCase()}</Badge>
                <Timer size={15} className={cn(accent.text)} />
              </div>
              <h3 className="mt-2 text-sm font-bold text-gray-900">{m.title}</h3>
              <p className="mt-1 text-xs text-gray-500">
                {m.questionCount} Q · {m.durationMinutes} min · {m.marksPerQuestion} marks/Q
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
