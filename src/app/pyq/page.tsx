import Link from "next/link";
import type { Metadata } from "next";
import { STATES } from "@/data/states";
import { PYQ_PAPERS } from "@/data/pyq";
import Badge from "@/components/ui/Badge";
import DisclaimerBanner from "@/components/ui/DisclaimerBanner";
import { FileText } from "lucide-react";

export const metadata: Metadata = {
  title: "Police PYQ — Previous Year Questions",
  description: "State-wise aur exam-wise Police PYQ practice papers — Constable aur SI, sabhi 9 states.",
  alternates: { canonical: "/pyq" },
};

export default async function PyqPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string; exam?: string }>;
}) {
  const sp = await searchParams;
  const filtered = PYQ_PAPERS.filter((p) => {
    if (sp.state && p.state !== sp.state) return false;
    if (sp.exam && p.exam !== sp.exam) return false;
    return true;
  });

  return (
    <div className="container-page py-8">
      <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900">Police PYQ</h1>
      <p className="mt-1 text-sm text-gray-600">Previous Year Questions — state-wise aur exam-wise.</p>

      <div className="mt-4">
        <DisclaimerBanner>
          Yeh sample/practice papers hain, copyright reasons se real official
          question papers copy nahi kiye gaye hain. Official PYQ ke liye
          apne state ke recruitment board ki website dekhein.
        </DisclaimerBanner>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Link href="/pyq" className={`rounded-full px-3 py-1.5 text-xs font-semibold ${!sp.state ? "bg-brand-navy text-white" : "bg-gray-100 text-gray-600"}`}>
          Sabhi States
        </Link>
        {STATES.map((s) => (
          <Link
            key={s.code}
            href={`/pyq?state=${s.code}`}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${sp.state === s.code ? "bg-brand-navy text-white" : "bg-gray-100 text-gray-600"}`}
          >
            {s.hinglishName}
          </Link>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((p) => (
          <Link key={p.id} href={`/pyq/${p.id}`} className="card p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <Badge tone={p.exam === "constable" ? "navy" : "gold"}>
                {p.state.toUpperCase()} · {p.exam.toUpperCase()}
              </Badge>
              <FileText size={15} className="text-gray-400" />
            </div>
            <h3 className="mt-2 text-sm font-bold text-gray-900">{p.title}</h3>
            <p className="mt-1 text-xs text-gray-500">{p.questionIds.length} Questions · Year {p.year}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
