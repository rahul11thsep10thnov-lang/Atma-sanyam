import type { Metadata } from "next";
import Link from "next/link";
import { getDb } from "@/lib/master/repo";
import { adminRows } from "@/lib/cms/admin";
import { DestinationsTable } from "@/components/admin/cms/DestinationsTable";
import { PageHeader } from "@/components/admin/cms/ui";
import { btnPrimary, btnSecondary } from "@/components/admin/cms/shared";

export const metadata: Metadata = { title: "Admin — Destinations" };
export const dynamic = "force-dynamic";

export default function CmsDestinationsPage({ params }: { params: { locale: string } }) {
  const base = `/${params.locale}/admin/cms`;
  const states = getDb().states.map((s) => s.name).sort();
  return (
    <div className="space-y-5">
      <PageHeader title="Destinations" intro="One row per destination record. Edit, preview, publish, duplicate or archive a single destination, or tick several and apply a bulk change." actions={<><Link href={`${base}/import`} className={btnSecondary}>Import PDF</Link><Link href={`${base}/destinations/new`} className={btnPrimary}>+ New destination</Link></>} />
      <DestinationsTable rows={adminRows()} base={base} states={states} />
    </div>
  );
}
