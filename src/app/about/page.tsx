import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us",
  description: "PoliceExams ke baare me jaanein — hamara mission aur yeh platform kaise kaam karta hai.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <div className="container-page py-10 max-w-2xl prose-sm">
      <h1 className="text-2xl font-extrabold text-gray-900 mb-4">About PoliceExams</h1>
      <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
        <p>
          PoliceExams ek independent educational platform hai jo specifically
          9 states — UP, MP, Rajasthan, Bihar, Jharkhand, Uttarakhand,
          Haryana, Punjab aur Chhattisgarh — ke Police Constable aur
          Sub-Inspector (SI) exams ki taiyari ke liye banaya gaya hai.
        </p>
        <p>
          Hamara mission simple hai: har aspirant ko ek hi jagah simple,
          smart aur state-wise preparation material milna chahiye — syllabus,
          exam pattern, previous year questions, mock tests, state GK aur
          study notes, sab Hinglish mein taaki samajhna aasan ho.
        </p>
        <p>
          Hum kisi bhi State Police Department, Recruitment Board ya
          Government Department se affiliated nahi hain. Sabhi
          recruitment-related information (vacancy, dates, cut-off) ke liye
          official notification hi final source hai.
        </p>
      </div>
    </div>
  );
}
