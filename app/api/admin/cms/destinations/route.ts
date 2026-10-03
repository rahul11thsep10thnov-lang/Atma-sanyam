import { NextRequest } from "next/server";
import { authorizeAdmin } from "@/lib/auth/admin";
import { badRequest, json } from "@/lib/api/http";
import { adminRows, createDestination } from "@/lib/cms/admin";

export const dynamic = "force-dynamic";

/** GET /api/admin/cms/destinations — compact rows for the admin table. */
export async function GET(request: NextRequest) {
  const denied = await authorizeAdmin(request);
  if (denied) return denied;
  return json({ rows: adminRows() });
}

/** POST /api/admin/cms/destinations — { name, state? } creates a DRAFT destination. */
export async function POST(request: NextRequest) {
  const denied = await authorizeAdmin(request);
  if (denied) return denied;
  let body: { name?: unknown; state?: unknown };
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }
  if (typeof body.name !== "string" || body.name.trim().length < 2) return badRequest("name is required");
  const doc = createDestination(body.name, typeof body.state === "string" ? body.state : null);
  return json({ destination: doc }, { status: 201 });
}
