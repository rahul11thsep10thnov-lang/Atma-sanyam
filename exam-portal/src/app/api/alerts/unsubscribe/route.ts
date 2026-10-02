import { NextResponse } from "next/server";
import { unsubscribe } from "@/lib/alerts/subscriptions";

/** POST /api/alerts/unsubscribe { token } (GET also accepted for mail clients). */
async function handle(token: string) {
  const sub = token ? await unsubscribe(token) : null;
  if (!sub) return NextResponse.json({ error: "Invalid token" }, { status: 404 });
  return NextResponse.json({ data: { id: sub.id, active: false } });
}
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { token?: string };
  return handle(String(body.token ?? ""));
}
export async function GET(request: Request) {
  return handle(new URL(request.url).searchParams.get("token") ?? "");
}
