import Link from "next/link";
import { SITE_NAME } from "@/lib/siteConfig";
import { CTA_ITEMS } from "@/components/layout/CtaTabs";

// Sections not in the CTA tabs still need a way in from every page.
const SECONDARY_LINKS = [
  { label: "Scholarships", href: "/scholarship" },
  { label: "Articles", href: "/articles" },
  { label: "Alerts", href: "/alerts" },
];

export function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-slate-500 sm:px-6">
        <p className="font-heading text-base font-semibold text-slate-700">{SITE_NAME}</p>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-4 gap-y-1">
          {[...CTA_ITEMS, ...SECONDARY_LINKS].map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-slate-900 hover:underline">
              {link.label}
            </Link>
          ))}
        </nav>
        <p className="max-w-2xl">
          An independent, unofficial information portal for Indian
          government examinations, jobs, results, admit cards, and answer
          keys. Always verify details against the official notification
          and the organization&apos;s own website before applying.
        </p>
        <p className="text-xs text-slate-400">
          © {new Date().getFullYear()} {SITE_NAME}. Not affiliated with any
          government body.
        </p>
      </div>
    </footer>
  );
}
