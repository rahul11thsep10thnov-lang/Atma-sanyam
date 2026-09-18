import type { Metadata } from "next";
import DisclaimerBanner from "@/components/ui/DisclaimerBanner";

export const metadata: Metadata = {
  title: "Disclaimer",
  description: "PoliceExams disclaimer — yeh ek independent educational platform hai, official website nahi.",
  alternates: { canonical: "/disclaimer" },
};

export default function DisclaimerPage() {
  return (
    <div className="container-page py-10 max-w-2xl">
      <h1 className="text-2xl font-extrabold text-gray-900 mb-4">Disclaimer</h1>

      <DisclaimerBanner>
        PoliceExams ek independent educational platform hai. Yeh kisi State
        Police Department, Police Recruitment Board ya Government Department
        ka official website nahi hai.
      </DisclaimerBanner>

      <div className="space-y-4 text-sm text-gray-700 leading-relaxed mt-5">
        <p>
          Is website par diya gaya content (syllabus, exam pattern,
          eligibility, physical standards, questions) educational aur
          reference purpose ke liye hai. Hum accuracy banaye rakhne ki poori
          koshish karte hain, lekin recruitment cycles ke hisaab se rules
          change hote rehte hain.
        </p>
        <p>
          Vacancy, application dates, exam dates, cut-off aur physical
          standards jaise cycle-specific facts ke liye, hamesha respective
          state ke official recruitment board ki website ko final source
          maanein.
        </p>
        <p>
          Sample/practice questions aur mock tests hamari khud ki admin-team
          dwara banaye gaye hain — yeh actual official question papers nahi
          hain aur copyright kiye gaye kisi bhi third-party content se copy
          nahi kiye gaye hain.
        </p>
      </div>
    </div>
  );
}
