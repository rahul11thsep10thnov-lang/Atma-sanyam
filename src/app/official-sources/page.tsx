import type { Metadata } from "next";
import { STATES } from "@/data/states";
import DisclaimerBanner from "@/components/ui/DisclaimerBanner";

export const metadata: Metadata = {
  title: "Official Sources",
  description: "Sabhi 9 states ke Police Recruitment Boards ke naam — official notification ke liye inhi boards ki website check karein.",
  alternates: { canonical: "/official-sources" },
};

export default function OfficialSourcesPage() {
  return (
    <div className="container-page py-10 max-w-2xl">
      <h1 className="text-2xl font-extrabold text-gray-900 mb-4">Official Sources</h1>
      <p className="text-sm text-gray-600 mb-4">
        Recruitment-related sabhi final information (notification, vacancy,
        dates, admit card, result) ke liye apne state ke recruitment board
        ki official website hi check karein.
      </p>
      <DisclaimerBanner>
        Hum yahan direct links nahi de rahe (URLs badal sakti hain) —
        respective board ka naam search karke unki official website dhoondein.
      </DisclaimerBanner>
      <div className="mt-5 space-y-2">
        {STATES.map((s) => (
          <div key={s.code} className="card p-3.5 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-800">{s.hinglishName} Police</span>
            <span className="text-xs text-gray-500">{s.policeBoardName}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
