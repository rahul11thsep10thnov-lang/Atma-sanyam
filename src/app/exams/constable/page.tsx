import Link from "next/link";
import type { Metadata } from "next";
import { STATES } from "@/data/states";
import { getExamConfig } from "@/data/examConfigs";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Police Constable Exams — All 9 States",
  description:
    "UP, MP, Rajasthan, Bihar, Jharkhand, Uttarakhand, Haryana, Punjab aur Chhattisgarh Police Constable exams — syllabus, pattern, PYQ aur mock tests.",
  alternates: { canonical: "/exams/constable" },
};

export default function ConstableExamsPage() {
  return (
    <div className="container-page py-8">
      <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900">Police Constable</h1>
      <p className="mt-1 text-sm text-gray-600">
        9 states ke Police Constable exams — apna state choose karein.
      </p>
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {STATES.map((s) => {
          const cfg = getExamConfig(`${s.code}-police-constable`)!;
          return (
            <Link
              key={s.code}
              href={`/${cfg.slug}`}
              className="card p-4 flex items-center justify-between hover:shadow-md transition-shadow"
            >
              <div>
                <p className="text-sm font-bold text-gray-900">{cfg.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">Rajdhani: {s.capital}</p>
              </div>
              <ArrowRight size={16} className="text-brand-navy" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
