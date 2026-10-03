import { NextRequest } from "next/server";
import { authorizeAdmin } from "@/lib/auth/admin";
import { badRequest, json, notFound } from "@/lib/api/http";
import { sanitiseDestination } from "@/lib/cms/admin";
import { bootstrapFromSeed } from "@/lib/cms/bootstrap";
import { deleteDestination, getDestination, saveDestination } from "@/lib/cms/store";

export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

/** GET /api/admin/cms/destinations/{id} — the full editable record. */
export async function GET(request: NextRequest, { params }: Ctx) {
  const denied = await authorizeAdmin(request);
  if (denied) return denied;
  bootstrapFromSeed();
  const d = getDestination(params.id);
  return d ? json({ destination: d }) : notFound("Destination not found");
}

/** PUT /api/admin/cms/destinations/{id} — replaces the record with a sanitised copy of the body. */
export async function PUT(request: NextRequest, { params }: Ctx) {
  const denied = await authorizeAdmin(request);
  if (denied) return denied;
  bootstrapFromSeed();
  const existing = getDestination(params.id);
  if (!existing) return notFound("Destination not found");
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }
  const next = sanitiseDestination(body, existing);
  return json({ destination: saveDestination(next) });
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  const denied = await authorizeAdmin(request);
  if (denied) return denied;
  return deleteDestination(params.id) ? json({ ok: true }) : notFound("Destination not found");
}
