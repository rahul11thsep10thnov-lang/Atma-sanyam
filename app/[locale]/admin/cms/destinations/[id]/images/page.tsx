import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { bootstrapFromSeed } from "@/lib/cms/bootstrap";
import { getDestination } from "@/lib/cms/store";
import { ImageApproval } from "@/components/admin/cms/ImageApproval";
import { Crumbs, PageHeader } from "@/components/admin/cms/ui";

export const dynamic = "force-dynamic";

export function generateMetadata({ params }: { params: { id: string } }): Metadata {
  bootstrapFromSeed();
  const d = getDestination(params.id);
  return { title: d ? `Approve images — ${d.name}` : "Admin" };
}

export default function ImageApprovalPage({ params }: { params: { locale: string; id: string } }) {
  bootstrapFromSeed();
  const d = getDestination(params.id);
  if (!d) notFound();
  const base = `/${params.locale}/admin/cms`;
  return (
    <div className="space-y-4">
      <Crumbs items={[{ label: "Content", href: base }, { label: "Destinations", href: `${base}/destinations` }, { label: d.name, href: `${base}/destinations/${d.id}` }, { label: "Images" }]} />
      <PageHeader title={`Review images — ${d.name}${d.state ? `, ${d.state}` : ""}`} intro="Every attraction of this destination with its image candidates. Select 1–4 per attraction (and optionally a hero), then press FINALIZE once — the images are stored with their licence and credit, and the pipeline moves on to the next destination." />
      <ImageApproval initial={d} base={base} siteBase={`/${params.locale}`} />
    </div>
  );
}
