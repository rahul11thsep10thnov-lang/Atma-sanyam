import type { Metadata } from "next";
import { CURRENT_AFFAIRS } from "@/data/currentAffairs";
import { STATES } from "@/data/states";
import DisclaimerBanner from "@/components/ui/DisclaimerBanner";
import Badge from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Current Affairs — Daily, Weekly, Monthly, State, Police",
  description: "Police exam ke liye daily, weekly, monthly, state-wise aur police/defence current affairs — simple Hinglish mein.",
  alternates: { canonical: "/current-affairs" },
};

const CATEGORY_LABELS: Record<string, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  state: "State",
  police: "Police / Defence",
};

export default function CurrentAffairsPage() {
  return (
    <div className="container-page py-8">
      <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900">Current Affairs</h1>
      <p className="mt-1 text-sm text-gray-600">Daily, Weekly, Monthly, State aur Police/Defence current affairs.</p>

      <div className="mt-4">
        <DisclaimerBanner>
          Current affairs items admin panel se verified source ke saath
          publish hote hain. Abhi neeche sirf sample/demo entries dikh rahi
          hain — asli daily updates admin dwara add ki jaayengi.
        </DisclaimerBanner>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {STATES.slice(0, 5).map((s) => (
          <span key={s.code} className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-600">
            {s.hinglishName}
          </span>
        ))}
        <span className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-600">+4 more states</span>
      </div>

      <div className="mt-6 space-y-4">
        {CURRENT_AFFAIRS.map((item) => (
          <div key={item.id} className="card p-4">
            <div className="flex items-center gap-2">
              <Badge tone="navy">{CATEGORY_LABELS[item.category]}</Badge>
              {item.state && <Badge tone="gray">{item.state.toUpperCase()}</Badge>}
              <span className="text-xs text-gray-400 ml-auto">{formatDate(item.date)}</span>
            </div>
            <h3 className="mt-2 text-sm font-bold text-gray-900">{item.title}</h3>
            <p className="mt-1 text-sm text-gray-600">{item.summary}</p>
            <p className="mt-2 text-[11px] text-gray-400">Source: {item.source}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
