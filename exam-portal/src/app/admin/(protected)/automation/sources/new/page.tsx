import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/session";
import { listOrganizations } from "@/lib/services/lookups";
import { SourceForm } from "../SourceForm";
import { createSourceAction } from "../actions";

export const metadata: Metadata = { title: "New Source" };

export default async function NewSourcePage() {
  await requireAdmin(["SUPER_ADMIN", "EDITOR"]);
  const organizations = await listOrganizations();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-slate-900">New Source</h1>
      <p className="max-w-2xl text-sm text-slate-600">
        Point at an official notice board, recruitment page, RSS feed or API.
        Third-party aggregators can be added for discovery, but prefer the
        organization&apos;s own domain — source authority feeds into publish
        confidence.
      </p>
      <SourceForm action={createSourceAction} organizations={organizations} submitLabel="Add source" />
    </div>
  );
}
