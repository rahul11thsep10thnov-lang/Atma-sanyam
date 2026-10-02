import type { Metadata } from "next";
import Link from "next/link";
import { unsubscribe } from "@/lib/alerts/subscriptions";

export const metadata: Metadata = { title: "Unsubscribe", robots: { index: false } };

export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const sub = token ? await unsubscribe(token) : null;
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-16 text-center sm:px-6">
      <h1 className="text-2xl font-semibold text-slate-900">{sub ? (sub.locale === "hi" ? "अलर्ट बंद कर दिए गए" : "You are unsubscribed") : "Link not valid"}</h1>
      <p className="text-sm text-slate-600">{sub ? (sub.locale === "hi" ? `${sub.email} पर अब इस विषय के अलर्ट नहीं आएँगे।` : `${sub.email} will no longer receive alerts for this subscription.`) : "This unsubscribe link is missing or expired."}</p>
      <Link href="/alerts" className="text-sm text-brand-700 hover:underline">Manage alerts →</Link>
    </main>
  );
}
