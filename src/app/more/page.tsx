import Link from "next/link";
import type { Metadata } from "next";
import { MORE_NAV } from "@/lib/nav";

export const metadata: Metadata = {
  title: "More",
  description: "PoliceExams ke sabhi sections — PYQ, State GK, Daily Quiz, Current Affairs, Physical Test aur zyada.",
};

export default function MorePage() {
  return (
    <div className="container-page py-8 max-w-md">
      <h1 className="text-2xl font-extrabold text-gray-900 mb-5">More</h1>
      <div className="space-y-1.5">
        {MORE_NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="card p-4 flex items-center justify-between hover:shadow-md transition-shadow block"
          >
            <span className="text-sm font-medium text-gray-800">{item.label}</span>
            <span className="text-gray-400">→</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
