import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Access denied — Exam Portal",
  robots: { index: false, follow: false },
};

export default function AdminForbiddenPage() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-4 text-center">
      <h1 className="text-xl font-semibold text-slate-900">Access denied</h1>
      <p className="max-w-sm text-sm text-slate-600">
        Your admin account doesn&apos;t have permission to view this page.
        Contact a Super Admin if you believe this is a mistake.
      </p>
      <Link
        href="/admin"
        className="mt-2 text-sm font-medium text-slate-900 underline underline-offset-2"
      >
        Back to the admin overview
      </Link>
    </main>
  );
}
