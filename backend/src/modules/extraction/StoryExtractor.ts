import { PrimaryCategoryKey } from "../../data/categories";

export interface ExtractedPerson {
  name: string;
  role: string; // e.g. "accused", "victim", "complainant"
  ageRange?: string | null; // e.g. "40-50" — deliberately coarse, never exact DOB
}

export interface ExtractedRelationship {
  personA: string;
  personB: string;
  relationship: string; // e.g. "brothers", "husband-wife", "mother-in-law"
}

/**
 * The structured, language-neutral facts extracted from one or more
 * corroborating articles about the same incident (spec §8's canonical
 * story shape). This is what MasterStory is built from, and what the
 * dedup/scoring/script-generation stages operate on.
 */
export interface ExtractedStory {
  title: string;
  eventType: PrimaryCategoryKey;
  eventDate: Date | null;
  state: string | null;
  district: string | null;
  city: string | null;
  peopleInvolved: ExtractedPerson[];
  relationships: ExtractedRelationship[];
  whatHappened: string;
  background: string | null;
  policeAction: string | null;
  legalStatus: string | null;
  currentStatus: string | null;
  /** How many of the 9 explanatory elements (§2) were present with real content. */
  presentElementCount: number;
  presentElements: string[];
}

export interface StoryExtractionInput {
  headline: string;
  summary: string;
  category: PrimaryCategoryKey;
}

export interface StoryExtractor {
  extract(input: StoryExtractionInput): Promise<ExtractedStory>;
}
