import { LocationCategory } from "@prisma/client";
import { DirectorCharacter } from "./types";
import { TimeBucket } from "./library/environments";

/**
 * Continuity keys: the same key always resolves to the same reference and,
 * through the asset library, to the same approved pictures — so a character
 * looks the same in shot 1, shot 7 and the next episode.
 */
export function characterRefKey(storyId: string, c: DirectorCharacter): string {
  // Unnamed officials and generic roles are a reusable cast across stories.
  if (c.isOfficial && c.anonymized) return `generic:${c.role.replace(/\s+/g, "-")}:${c.gender}:${c.ageGroup}`.toLowerCase();
  return `story:${storyId}:${c.key}`;
}

export function locationRefKey(category: LocationCategory, region: string | null | undefined, bucket: TimeBucket, variant = 0): string {
  return `${category}:${(region ?? "IN").replace(/\s+/g, "_")}:${bucket}:v${variant}`;
}

export function propRefKey(propKey: string, style: string): string {
  return `prop:${propKey}:${style}`;
}

/** Resolution tier so a close-up never reuses a thumbnail-sized asset. */
export function sizeTier(pixelHeight: number): "S" | "M" | "L" {
  if (pixelHeight <= 1100) return "S";
  if (pixelHeight <= 2200) return "M";
  return "L";
}

export const TIER_MAX_HEIGHT = { S: 1100, M: 2200, L: 4096 } as const;
