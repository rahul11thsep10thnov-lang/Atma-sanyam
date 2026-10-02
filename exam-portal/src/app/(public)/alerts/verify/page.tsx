import type { Metadata } from "next";
import Link from "next/link";
import { verifySubscription } from "@/lib/alerts/subscriptions";

export const metadata: Metadata = { title: "Confirm alerts", robots: { index: false } };

export default async function VerifyAlertsPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const sub = token ? await verifySubscription(token) : null;
  const hi = sub?.locale === "hi";
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-16 text-center sm:px-6">
      {sub ? (
        <>
          <h1 className="text-2xl font-semibold text-slate-900">{hi ? "अलर्ट चालू हो गए ✓" : "Alerts switched on ✓"}</h1>
          <p className="text-sm text-slate-600">{hi ? `हम ${sub.email} पर सूचनाएँ भेजेंगे।` : `We will e-mail ${sub.email} whenever a matching official notice is published.`}</p>
          <Link href="/recruitments" className="text-sm text-brand-700 hover:underline">{hi ? "भर्तियाँ देखें →" : "Browse recruitments →"}</Link>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-semibold text-slate-900">Link not valid</h1>
          <p className="text-sm text-slate-600">This confirmation link is missing or has already been used.</p>
          <Link href="/alerts" className="text-sm text-brand-700 hover:underline">Subscribe again →</Link>
        </>
      )}
    </main>
  );
}
