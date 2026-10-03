import type { Metadata } from "next";
import Link from "next/link";
import { getSettings } from "@/lib/cms/store";
import { SettingsForm } from "@/components/admin/cms/SettingsForm";
import { PageHeader } from "@/components/admin/cms/ui";

export const metadata: Metadata = { title: "Admin — Settings" };
export const dynamic = "force-dynamic";

export default function CmsSettingsPage({ params }: { params: { locale: string } }) {
  return (
    <div className="space-y-5">
      <PageHeader title="Global settings" intro="Site identity, default SEO, contact and footer details, and how the content pipeline behaves." />
      <p className="text-sm text-charcoal-light">API keys and image sources are managed under <Link href={`/${params.locale}/admin/cms/providers`} className="font-medium text-forest-700 underline">Image Providers</Link>.</p>
      <SettingsForm initial={getSettings()} />
    </div>
  );
}
