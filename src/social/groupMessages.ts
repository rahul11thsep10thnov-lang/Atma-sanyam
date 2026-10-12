// The fixed chat of a group focus: the same keys as backend/src/lib/groupMessages.ts.
// Words are translated (chat.<key>); smileys are the smiley itself.
import { StringKey, t } from '../i18n';

export const GROUP_WORDS = ['lets_go', 'stay_focused', 'almost_there', 'good_job', 'keep_going', 'need_a_break', 'im_back', 'well_done', 'thank_you', 'one_more'] as const;

export const GROUP_SMILEYS: Record<string, string> = {
  smile_thumbs: '👍',
  smile_fire: '🔥',
  smile_muscle: '💪',
  smile_sprout: '🌱',
  smile_clap: '👏',
  smile_vsign: '✌️',
  smile_smile: '🙂',
  smile_heart: '❤️',
};

export function groupMessageText(key: string): string {
  if (key in GROUP_SMILEYS) return GROUP_SMILEYS[key]!;
  return t(`chat.${key}` as StringKey);
}
