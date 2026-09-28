import Link from "next/link";
import type { AdminRole } from "@/generated/prisma/enums";

/**
 * Full admin CMS navigation (Section 15). Only "Overview" has a working
 * page in this phase — every other section is listed with its intended
 * role restriction so the nav honestly previews the target shape of the
 * CMS without linking to pages that don't exist yet (they arrive in
 * Phases 5–17). `roles: undefined` means every admin role can see it.
 */
const NAV_SECTIONS: Array<{
  label: string;
  href?: string;
  roles?: AdminRole[];
}> = [
  { label: "Overview", href: "/admin" },
  { label: "Jobs", href: "/admin/jobs" },
  { label: "Exams", href: "/admin/exams" },
  { label: "Results" },
  { label: "Admit Cards" },
  { label: "Answer Keys" },
  { label: "Syllabus" },
  { label: "Admissions" },
  { label: "Scholarships" },
  { label: "Articles" },
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
