import type { Metadata } from "next";
import { ADAPTERS, providerReady } from "@/lib/cms/discovery";
import { secretStatus, type SecretName } from "@/lib/cms/secrets";
import { getSettings } from "@/lib/cms/store";
import { IMAGE_PROVIDERS, PROVIDER_LABEL } from "@/lib/cms/types";
import { ProvidersForm } from "@/components/admin/cms/ProvidersForm";
import { PageHeader } from "@/components/admin/cms/ui";

export const metadata: Metadata = { title: "Admin — Image Providers" };
export const dynamic = "force-dynamic";

export default function ImageProvidersPage() {
  const s = getSettings();
  const providers = IMAGE_PROVIDERS.map((id) => ({
    id,
    label: PROVIDER_LABEL[id],
    enabled: Boolean(s.image_providers[id]?.enabled),
    needs_key: ADAPTERS[id].needsKey,
    key: ADAPTERS[id].needsKey ? secretStatus(id as SecretName) : null,
    ready: providerReady(id, s)
  }));
  return (
    <div className="space-y-5">
      <PageHeader title="Image Providers" intro="Where the image discovery service looks for candidate photographs. Each provider is used only through its official API, from the server. Keys are write-only: once saved they are never shown again, only whether one is configured." />
      <ProvidersForm initial={{ providers, google_places: secretStatus("google_places"), contact_email: s.contact_email }} />
    </div>
  );
}
