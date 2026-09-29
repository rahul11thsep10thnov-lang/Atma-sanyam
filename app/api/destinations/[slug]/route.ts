import { NextRequest } from "next/server";
import { buildGenerationInput } from "@/lib/master/generation/input";
import { destinationBySlug, getDb } from "@/lib/master/repo";
import { json, notFound } from "@/lib/api/http";

/** The full structured record for a destination — the same JSON the content writer receives. */
export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  const dest = destinationBySlug(params.slug);
  if (!dest) return notFound("Destination not found");
  return json(buildGenerationInput(getDb(), dest.id));
}
