import Link from "next/link";
import { StateInfo } from "@/types";
import { ArrowRight } from "lucide-react";

export default function StateCard({ state }: { state: StateInfo }) {
  return (
    <div className="card p-4 flex flex-col gap-3 hover:shadow-md transition-shadow">
      <div>
        <h3 className="text-base font-bold text-gray-900">{state.hinglishName} Police</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Rajdhani: {state.capital} · {state.totalDistricts} jile
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link
          href={`/${state.code}-police-constable`}
          className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-brand-navy hover:bg-blue-100"
        >
          Constable
        </Link>
        <Link
          href={`/${state.code}-police-si`}
          className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-brand-navy hover:bg-blue-100"
        >
          SI
        </Link>
        <Link
          href={`/state-gk/${state.code}`}
          className="rounded-md bg-amber-50 px-2.5 py-1 text-xs font-semibold text-[#8a5a00] hover:bg-amber-100"
        >
          State GK
        </Link>
      </div>
      <Link
        href={`/exams/${state.code}`}
        className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-brand-navy hover:underline"
      >
        Practice karein <ArrowRight size={14} />
      </Link>
    </div>
  );
}
