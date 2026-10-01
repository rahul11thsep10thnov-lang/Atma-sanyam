import { NextResponse } from "next/server";
import { listWebsiteNotifications } from "@/lib/services/notifications";

/**
 * GET /api/notifications — public feed of sent notifications (Section
 * 28/30), newest first. An Android client polls this for a "what's new"
 * screen; no admin fields (deliveries, per-channel status) are exposed.
 */
export async function GET(request: Request) {
  const limitParam = Number(new URL(request.url).searchParams.get("limit"));
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 50) : 20;
  const notifications = await listWebsiteNotifications(limit);
  return NextResponse.json({ data: notifications });
}
