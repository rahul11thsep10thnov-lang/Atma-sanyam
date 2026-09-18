import Link from "next/link";
import { Shield } from "lucide-react";

const LINKS = [
  { label: "About PoliceExams", href: "/about" },
  { label: "Contact", href: "/contact" },
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Terms", href: "/terms" },
  { label: "Disclaimer", href: "/disclaimer" },
  { label: "Report an Error", href: "/report-error" },
  { label: "Official Sources", href: "/official-sources" },
];

export default function Footer() {
  return (
    <footer className="mt-12 border-t border-[var(--card-border)] bg-white">
      <div className="container-page py-10">
        <div className="flex items-center gap-2 mb-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-navy text-white">
            <Shield size={16} />
          </span>
          <span className="text-base font-extrabold text-brand-navy">
            POLICE<span className="text-brand-gold">EXAMS</span>
          </span>
        </div>

        <p className="max-w-2xl text-sm text-gray-600 leading-relaxed">
          PoliceExams ek independent educational platform hai. Yeh kisi State
          Police Department, Police Recruitment Board ya Government
          Department ka official website nahi hai. Recruitment-related
          information ke liye official notification ko final source maana
          jaaye.
        </p>

        <nav className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-brand-navy">
              {l.label}
            </Link>
          ))}
        </nav>

        <p className="mt-6 text-xs text-gray-400">
          © {new Date().getFullYear()} PoliceExams. Sabhi adhikar surakshit.
        </p>
      </div>
    </footer>
  );
}
