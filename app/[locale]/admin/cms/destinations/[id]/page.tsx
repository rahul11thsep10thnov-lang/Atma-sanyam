import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/master/repo";
import { bootstrapFromSeed } from "@/lib/cms/bootstrap";
import { getDestination } from "@/lib/cms/store";
import { DestinationEditor } from "@/components/admin/cms/DestinationEditor";
import { Crumbs } from "@/components/admin/cms/ui";

export const dynamic = "force-dynamic";

export function generateMetadata({ params }: { params: { id: string } }): Metadata {
  bootstrapFromSeed();
  const d = getDestination(params.id);
  return { title: d ? `Edit — ${d.name}` : "Admin" };
}

export default function EditCmsDestinationPage({ params }: { params: { locale: string; id: string } }) {
  bootstrapFromSeed();
  const d = getDestination(params.id);
  if (!d) notFound();
  const base = `/${params.locale}/admin/cms`;
  return (
    <div>
      <Crumbs items={[{ label: "Content", href: base }, { label: "Destinations", href: `${base}/destinations` }, { label: d.name }]} />
      <DestinationEditor initial={d} base={base} siteBase={`/${params.locale}`} states={getDb().states.map((s) => s.name).sort()} />
    </div>
  );
}
