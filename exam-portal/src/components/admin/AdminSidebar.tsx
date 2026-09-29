import Link from "next/link";
import type { AdminRole } from "@/generated/prisma/enums";

/**
 * Full admin CMS navigation (Section 15). Content types built through
 * Phase 10 (Jobs, Exams, Results, Admit Cards, Answer Keys, Syllabus,
 * Admissions, Scholarships, Articles) link to their real pages;
 * Organizations/Categories/States/Documents/Notifications/Users/
 * Settings/Audit Logs are still previews until their own phases (11+)
 * ship. `roles: undefined` means every admin role can see it.
 */
const NAV_SECTIONS: Array<{
  label: string;
  href?: string;
  roles?: AdminRole[];
}> = [
  { label: "Overview", href: "/admin" },
  { label: "Jobs", href: "/admin/jobs" },
  { label: "Exams", href: "/admin/exams" },
  { label: "Results", href: "/admin/results" },
  { label: "Admit Cards", href: "/admin/admit-cards" },
  { label: "Answer Keys", href: "/admin/answer-keys" },
  { label: "Syllabus", href: "/admin/syllabi" },
  { label: "Admissions", href: "/admin/admissions" },
  { label: "Scholarships", href: "/admin/scholarships" },
  { label: "Articles", href: "/admin/articles" },
  { label: "Organizations" },
  { label: "Categories" },
  { label: "States" },
  { label: "Documents" },
  { label: "Notifications" },
  { label: "Users", roles: ["SUPER_ADMIN"] },
  { label: "Settings", roles: ["SUPER_ADMIN"] },
  { label: "Audit Logs", roles: ["SUPER_ADMIN", "EDITOR"] },
];

export function AdminSidebar({ role }: { role: AdminRole }) {
  return (
    <nav className="flex w-56 shrink-0 flex-col gap-1 border-r border-slate-200 bg-white px-3 py-6">
      {NAV_SECTIONS.map((item) => {
        const visible = !item.roles || item.roles.includes(role);
        if (!visible) return null;

        if (!item.href) {
          return (
            <span
              key={item.label}
              className="cursor-default rounded-md px-3 py-2 text-sm text-slate-300"
              title="Coming in a later phase"
            >
              {item.label}
            </span>
          );
        }

        return (
          <Link
            key={item.label}
            href={item.href}
            className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
