import Link from "next/link";
import type { Metadata } from "next";
import { STATES } from "@/data/states";
import StateCard from "@/components/StateCard";
import Badge from "@/components/ui/Badge";

export const metadata: Metadata = {
  title: "Police Exams — Constable & SI, 9 States",
  description:
    "Police Constable aur SI exams — UP, MP, Rajasthan, Bihar, Jharkhand, Uttarakhand, Haryana, Punjab, Chhattisgarh. State choose karein aur taiyari shuru karein.",
  alternates: { canonical: "/exams" },
};

export default function ExamsPage() {
  return (
    <div className="container-page py-8">
      <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900">State Police Exams</h1>
      <p className="mt-1 text-sm text-gray-600">
        9 states, 2 exam category — Constable aur Sub-Inspector (SI). Apna
        state choose karein.
      </p>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/exams/constable" className="card p-5 hover:shadow-md transition-shadow">
          <Badge tone="navy">Police Constable</Badge>
          <h2 className="mt-3 text-lg font-bold text-gray-900">Constable — 9 States</h2>
          <p className="mt-1 text-sm text-gray-600">10+2 level, sabhi states ki alag-alag detail.</p>
        </Link>
        <Link href="/exams/si" className="card p-5 hover:shadow-md transition-shadow">
          <Badge tone="gold">Police SI</Badge>
          <h2 className="mt-3 text-lg font-bold text-gray-900">Sub-Inspector — 9 States</h2>
          <p className="mt-1 text-sm text-gray-600">Graduate level, sabhi states ki alag-alag detail.</p>
        </Link>
      </div>

      <h2 className="mt-10 mb-4 text-xl font-bold text-gray-900">State-wise Browse Karein</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {STATES.map((s, i) => (
          <StateCard key={s.code} state={s} index={i} />
        ))}
      </div>
    </div>
  );
}
