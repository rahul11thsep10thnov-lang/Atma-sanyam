import Link from "next/link";

/** Primary navigation: large filled tabs in the Rahul Heading letterforms
 * (no bulbs, no ornaments). Styles: `.rahul-tab` in globals.css. */
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
    <nav aria-label="Primary" className="w-full px-4 pb-6 sm:px-8 lg:px-12">
      <div className="flex w-full flex-wrap justify-center gap-3 sm:gap-4">
        {CTA_ITEMS.map((item) => (
          <Link key={item.href} href={item.href} className="rahul-tab">
            <span className="rahul-tab-text">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
