import Link from "next/link";
import type { Metadata } from "next";
import { STATES } from "@/data/states";
import DisclaimerBanner from "@/components/ui/DisclaimerBanner";
import { Dumbbell } from "lucide-react";

export const metadata: Metadata = {
  title: "Physical Test — PET & PST, 9 States",
  description: "Police Constable aur SI ke liye state-wise Physical Efficiency Test (PET) aur Physical Standard Test (PST) details.",
  alternates: { canonical: "/physical-test" },
};

export default function PhysicalTestPage() {
  return (
    <div className="container-page py-8">
      <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900">Physical Test</h1>
      <p className="mt-1 text-sm text-gray-600">
        Height, chest, running aur physical efficiency standards — state-wise.
      </p>
      <div className="mt-4">
        <DisclaimerBanner>
          Har state ke physical standards alag hote hain — kabhi bhi ek
          state ke standards doosre state par apply na karein. Sabhi values
          indicative hain, official notification se verify karein.
        </DisclaimerBanner>
      </div>
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {STATES.map((s) => (
          <Link key={s.code} href={`/physical-test/${s.code}`} className="card p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 text-brand-navy">
              <Dumbbell size={16} />
            </div>
            <h3 className="mt-2 text-sm font-bold text-gray-900">{s.hinglishName} Physical Test</h3>
            <p className="mt-1 text-xs text-gray-500">Constable aur SI — PET/PST details</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
