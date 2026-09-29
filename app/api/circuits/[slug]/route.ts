import { NextRequest } from "next/server";
import { CircuitEngine } from "@/lib/master/engine/circuits";
import { circuitBySlug, getDb } from "@/lib/master/repo";
import { json, notFound } from "@/lib/api/http";

export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  const circuit = circuitBySlug(params.slug);
  if (!circuit) return notFound("Circuit not found");
  const db = getDb();
  const stops = db.circuit_destinations.filter((cd) => cd.circuit_id === circuit.id).sort((a, b) => a.sequence_number - b.sequence_number);
  const assessment = new CircuitEngine(db).scoreRoute(stops.filter((s) => s.mandatory).map((s) => s.destination_id), { days: circuit.recommended_days });
  return json({ circuit, stops, assessment });
}
