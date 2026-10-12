// The only things that can be said in a group focus: a fixed set of short
// messages and smileys, by key. The app shows them in the person's language
// (src/social/groupMessages.ts has the same keys); the server stores keys.
export const GROUP_MESSAGE_KEYS = [
  'lets_go',
  'stay_focused',
  'almost_there',
  'good_job',
  'keep_going',
  'need_a_break',
  'im_back',
  'well_done',
  'thank_you',
  'one_more',
  'smile_thumbs',
  'smile_fire',
  'smile_muscle',
  'smile_sprout',
  'smile_clap',
  'smile_vsign',
  'smile_smile',
  'smile_heart',
] as const;

export type GroupMessageKey = (typeof GROUP_MESSAGE_KEYS)[number];

export function isGroupMessageKey(key: string): key is GroupMessageKey {
  return (GROUP_MESSAGE_KEYS as readonly string[]).includes(key);
}
