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
      <PageHeader title={`Approve images — ${d.name}`} intro="All attractions of this destination on one screen. Tick 1–4 images per attraction, optionally mark one as the hero, then press “Approve all selected images” once. Only images with a recorded licence are listed; the credit and licence shown is what the page will print." />
      <ImageApproval initial={d} base={base} />
    </div>
  );
}
