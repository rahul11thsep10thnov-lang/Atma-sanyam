// The avatar gallery a child picks from: 24 generated portraits bundled in
// assets/avatars/ (see its README), 160 px each. The id is the file name.
export type AvatarGroup = 'comic' | 'graffiti' | 'popart' | 'anime';

export interface AvatarDef {
  id: string;
  group: AvatarGroup;
  source: number;
}

export const AVATARS: AvatarDef[] = [
  { id: 'comic_01', group: 'comic', source: require('../../assets/avatars/comic_01.png') },
  { id: 'comic_02', group: 'comic', source: require('../../assets/avatars/comic_02.png') },
  { id: 'comic_03', group: 'comic', source: require('../../assets/avatars/comic_03.png') },
  { id: 'comic_04', group: 'comic', source: require('../../assets/avatars/comic_04.png') },
  { id: 'comic_05', group: 'comic', source: require('../../assets/avatars/comic_05.png') },
  { id: 'comic_06', group: 'comic', source: require('../../assets/avatars/comic_06.png') },
  { id: 'comic_07', group: 'comic', source: require('../../assets/avatars/comic_07.png') },
  { id: 'comic_08', group: 'comic', source: require('../../assets/avatars/comic_08.png') },
  { id: 'comic_09', group: 'comic', source: require('../../assets/avatars/comic_09.png') },
  { id: 'comic_10', group: 'comic', source: require('../../assets/avatars/comic_10.png') },
  { id: 'comic_11', group: 'comic', source: require('../../assets/avatars/comic_11.png') },
  { id: 'comic_12', group: 'comic', source: require('../../assets/avatars/comic_12.png') },
  { id: 'anime_01', group: 'anime', source: require('../../assets/avatars/anime_01.png') },
  { id: 'anime_02', group: 'anime', source: require('../../assets/avatars/anime_02.png') },
  { id: 'anime_03', group: 'anime', source: require('../../assets/avatars/anime_03.png') },
  { id: 'anime_04', group: 'anime', source: require('../../assets/avatars/anime_04.png') },
  { id: 'graffiti_01', group: 'graffiti', source: require('../../assets/avatars/graffiti_01.png') },
  { id: 'graffiti_02', group: 'graffiti', source: require('../../assets/avatars/graffiti_02.png') },
  { id: 'graffiti_03', group: 'graffiti', source: require('../../assets/avatars/graffiti_03.png') },
  { id: 'graffiti_04', group: 'graffiti', source: require('../../assets/avatars/graffiti_04.png') },
  { id: 'popart_01', group: 'popart', source: require('../../assets/avatars/popart_01.png') },
  { id: 'popart_02', group: 'popart', source: require('../../assets/avatars/popart_02.png') },
  { id: 'popart_03', group: 'popart', source: require('../../assets/avatars/popart_03.png') },
  { id: 'popart_04', group: 'popart', source: require('../../assets/avatars/popart_04.png') },
];

const BY_ID = new Map(AVATARS.map((a) => [a.id, a]));

export function avatarSource(id: string | null | undefined): number | null {
  return id ? (BY_ID.get(id)?.source ?? null) : null;
}
