import { seedDestinations as legacySeedCities } from "./raw/seedCities";
import { varanasi as legacyVaranasi } from "./raw/varanasi";
import { emptyDatabase } from "../types";
import type { MasterDatabase } from "../types";
import { SEED_DATE, resetFactCounter } from "./builder";
import { importLegacyDestination } from "./legacyImport";
import { deriveRelationships, seedCircuits, seedConnections } from "./network";
import { seedDefaultCosts, seedNationalEmergency } from "./national";
import { SOURCES, stateTourismSource } from "./sources";
import { buildStates } from "./states";
import { HISTORICAL_PERIODS, enrichVaranasi } from "./varanasi";

/**
 * Builds the complete master database from the demo dataset. Pure and
 * deterministic (fixed timestamps, sequential IDs), so page output is stable
 * between builds. In production the same shape is read from PostgreSQL.
 */
export function buildMasterDatabase(): MasterDatabase {
  resetFactCounter();
  const db = emptyDatabase();

  db.states = buildStates(SEED_DATE);
  db.sources = [...SOURCES, ...db.states.map((s) => stateTourismSource(s.iso_code.replace("IN-", ""), s.name))];
  db.historical_periods = HISTORICAL_PERIODS;

  // Import order: Varanasi first (parent of the Level-B places), then the other seed cities.
  importLegacyDestination(db, legacyVaranasi);
  legacySeedCities.forEach((legacy) => importLegacyDestination(db, legacy));
  enrichVaranasi(db);

  seedNationalEmergency(db);
  seedDefaultCosts(db);
  seedConnections(db);
  seedCircuits(db);
  deriveRelationships(db);

  // Visual prompts for the future image-generation pipeline (never auto-copied from the web).
  db.ai_visual_prompts = db.destinations
    .filter((d) => d.destination_level === "A")
    .map((d) => {
      const top = db.attractions.filter((a) => a.destination_id === d.id && !a.is_hidden_gem).slice(0, 3).map((a) => a.name);
      return {
        entity_id: d.id,
        hero_prompt: `Wide editorial photograph of ${d.name}, ${db.states.find((s) => s.id === d.state_id)?.name}, India, golden-hour light${top.length ? `, featuring ${top.join(", ")}` : ""}`,
        history_prompt: `Museum-style illustration of ${d.name} in an earlier era, muted period palette, no text`,
        map_prompt: `Clean stylised route map of ${d.name} and its nearby destinations, forest green and saffron`,
        background_prompt: `Soft, low-contrast panoramic view of ${d.name} suitable as a 12% opacity page background`,
        visual_style: "Warm documentary photography, natural colour, modern editorial",
        negative_prompt: "text, logos, watermarks, distorted architecture, crowds obstructing the subject, fake signage",
        generated_image_id: null
      };
    });

  // Example machine translations (status MACHINE — reviewers upgrade them to REVIEWED).
  const vns = db.destinations.find((d) => d.slug === "varanasi")!;
  db.translations.push({
    id: "TR-0001", entity_id: vns.id, language_code: "hi", field_name: "one_line_description",
    translated_text: "गंगा किनारे बसा शाश्वत शहर", translation_status: "MACHINE", translated_by: "seed",
    reviewed_by: null, created_at: SEED_DATE, updated_at: SEED_DATE
  });

  return db;
}
