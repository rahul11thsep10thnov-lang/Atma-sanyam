import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { STATES, getState } from "@/data/states";
import { getExamConfigsForState } from "@/data/examConfigs";
import { ArrowRight } from "lucide-react";

export function generateStaticParams() {
  return STATES.map((s) => ({ state: s.code }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ state: string }>;
}): Promise<Metadata> {
  const { state: code } = await params;
  const state = getState(code);
  if (!state) return {};
  return {
    title: `${state.hinglishName} Police Exams — Constable & SI`,
    description: `${state.hinglishName} Police Constable aur SI exams ki complete jaankari — syllabus, pattern, PYQ, mock test, state GK.`,
    alternates: { canonical: `/exams/${code}` },
  };
}

export default async function StateExamsPage({
  params,
}: {
  params: Promise<{ state: string }>;
}) {
  const { state: code } = await params;
  const state = getState(code);
  if (!state) notFound();
  const configs = getExamConfigsForState(state.code);

  return (
    <div className="container-page py-8">
      <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900">{state.hinglishName} Police Exams</h1>
      <p className="mt-1 text-sm text-gray-600">
        Rajdhani: {state.capital} · High Court: {state.highCourt} · {state.totalDistricts} jile
      </p>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {configs.map((cfg) => (
          <Link key={cfg.slug} href={`/${cfg.slug}`} className="card p-5 hover:shadow-md transition-shadow">
            <h2 className="text-lg font-bold text-gray-900">{cfg.title}</h2>
            <p className="mt-1 text-sm text-gray-600 line-clamp-2">{cfg.overview}</p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-navy">
              Dekhein <ArrowRight size={14} />
            </span>
          </Link>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href={`/state-gk/${state.code}`} className="btn-secondary bg-white px-4 py-2 text-sm">
          {state.hinglishName} State GK
        </Link>
        <Link href={`/physical-test/${state.code}`} className="btn-secondary bg-white px-4 py-2 text-sm">
          Physical Test
        </Link>
      </div>
    </div>
  );
}
