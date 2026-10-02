import { NextResponse } from "next/server";
import { verifySubscription } from "@/lib/alerts/subscriptions";

/** GET /api/alerts/verify?token=… */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const sub = token ? await verifySubscription(token) : null;
  if (!sub) return NextResponse.json({ error: "Invalid token" }, { status: 404 });
  return NextResponse.json({ data: { id: sub.id, verified: true } });
}
