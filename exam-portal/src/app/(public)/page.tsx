import type { Metadata } from "next";
import { AdSlot } from "@/components/ads/AdSlot";
import { AppPromo } from "@/components/AppPromo";
import { getCurrentUser, isMember } from "@/lib/users/session";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

/** The home page is the shell itself — search bar and tabs live in the
 * public layout; the "latest …" sections were removed by request. */
export default async function HomePage() {
  const member = isMember(await getCurrentUser());
  return (
    <main className="flex w-full flex-col gap-6 px-4 pb-10 sm:px-8 lg:px-12">
      <h1 className="sr-only">SarkariChayan — government jobs, results, admit cards and answer keys</h1>
      <AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_HOME} hidden={member} />
      <AppPromo />
    </main>
  );
}
