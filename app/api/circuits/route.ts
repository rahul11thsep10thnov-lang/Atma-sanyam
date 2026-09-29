import { getDb } from "@/lib/master/repo";
import { json } from "@/lib/api/http";

export async function GET() {
  const db = getDb();
  return json({
    count: db.circuits.length,
    results: db.circuits.map((c) => ({
      ...c,
      stops: db.circuit_destinations
        .filter((cd) => cd.circuit_id === c.id)
        .sort((a, b) => a.sequence_number - b.sequence_number)
        .map((cd) => ({ ...cd, name: db.destinations.find((d) => d.id === cd.destination_id)?.name }))
    }))
  });
}
