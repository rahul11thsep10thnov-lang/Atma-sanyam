import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentDestination, overview } from "@/lib/cms/pipeline/runner";
import { ReviewWaiter } from "@/components/admin/cms/ReviewWaiter";
import { PageHeader } from "@/components/admin/cms/ui";

export const metadata: Metadata = { title: "Admin — Review queue" };
export const dynamic = "force-dynamic";

/** Always opens the destination that is waiting for the admin; if it is still being prepared, waits for it. */
export default function ReviewQueuePage({ params }: { params: { locale: string } }) {
  const base = `/${params.locale}/admin/cms`;
  overview();
  const d = currentDestination();
  if (d && d.pipeline.stage === "AWAITING_APPROVAL") redirect(`${base}/destinations/${d.id}/images`);
  return (
    <div className="space-y-5">
      <PageHeader title="Review queue" intro="Opens the next destination whose image candidates are ready. Destinations are reviewed one at a time, in the order of the imported PDF." />
      <ReviewWaiter base={base} current={d ? { id: d.id, name: d.name, stage: d.pipeline.stage } : null} />
    </div>
  );
}
