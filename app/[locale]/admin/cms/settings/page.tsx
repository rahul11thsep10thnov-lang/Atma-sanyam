import type { Metadata } from "next";
import { getSettings } from "@/lib/cms/store";
import { SettingsForm } from "@/components/admin/cms/SettingsForm";
import { PageHeader } from "@/components/admin/cms/ui";

export const metadata: Metadata = { title: "Admin — Settings" };
export const dynamic = "force-dynamic";

const mask = (v: string | null) => (v ? `${"•".repeat(8)}${v.slice(-4)}` : null);

export default function CmsSettingsPage() {
  const s = getSettings();
  const masked = { ...s, google_places_api_key: mask(s.google_places_api_key), unsplash_access_key: mask(s.unsplash_access_key), pexels_api_key: mask(s.pexels_api_key), pixabay_api_key: mask(s.pixabay_api_key) };
  const envKeys = { google_places: Boolean(process.env.GOOGLE_PLACES_API_KEY), unsplash: Boolean(process.env.UNSPLASH_ACCESS_KEY), pexels: Boolean(process.env.PEXELS_API_KEY), pixabay: Boolean(process.env.PIXABAY_API_KEY) };
  return (
    <div className="space-y-5">
      <PageHeader title="Global settings" intro="Site identity, default SEO, contact and footer details, the rating source and the image sources the pipeline may use." />
      <SettingsForm initial={masked} envKeys={envKeys} />
    </div>
  );
}
