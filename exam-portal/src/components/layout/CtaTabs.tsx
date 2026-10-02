import Link from "next/link";

/** The site's primary navigation, as animated call-to-action tabs
 * (styles: `.cta-button` in globals.css). */
export const CTA_ITEMS: Array<{ label: string; href: string }> = [
  { label: "Jobs", href: "/jobs" },
  { label: "Results", href: "/results" },
  { label: "Admit Cards", href: "/admit-card" },
  { label: "Answer Keys", href: "/answer-key" },
  { label: "Syllabus", href: "/syllabus" },
  { label: "Admissions", href: "/admission" },
];

export function CtaTabs() {
  return (
    <nav aria-label="Primary" className="border-b border-slate-200">
      <div className="mx-auto flex max-w-6xl flex-wrap justify-center gap-3 px-4 py-4 sm:justify-start sm:px-6">
        {CTA_ITEMS.map((item) => (
          <Link key={item.href} href={item.href} className="cta-button">
            <span>{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
