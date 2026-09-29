import type { Confidence, ContentStatus } from "../enums";
import { VERIFICATION_INTERVAL_DAYS } from "../enums";
import { frequencyForFactType } from "../policy";
import type { FactRecord, MasterDatabase, MediaRecord } from "../types";
import { SRC } from "./sources";

/** Fixed seed timestamp keeps the built database deterministic (stable IDs, stable page output). */
export const SEED_DATE = "2026-09-28T00:00:00.000Z";

export interface FactInput {
  entity_id: string;
  fact_type: string;
  fact_text: string;
  value?: string | number | boolean | null;
  unit?: string | null;
  source_id?: string;
  verify_against?: string | null;
  confidence?: Confidence;
  verified_at?: string | null;
  verified_by?: string | null;
  status?: ContentStatus;
}

let factCounter = 0;

/**
 * Adds a traceable fact. Seed facts default to UNVERIFIED with the AI editorial
 * source — they enter the admin verification queue and are never presented as
 * verified until a human confirms them against `verify_against`.
 */
export function addFact(db: MasterDatabase, input: FactInput): FactRecord {
  factCounter += 1;
  const verifiedAt = input.verified_at ?? null;
  const frequency = frequencyForFactType(input.fact_type);
  const expires = verifiedAt
    ? new Date(new Date(verifiedAt).getTime() + VERIFICATION_INTERVAL_DAYS[frequency] * 86_400_000).toISOString()
    : null;

  const fact: FactRecord = {
    id: `FACT-${String(factCounter).padStart(6, "0")}`,
    entity_id: input.entity_id,
    fact_type: input.fact_type,
    fact_text: input.fact_text,
    value: input.value ?? null,
    unit: input.unit ?? null,
    source_id: input.source_id ?? SRC.EDITORIAL_AI,
    verify_against: input.verify_against ?? null,
    source_quote_optional: null,
    confidence: input.confidence ?? "UNVERIFIED",
    verified_by: input.verified_by ?? null,
    verified_at: verifiedAt,
    valid_from: null,
    valid_until: null,
    verification_frequency: frequency,
    expires_at: expires,
    status: input.status ?? (verifiedAt ? "VERIFIED" : "DATA_COLLECTION")
  };
  db.facts.push(fact);
  return fact;
}

export function resetFactCounter(): void {
  factCounter = 0;
}

export function placeholderUrl(label: string, w: number, h: number): string {
  return `placeholder://${encodeURIComponent(label)}?w=${w}&h=${h}`;
}

export function addMedia(
  db: MasterDatabase,
  entityId: string,
  role: MediaRecord["role"],
  label: string,
  w = 1200,
  h = 800
): MediaRecord {
  const media: MediaRecord = {
    id: `MEDIA-${String(db.media.length + 1).padStart(5, "0")}`,
    entity_id: entityId,
    media_type: "PHOTO",
    url: placeholderUrl(label, w, h),
    thumbnail_url: null,
    caption: label,
    alt_text: label,
    copyright_status: "PLACEHOLDER",
    license: null,
    creator: null,
    source: "budgettourism generated placeholder — pending licensed photography",
    credit_required: false,
    usage_allowed: false,
    verified_at: null,
    role
  };
  db.media.push(media);
  return media;
}
