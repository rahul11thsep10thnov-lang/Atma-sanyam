import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { STATES, getState } from "@/data/states";
import { getExamConfigsForState } from "@/data/examConfigs";
import DisclaimerBanner from "@/components/ui/DisclaimerBanner";

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
    title: `${state.hinglishName} Police Physical Test — PET & PST`,
    description: `${state.hinglishName} Police Constable aur SI ke Physical Efficiency Test aur Physical Standard Test details.`,
    alternates: { canonical: `/physical-test/${code}` },
  };
}

export default async function PhysicalTestStatePage({
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
      <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900">{state.hinglishName} Physical Test</h1>
      <p className="mt-1 text-sm text-gray-600">Constable aur SI ke Physical Standard aur Efficiency Test details.</p>

      <div className="mt-4">
        <DisclaimerBanner>
          Ye values indicative hain — official notification se verify
          karein. Medical requirements bhi official document me hi final
          hote hain.
        </DisclaimerBanner>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-5">
        {configs.map((cfg) => (
          <div key={cfg.slug} className="card p-4">
            <h2 className="text-base font-bold text-gray-900 mb-3">{cfg.title}</h2>

            <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Physical Standard Test (PST)</h3>
            <table className="w-full text-sm mb-4">
              <thead>
                <tr className="text-left text-gray-500 text-xs">
                  <th className="py-1.5 pr-3">Category</th>
                  <th className="py-1.5 pr-3">Height</th>
                  <th className="py-1.5 pr-3">Chest</th>
                </tr>
              </thead>
              <tbody>
                {cfg.physicalStandards.map((p) => (
                  <tr key={p.category} className="border-t border-gray-100">
                    <td className="py-1.5 pr-3 font-medium text-gray-800">{p.category}</td>
                    <td className="py-1.5 pr-3 text-gray-600">{p.height ?? "—"}</td>
                    <td className="py-1.5 pr-3 text-gray-600">{p.chest ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Physical Efficiency Test (PET)</h3>
            <ul className="space-y-1.5 text-sm text-gray-700 mb-4">
              {cfg.physicalEfficiency.map((e) => (
                <li key={e.event} className="flex justify-between">
                  <span>{e.event}</span>
                  <span className="font-medium">{e.standard}</span>
                </li>
              ))}
            </ul>

            <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Medical Requirements</h3>
            <p className="text-sm text-gray-600">{cfg.medicalRequirements}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
