import type { Metadata } from "next";
import { getDb } from "@/lib/master/repo";
import { listImports } from "@/lib/cms/store";
import { PdfImport } from "@/components/admin/cms/PdfImport";
import { PageHeader } from "@/components/admin/cms/ui";

export const metadata: Metadata = { title: "Admin — Import PDF" };
export const dynamic = "force-dynamic";

export default function CmsImportPage({ params }: { params: { locale: string } }) {
  const base = `/${params.locale}/admin/cms`;
  const previous = listImports().map((r) => ({ id: r.id, file_name: r.file_name, uploaded_at: r.uploaded_at, candidates: r.candidates.length, confirmed_at: r.confirmed_at, created: r.created_ids.length }));
  return (
    <div className="space-y-5">
      <PageHeader title="Import destinations from a PDF" intro="Step 1 of the content pipeline. The PDF's text is read, place names are cleaned and de-duplicated, and you confirm the list before any record is created." />
      <PdfImport base={base} states={getDb().states.map((s) => s.name).sort()} previous={previous} />
    </div>
  );
}
