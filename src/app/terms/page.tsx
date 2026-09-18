import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "PoliceExams website use karne ke terms aur conditions.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <div className="container-page py-10 max-w-2xl">
      <h1 className="text-2xl font-extrabold text-gray-900 mb-4">Terms of Use</h1>
      <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
        <p>PoliceExams use karke, aap in terms se sehmat hote hain:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Yeh platform sirf educational purpose ke liye hai — exam preparation practice ke liye.</li>
          <li>
            Content (questions, exam pattern, eligibility, etc.) reference ke
            liye hai. Recruitment-related final decisions ke liye hamesha
            official notification dekhein.
          </li>
          <li>Aap platform ka misuse (spam, scraping, cheating tools) nahi karenge.</li>
          <li>Hum content ko kabhi bhi update ya correct karne ka adhikar rakhte hain.</li>
          <li>Account create karte waqt aapko sahi jaankari deni hogi.</li>
        </ul>
        <p>
          Agar aapko in terms se koi asehmati hai, please platform use na
          karein aur humse Contact page se sampark karein.
        </p>
      </div>
    </div>
  );
}
