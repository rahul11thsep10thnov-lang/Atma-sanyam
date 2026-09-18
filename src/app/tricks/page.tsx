import type { Metadata } from "next";
import { Lightbulb } from "lucide-react";

export const metadata: Metadata = {
  title: "Police Exam Smart Tricks",
  description: "Maths shortcuts, reasoning shortcuts, memory tricks aur exam-time strategy — Police exam ke liye realistic, practical tips.",
  alternates: { canonical: "/tricks" },
};

const TRICK_SECTIONS = [
  {
    title: "Maths Shortcuts",
    tips: [
      "Percentage ko fraction me convert karke yaad rakhein: 50%=1/2, 25%=1/4, 20%=1/5, 12.5%=1/8 — calculation fast hoti hai.",
      "Profit-Loss questions me hamesha Cost Price ko base (100) maan kar percentage nikalein.",
      "Average nikalne ke liye 'sum ÷ count' formula practice se itna pakka karein ki bina soche apply ho jaaye.",
    ],
  },
  {
    title: "Reasoning Shortcuts",
    tips: [
      "Coding-Decoding me alphabet ki position (A=1...Z=26) yaad rakhein — kaafi patterns isi par based hote hain.",
      "Blood Relation questions ko hamesha ek family tree diagram bana kar solve karein, dimag me mat rakhein.",
      "Direction Sense me shuru se hi ek chhota sa rough diagram banayein — confusion kaafi kam ho jaata hai.",
    ],
  },
  {
    title: "Memory Tricks",
    tips: [
      "Lists (rivers, national parks, dances) yaad karne ke liye pehla letter jodkar ek funny sentence banayein (mnemonic).",
      "Naye facts ko purane pata facts se link karein — jaise naya river yaad karte waqt uske state ki capital bhi revise ho jaaye.",
      "Spaced repetition use karein: aaj padha hua topic 1 din, 3 din aur 7 din baad dobara revise karein.",
    ],
  },
  {
    title: "GK & State GK Revision Tricks",
    tips: [
      "Har state ke liye ek 1-page 'cheat sheet' banayein: capital, districts, rivers, parks, dances.",
      "Static GK ko current affairs se connect karein — jaise koi news kisi historical fact se related ho to dono saath revise karein.",
      "Daily Quiz roz khelein — chhoti-chhoti repetition se long-term memory banti hai.",
    ],
  },
  {
    title: "Exam-Time Strategy",
    tips: [
      "Pehle wo questions solve karein jo aapko sabse confident lagte hain — time waste kam hota hai.",
      "Agar koi question 30-40 second me clear na ho, use 'Mark for Review' karke aage badhein.",
      "Agar negative marking hai to sirf tab hi answer dein jab kam se kam 2 options eliminate kar chuke hon.",
    ],
  },
];

export default function TricksPage() {
  return (
    <div className="container-page py-8 max-w-2xl">
      <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900">Police Exam Smart Tricks</h1>
      <p className="mt-1 text-sm text-gray-600 mb-6">
        Realistic, practical tips — koi &quot;100% selection guarantee&quot; wali
        baatein nahi, sirf mehnat ko smart banane ke tareeke.
      </p>

      <div className="space-y-5">
        {TRICK_SECTIONS.map((section) => (
          <div key={section.title} className="card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb size={18} className="text-brand-gold" />
              <h2 className="text-sm font-bold text-gray-900">{section.title}</h2>
            </div>
            <ul className="space-y-2">
              {section.tips.map((tip, i) => (
                <li key={i} className="text-sm text-gray-700 leading-relaxed flex gap-2">
                  <span className="text-brand-navy font-bold">•</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
