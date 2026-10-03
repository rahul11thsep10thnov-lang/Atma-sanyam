import type { Metadata } from "next";
import { getDb } from "@/lib/master/repo";
import { NewDestination } from "@/components/admin/cms/NewDestination";
import { Crumbs, PageHeader } from "@/components/admin/cms/ui";

export const metadata: Metadata = { title: "Admin — New destination" };
export const dynamic = "force-dynamic";

export default function NewCmsDestinationPage({ params }: { params: { locale: string } }) {
  const base = `/${params.locale}/admin/cms`;
  return (
    <div className="space-y-5">
      <Crumbs items={[{ label: "Content", href: base }, { label: "Destinations", href: `${base}/destinations` }, { label: "New" }]} />
      <PageHeader title="New destination" intro="Creates a DRAFT record. Nothing is public until you publish it." />
      <NewDestination base={base} states={getDb().states.map((s) => s.name).sort()} />
    </div>
  );
}
