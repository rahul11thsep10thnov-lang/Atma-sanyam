import type { Metadata } from "next";
import { overview } from "@/lib/cms/pipeline/runner";
import { PipelineDashboard } from "@/components/admin/cms/PipelineDashboard";
import { PageHeader } from "@/components/admin/cms/ui";

export const metadata: Metadata = { title: "Admin — Pipeline" };
export const dynamic = "force-dynamic";

export default function CmsPipelinePage({ params }: { params: { locale: string } }) {
  const base = `/${params.locale}/admin/cms`;
  return (
    <div className="space-y-5">
      <PageHeader title="Content pipeline" intro="Research → attractions → image candidates → your image approval → finalise → your publish decision, for one destination at a time. A failure stops at that destination and resumes there after you retry." />
      <PipelineDashboard initial={overview()} base={base} />
    </div>
  );
}
