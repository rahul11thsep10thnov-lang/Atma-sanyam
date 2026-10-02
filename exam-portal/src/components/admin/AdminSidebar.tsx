import Link from "next/link";
import type { AdminRole } from "@/generated/prisma/enums";

/**
 * Automation-first admin navigation (spec §18): what the pipeline found
 * comes first, the catalogue it maintains second, hand-edited content
 * third, system pages last. `roles: undefined` = every admin role.
 */
type NavItem = { label: string; href?: string; roles?: AdminRole[] };
type NavGroup = { heading: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    heading: "Automation",
    items: [
      { label: "Overview", href: "/admin/automation" },
      { label: "Inbox", href: "/admin/automation/inbox" },
      { label: "Review queue", href: "/admin/automation/review" },
      { label: "Pipeline runs", href: "/admin/automation/pipeline" },
      { label: "Failed items", href: "/admin/automation/failed" },
      { label: "Duplicates", href: "/admin/automation/duplicates" },
      { label: "Sources", href: "/admin/automation/sources", roles: ["SUPER_ADMIN", "EDITOR"] },
    ],
  },
  {
    heading: "Catalogue",
    items: [
      { label: "Organizations", href: "/admin/organizations" },
      { label: "Categories", href: "/admin/categories" },
      { label: "Exams", href: "/admin/exams" },
      { label: "Recruitments", href: "/admin/recruitments" },
    ],
  },
  {
    heading: "Content",
    items: [
      { label: "Jobs", href: "/admin/jobs" },
      { label: "Results", href: "/admin/results" },
      { label: "Admit Cards", href: "/admin/admit-cards" },
      { label: "Answer Keys", href: "/admin/answer-keys" },
      { label: "Syllabus", href: "/admin/syllabi" },
      { label: "Admissions", href: "/admin/admissions" },
      { label: "Scholarships", href: "/admin/scholarships" },
      { label: "Articles", href: "/admin/articles" },
      { label: "Documents", href: "/admin/documents" },
    ],
  },
  {
    heading: "System",
    items: [
      { label: "Dashboard", href: "/admin" },
      { label: "Notifications", href: "/admin/notifications" },
      { label: "Analytics", href: "/admin/analytics" },
      { label: "Users", roles: ["SUPER_ADMIN"] },
      { label: "Settings", roles: ["SUPER_ADMIN"] },
      { label: "Audit Logs", roles: ["SUPER_ADMIN", "EDITOR"] },
    ],
  },
];

export function AdminSidebar({ role }: { role: AdminRole }) {
  return (
    <nav className="flex w-56 shrink-0 flex-col gap-4 border-r border-slate-200 bg-white px-3 py-6" aria-label="Admin">
      {NAV_GROUPS.map((group) => (
        <div key={group.heading} className="flex flex-col gap-0.5">
          <div className="px-3 pb-1 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">{group.heading}</div>
          {group.items.map((item) => {
            if (item.roles && !item.roles.includes(role)) return null;
            if (!item.href) {
              return (
                <span key={item.label} className="cursor-default rounded-md px-3 py-1.5 text-sm text-slate-300" title="Coming in a later phase">
                  {item.label}
                </span>
              );
            }
            return (
              <Link key={item.label} href={item.href} className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100">
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
