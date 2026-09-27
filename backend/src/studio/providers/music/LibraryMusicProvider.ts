import { PrismaClient } from "@prisma/client";
import { MusicPick, MusicProvider } from "./MusicProvider";

/**
 * Picks a licensed track from the `music` table by mood (admins upload
 * tracks with their licence). Tracks shorter than the video are looped by
 * the renderer. Returns null when the library is empty — the video then
 * simply has no music track, which is acceptable for news.
 */
export class LibraryMusicProvider implements MusicProvider {
  readonly key = "library";

  constructor(private readonly prisma: PrismaClient) {}

  async pick(request: { mood: string; minDurationSeconds: number; seed: number }): Promise<MusicPick | null> {
    let tracks = await this.prisma.musicTrack.findMany({ where: { isActive: true, mood: request.mood }, orderBy: { createdAt: "asc" } });
    if (tracks.length === 0) tracks = await this.prisma.musicTrack.findMany({ where: { isActive: true, mood: "neutral" }, orderBy: { createdAt: "asc" } });
    if (tracks.length === 0) return null;
    const track = tracks[Math.abs(request.seed) % tracks.length];
    return { id: track.id, title: track.title, storageKey: track.storageKey, durationSeconds: track.durationSeconds, license: track.license };
  }
}
