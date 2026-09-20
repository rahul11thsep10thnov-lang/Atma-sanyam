import Link from "next/link";
import type { Metadata } from "next";
import { STATES } from "@/data/states";
import { getExamConfig } from "@/data/examConfigs";
import { ArrowRight } from "lucide-react";
import { getAccent } from "@/lib/accentColors";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Police SI Exams — All 9 States",
  description:
    "UP, MP, Rajasthan, Bihar, Jharkhand, Uttarakhand, Haryana, Punjab aur Chhattisgarh Police Sub-Inspector (SI) exams — syllabus, pattern, PYQ aur mock tests.",
  alternates: { canonical: "/exams/si" },
};

export default function SiExamsPage() {
  return (
    <div className="container-page py-8">
      <h1 className="font-display text-2xl md:text-3xl font-extrabold text-gray-900">Police Sub-Inspector (SI)</h1>
      <p className="mt-1 text-sm text-gray-600">
        9 states ke Police SI exams — apna state choose karein.
      </p>
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {STATES.map((s, i) => {
          const cfg = getExamConfig(`${s.code}-police-si`)!;
          const accent = getAccent(i + 1);
          return (
            <Link
              key={s.code}
              href={`/${cfg.slug}`}
              className="card card-accent p-4 flex items-center justify-between hover:shadow-md transition-shadow"
              style={{ ["--accent" as string]: accent.border }}
            >
              <div>
                <p className="text-sm font-bold text-gray-900">{cfg.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">Rajdhani: {s.capital}</p>
              </div>
              <ArrowRight size={16} className={cn(accent.text)} />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
