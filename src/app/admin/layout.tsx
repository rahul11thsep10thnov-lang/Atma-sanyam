import Link from "next/link";
import { Shield, LayoutDashboard, ListChecks, Flag, BarChart3 } from "lucide-react";

const ADMIN_NAV = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Questions", href: "/admin/questions", icon: ListChecks },
  { label: "Reports", href: "/admin/reports", icon: Flag },
  { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="container-page py-6">
      <div className="flex items-center gap-2 mb-6">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-navy text-white">
          <Shield size={16} />
        </span>
        <h1 className="text-lg font-extrabold text-gray-900">Admin Panel</h1>
      </div>

      <div className="flex gap-2 overflow-x-auto mb-6 border-b border-gray-200 pb-px">
        {ADMIN_NAV.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-1.5 whitespace-nowrap rounded-t-md px-3.5 py-2.5 text-sm font-semibold text-gray-600 hover:text-brand-navy border-b-2 border-transparent hover:border-brand-navy"
            >
              <Icon size={15} />
              {item.label}
            </Link>
          );
        })}
      </div>

      {children}
    </div>
  );
}
