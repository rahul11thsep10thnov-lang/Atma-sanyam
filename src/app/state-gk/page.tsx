import Link from "next/link";
import type { Metadata } from "next";
import { STATES } from "@/data/states";
import { getStateGkQuestions } from "@/data/questions";
import { MapPinned } from "lucide-react";
import { getAccent } from "@/lib/accentColors";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "State GK — 9 States",
  description: "UP, MP, Rajasthan, Bihar, Jharkhand, Uttarakhand, Haryana, Punjab aur Chhattisgarh ki State GK — history, geography, rivers, culture aur bahut kuch.",
  alternates: { canonical: "/state-gk" },
};

export default function StateGkPage() {
  return (
    <div className="container-page py-8">
      <h1 className="font-display text-2xl md:text-3xl font-extrabold text-gray-900">State GK</h1>
      <p className="mt-1 text-sm text-gray-600">
        Police exams ka sabse bada section — apna state choose karein.
      </p>
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {STATES.map((s, i) => {
          const count = getStateGkQuestions(s.code).length;
          const accent = getAccent(i);
          return (
            <Link
              key={s.code}
              href={`/state-gk/${s.code}`}
              className="card card-accent p-4 hover:shadow-md transition-shadow"
              style={{ ["--accent" as string]: accent.border }}
            >
              <div className={cn("flex items-center gap-2", accent.text)}>
                <MapPinned size={16} />
              </div>
              <h3 className="mt-2 text-sm font-bold text-gray-900">{s.hinglishName} GK</h3>
              <p className="mt-1 text-xs text-gray-500">{count} practice questions · History, Geography, Culture</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
