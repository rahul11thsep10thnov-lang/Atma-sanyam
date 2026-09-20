import { createHash } from "node:crypto";
import { MasterStory, PrismaClient } from "@prisma/client";
import { ExtractedStory } from "../extraction/StoryExtractor";
import { datesWithin, normalizeForHash, textSimilarity } from "./similarity";
import { logger } from "../../lib/logger";

/** Composite similarity at/above this is treated as the same real-world incident. */
export const DUPLICATE_SIMILARITY_THRESHOLD = 0.55;
const CANDIDATE_LOOKBACK_DAYS = 45;

export interface DedupResult {
  masterStory: MasterStory;
  isNewMasterStory: boolean;
  similarity: number;
}

/**
 * Detects whether an extracted story is the same real-world incident as an
 * already-known MasterStory (possibly reported by a different outlet), and
 * either merges it in as an additional StorySource or creates a new
 * MasterStory. Implements spec §12: same incident across multiple outlets
 * must become one MASTER_STORY with multiple attached sources, not
 * multiple videos.
 */
export class DuplicateDetectionService {
  constructor(private readonly prisma: PrismaClient) {}

  async findOrCreateMasterStory(extracted: ExtractedStory): Promise<DedupResult> {
    const candidates = await this.prisma.masterStory.findMany({
      where: {
        eventType: extracted.eventType,
        createdAt: { gte: new Date(Date.now() - CANDIDATE_LOOKBACK_DAYS * 24 * 60 * 60 * 1000) },
        pipelineStatus: { notIn: ["REJECTED", "FAILED"] },
      },
      include: { location: true },
    });

    let best: { story: MasterStory; score: number } | null = null;
    for (const candidate of candidates) {
      const score = this.computeSimilarity(extracted, candidate);
      if (!best || score > best.score) {
        best = { story: candidate, score };
      }
    }

    if (best && best.score >= DUPLICATE_SIMILARITY_THRESHOLD) {
      logger.info(
        { masterStoryId: best.story.id, similarity: best.score },
        "Merging article into existing master story"
      );
      return { masterStory: best.story, isNewMasterStory: false, similarity: best.score };
    }

    const location = await this.resolveLocation(extracted.state, extracted.district, extracted.city);
    const masterStory = await this.prisma.masterStory.create({
      data: {
        masterStoryHash: buildHash(extracted),
        title: extracted.title,
        eventType: extracted.eventType,
        eventDate: extracted.eventDate,
        locationId: location?.id,
        peopleInvolved: extracted.peopleInvolved as unknown as object,
        relationships: extracted.relationships as unknown as object,
        whatHappened: extracted.whatHappened,
        background: extracted.background,
        policeAction: extracted.policeAction,
        legalStatus: extracted.legalStatus,
        currentStatus: extracted.currentStatus,
        pipelineStatus: "AI_CLASSIFIED",
      },
    });

    return { masterStory, isNewMasterStory: true, similarity: 0 };
  }

  private computeSimilarity(
    extracted: ExtractedStory,
    candidate: MasterStory & { location: { state: string; district: string | null } | null }
  ): number {
    const titleScore = textSimilarity(extracted.title, candidate.title);
    const bodyScore = textSimilarity(extracted.whatHappened, candidate.whatHappened);

    let locationScore = 0.5; // neutral when either side lacks location info
    if (extracted.state && candidate.location?.state) {
      locationScore = extracted.state === candidate.location.state ? (extracted.district && extracted.district === candidate.location.district ? 1 : 0.6) : 0;
    }

    const dateScore = datesWithin(extracted.eventDate, candidate.eventDate, 5) ? 1 : 0;

    // Location + date carry more weight than raw body-text overlap, because
    // corroborating outlets often report wildly different amounts of detail
    // for the same real-world incident (a two-line wire brief vs. a full
    // feature) — Jaccard similarity on body text alone under-detects those
    // as duplicates. But location+date agreement alone must never be
    // sufficient on its own (two unrelated disputes can share a district and
    // a date), so we require at least some title/body text overlap too.
    const combinedScore = titleScore * 0.35 + bodyScore * 0.15 + locationScore * 0.35 + dateScore * 0.15;
    const hasMinimalTextOverlap = titleScore > 0.05 || bodyScore > 0.05;
    return hasMinimalTextOverlap ? combinedScore : Math.min(combinedScore, DUPLICATE_SIMILARITY_THRESHOLD - 0.1);
  }

  private async resolveLocation(state: string | null, district: string | null, city: string | null) {
    if (!state) return null;
    // Prisma's compound-unique `where` shape doesn't accept null members even
    // though the underlying columns are nullable, so we look up + create
    // explicitly instead of relying on upsert's atomic unique match.
    const existing = await this.prisma.location.findFirst({ where: { state, district, city } });
    if (existing) return existing;
    return this.prisma.location.create({ data: { state, district, city } });
  }
}

function buildHash(extracted: ExtractedStory): string {
  const signature = normalizeForHash(`${extracted.title} ${extracted.state ?? ""} ${extracted.district ?? ""}`);
  return createHash("sha256").update(signature + Date.now()).digest("hex");
}
