import Link from "next/link";
import { StateInfo } from "@/types";
import { ArrowRight, Users, ShieldCheck, MapPinned, PenSquare } from "lucide-react";
import { getAccent } from "@/lib/accentColors";
import { cn } from "@/lib/utils";

export default function StateCard({ state, index = 0 }: { state: StateInfo; index?: number }) {
  const accent = getAccent(index);

  return (
    <div
      className="card card-accent p-4 flex flex-col gap-3 hover:shadow-md transition-shadow"
      style={{ ["--accent" as string]: accent.border }}
    >
      <div>
        <h3 className="font-display text-base font-bold text-gray-900">{state.hinglishName} Police</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Rajdhani: {state.capital} · {state.totalDistricts} jile
        </p>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <Link
          href={`/${state.code}-police-constable`}
          className={cn("flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold", accent.bg, accent.text)}
        >
          <Users size={13} /> Constable
        </Link>
        <Link
          href={`/${state.code}-police-si`}
          className={cn("flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold", accent.bg, accent.text)}
        >
          <ShieldCheck size={13} /> SI
        </Link>
        <Link
          href={`/state-gk/${state.code}`}
          className="flex items-center gap-1.5 rounded-lg bg-gray-50 px-2.5 py-2 text-xs font-semibold text-gray-600"
        >
          <MapPinned size={13} /> State GK
        </Link>
        <Link
          href={`/exams/${state.code}`}
          className="flex items-center gap-1.5 rounded-lg bg-gray-50 px-2.5 py-2 text-xs font-semibold text-gray-600"
        >
          <PenSquare size={13} /> Practice
        </Link>
      </div>

      <Link
        href={`/exams/${state.code}`}
        className={cn("mt-0.5 inline-flex items-center gap-1 text-sm font-bold hover:underline", accent.text)}
      >
        Taiyari shuru karein <ArrowRight size={14} />
      </Link>
    </div>
  );
}
