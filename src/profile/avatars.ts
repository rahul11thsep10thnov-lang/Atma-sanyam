// The avatar gallery a person picks from. The 80 supplied portraits sit in
// assets/avatars/ (see its README); they are listed here once the collection
// is approved. Until then the gallery is empty and the avatar step is
// skipped: a person shows as the first letter of their name on a peach disc.
export type AvatarGroup = 'comic' | 'graffiti' | 'popart' | 'anime';

export interface AvatarDef {
  id: string; // e.g. "comic_07": the file name without .png, what the server stores
  group: AvatarGroup;
  source: number; // require()
}

export const AVATARS: AvatarDef[] = [];

const BY_ID = new Map(AVATARS.map((a) => [a.id, a]));

export function avatarSource(id: string | null | undefined): number | null {
  return id ? (BY_ID.get(id)?.source ?? null) : null;
}
