import { prisma } from "@/lib/db/client";

/**
 * Snapshots a record before it's overwritten (Section 21A Step 16):
 * updating an already-published notification never silently loses the
 * previous version — call this with the pre-update row right before
 * applying an update to a record whose `status` is currently PUBLISHED.
 *
 * `snapshot` takes the raw Prisma row (Date objects, Decimal, etc. and
 * all) — this function is the one place that round-trips it through
 * JSON so every content-type service can just pass the row it already
 * has, instead of each one remembering to serialize it first.
 */
export async function snapshotContentVersion(entry: {
  contentType: string;
  contentId: string;
  snapshot: unknown;
  createdBy: string;
  changeSummary?: string;
}) {
  const last = await prisma.contentVersion.findFirst({
    where: { contentType: entry.contentType, contentId: entry.contentId },
    orderBy: { versionNumber: "desc" },
    select: { versionNumber: true },
  });
  await prisma.contentVersion.create({
    data: {
      contentType: entry.contentType,
      contentId: entry.contentId,
      versionNumber: (last?.versionNumber ?? 0) + 1,
      snapshot: JSON.parse(JSON.stringify(entry.snapshot)),
      createdBy: entry.createdBy,
      changeSummary: entry.changeSummary,
    },
  });
}
