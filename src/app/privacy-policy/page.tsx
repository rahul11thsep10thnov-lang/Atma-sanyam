import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "PoliceExams ki Privacy Policy — hum aapka data kaise collect aur use karte hain.",
  alternates: { canonical: "/privacy-policy" },
};

export default function PrivacyPolicyPage() {
  return (
    <div className="container-page py-10 max-w-2xl">
      <h1 className="text-2xl font-extrabold text-gray-900 mb-4">Privacy Policy</h1>
      <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
        <p>
          Hum aapki privacy ko seriously lete hain. Yeh policy batati hai ki
          PoliceExams aapka data kaise collect, use aur protect karta hai.
        </p>
        <h2 className="text-base font-bold text-gray-900 mt-4">Hum kya collect karte hain</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Account info: naam, mobile number ya Google email (login ke liye).</li>
          <li>Activity data: test attempts, scores, bookmarks, practice history — apki progress track karne ke liye.</li>
          <li>Anonymous usage analytics: most viewed pages, popular exams — platform improve karne ke liye.</li>
        </ul>
        <h2 className="text-base font-bold text-gray-900 mt-4">Hum kya nahi karte</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Hum aapka data kisi third party ko bechte nahi hain.</li>
          <li>Hum zaroorat se zyada personal information collect nahi karte.</li>
        </ul>
        <h2 className="text-base font-bold text-gray-900 mt-4">Aapke rights</h2>
        <p>
          Aap apna account aur uska data kabhi bhi delete karne ki request
          kar sakte hain — Contact page se humse connect karein.
        </p>
      </div>
    </div>
  );
}
