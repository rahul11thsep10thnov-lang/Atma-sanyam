import { NextResponse } from "next/server";
import { alertSubscribeSchema } from "@/lib/validation/alert";
import { createSubscription } from "@/lib/alerts/subscriptions";

/** POST /api/alerts/subscribe — JSON body per alertSubscribeSchema. Used by the Android app. */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = alertSubscribeSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })) }, { status: 400 });
  const r = await createSubscription(parsed.data);
  return NextResponse.json({ data: { id: r.subscription.id, verified: r.alreadyVerified, verificationSent: r.verificationSent } }, { status: 201 });
}
