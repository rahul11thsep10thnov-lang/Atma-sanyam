import Link from "next/link";
import { STATES } from "@/data/states";

const SECTIONS = [
  {
    label: "Practice",
    links: [
      { label: "PYQ Bank", href: "/pyq" },
      { label: "Mock Tests", href: "/mock-test" },
      { label: "Subject-wise Practice", href: "/practice" },
      { label: "Aaj ka Quiz", href: "/daily-quiz" },
    ],
  },
  {
    label: "Learn",
    links: [
      { label: "State GK", href: "/state-gk" },
      { label: "Study Notes", href: "/study-notes" },
      { label: "Smart Tricks", href: "/tricks" },
      { label: "Current Affairs", href: "/current-affairs" },
      { label: "Physical Test", href: "/physical-test" },
    ],
  },
  {
    label: "Exams",
    links: STATES.slice(0, 6).map((s) => ({ label: `${s.hinglishName} Police`, href: `/exams/${s.code}` })),
  },
];

const LEGAL = [
  { label: "About Us", href: "/about" },
  { label: "Contact Us", href: "/contact" },
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Terms & Conditions", href: "/terms" },
  { label: "Disclaimer", href: "/disclaimer" },
  { label: "Report an Error", href: "/report-error" },
];

export default function Footer() {
  return (
    <footer className="mt-10 bg-[#1b202c] text-slate-400">
      <div className="container-page py-10">
        <p className="font-display text-3xl font-extrabold">
          <span className="text-white">Police</span>
          <span className="text-brand-orange">Exams</span>
        </p>
        <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-slate-400">
          Police Constable &amp; SI ki taiyari ke liye independent platform —
          state-wise PYQ, mock tests, State GK aur smart tricks, sab Hinglish
          mein.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-3">
          {SECTIONS.map((s) => (
            <div key={s.label}>
              <p className="eyebrow text-slate-400">{s.label}</p>
              <ul className="mt-4 space-y-3">
                {s.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-[15px] text-slate-400 hover:text-white">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 border-t border-white/10 pt-6">
          <nav className="flex flex-wrap justify-center gap-x-8 gap-y-3 text-[15px] text-slate-300">
            {LEGAL.map((l) => (
              <Link key={l.href} href={l.href} className="hover:text-white">
                {l.label}
              </Link>
            ))}
          </nav>
          <p className="mx-auto mt-6 max-w-2xl text-center text-xs leading-relaxed text-slate-500">
            PoliceExams ek independent educational platform hai. Yeh kisi State
            Police Department, Police Recruitment Board ya Government Department
            ka official website nahi hai. Recruitment-related information ke liye
            official notification ko final source maana jaaye.
          </p>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/15 pt-6 text-[15px]">
          <p>© {new Date().getFullYear()} PoliceExams. All rights reserved.</p>
          <p className="text-brand-orange">Made with ❤️ for Police Aspirants</p>
        </div>
      </div>
    </footer>
  );
}
