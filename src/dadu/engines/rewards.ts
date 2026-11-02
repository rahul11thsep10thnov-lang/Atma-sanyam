// Stars, coins, badges, certificates and decorations. Participation, effort,
// curiosity and consistency are rewarded; nothing is ever taken away and no
// day is punished. Pure.
import type { Localised } from '../core/content';
import type { WorldState } from '../core/worldState';
import type { LessonResult } from './lesson';

export interface Badge { id: string; name: Localised; how: Localised; icon: string }

export const BADGES: Badge[] = [
  { id: 'first_lesson', name: { en: 'First lesson', hi: 'पहला पाठ' }, how: { en: 'Finish any lesson', hi: 'कोई भी पाठ पूरा करो' }, icon: 'badge_star' },
  { id: 'curious_question', name: { en: 'Curious question', hi: 'जिज्ञासु सवाल' }, how: { en: 'Ask Dadaji to tell you more three times', hi: 'दादाजी से तीन बार "और बताओ" कहो' }, icon: 'badge_sun' },
  { id: 'star_gazer', name: { en: 'Star gazer', hi: 'तारा-दर्शक' }, how: { en: 'Finish the telescope lesson', hi: 'दूरबीन का पाठ पूरा करो' }, icon: 'badge_sun' },
  { id: 'little_gardener', name: { en: 'Little gardener', hi: 'नन्हा माली' }, how: { en: 'Plant a seed in the real world', hi: 'असली दुनिया में बीज बोओ' }, icon: 'badge_leaf' },
  { id: 'kind_keeper', name: { en: 'Kind keeper', hi: 'दयालु देखभाल' }, how: { en: 'Care for every animal in one day', hi: 'एक दिन में हर जानवर की देखभाल करो' }, icon: 'badge_leaf' },
  { id: 'seven_swaras', name: { en: 'Seven swaras', hi: 'सात स्वर' }, how: { en: 'Play Sa to Sa', hi: 'सा से सा बजाओ' }, icon: 'badge_star' },
  { id: 'pattern_finder', name: { en: 'Pattern finder', hi: 'पैटर्न खोजी' }, how: { en: 'Finish a rangoli pattern', hi: 'रंगोली का पैटर्न पूरा करो' }, icon: 'badge_star' },
  { id: 'story_listener', name: { en: 'Story listener', hi: 'कहानी-प्रेमी' }, how: { en: 'Listen to three stories', hi: 'तीन कहानियाँ सुनो' }, icon: 'badge_sun' },
  { id: 'steady_learner', name: { en: 'Steady learner', hi: 'नियमित शिक्षार्थी' }, how: { en: 'Learn on five different days', hi: 'पाँच अलग-अलग दिनों में सीखो' }, icon: 'badge_star' },
  { id: 'first_harvest', name: { en: 'First harvest', hi: 'पहली फ़सल' }, how: { en: 'Harvest a plant you grew', hi: 'अपना उगाया पौधा काटो' }, icon: 'badge_leaf' },
  { id: 'young_scientist', name: { en: 'Young scientist', hi: 'नन्हा वैज्ञानिक' }, how: { en: 'Finish three STEM lessons', hi: 'तीन स्टेम पाठ पूरे करो' }, icon: 'badge_sun' },
  { id: 'coder', name: { en: 'Coder', hi: 'कोडर' }, how: { en: 'Guide Buddy to the bone with blocks', hi: 'ब्लॉक से बडी को हड्डी तक पहुँचाओ' }, icon: 'badge_sun' },
  { id: 'artist', name: { en: 'Artist', hi: 'कलाकार' }, how: { en: 'Save three creations in your gallery', hi: 'गैलरी में तीन रचनाएँ सहेजो' }, icon: 'badge_star' },
  { id: 'athlete', name: { en: 'Athlete', hi: 'खिलाड़ी' }, how: { en: 'Finish three sports lessons', hi: 'तीन खेल पाठ पूरे करो' }, icon: 'badge_star' },
  { id: 'explorer', name: { en: 'Explorer', hi: 'खोजी' }, how: { en: 'Visit every world once', hi: 'हर दुनिया में एक बार जाओ' }, icon: 'badge_sun' },
  { id: 'helper', name: { en: 'Helper at home', hi: 'घर का सहायक' }, how: { en: 'Finish three household adventures', hi: 'घर के तीन काम पूरे करो' }, icon: 'badge_leaf' },
  { id: 'reviser', name: { en: "Mitthu's friend", hi: 'मिट्ठू का दोस्त' }, how: { en: "Finish five of Mitthu's Echoes", hi: 'मिट्ठू की पाँच गूँज पूरी करो' }, icon: 'badge_sun' },
  { id: 'culture_keeper', name: { en: 'Culture keeper', hi: 'संस्कृति रक्षक' }, how: { en: 'Finish three Sanskriti lessons', hi: 'संस्कृति के तीन पाठ पूरे करो' }, icon: 'badge_star' },
];

export interface Decoration { id: string; name: Localised; kind: 'furniture' | 'garden' | 'toy' | 'instrument' | 'accessory' | 'theme'; price: number; place: string; icon: string }

/** Accessories go on the child's avatar only; primary characters are never altered. */
export const DECORATIONS: Decoration[] = [
  { id: 'deco.marigold_bed', name: { en: 'Marigold bed', hi: 'गेंदे की क्यारी' }, kind: 'garden', price: 8, place: 'garden.flowers', icon: 'flower_bed' },
  { id: 'deco.bird_bath', name: { en: 'Bird bath', hi: 'चिड़िया का कुंड' }, kind: 'garden', price: 15, place: 'garden.flowers', icon: 'bird_bath' },
  { id: 'deco.swing_seat', name: { en: 'Garden swing', hi: 'बगीचे का झूला' }, kind: 'garden', price: 20, place: 'villa.veranda', icon: 'swing' },
  { id: 'deco.lantern', name: { en: 'Paper lantern', hi: 'कागज़ी लालटेन' }, kind: 'furniture', place: 'villa.living', price: 10, icon: 'lamp' },
  { id: 'deco.bookshelf_lamp', name: { en: 'Bookshelf lamp', hi: 'शेल्फ़ का दीपक' }, kind: 'furniture', place: 'villa.study', price: 10, icon: 'lamp' },
  { id: 'deco.rug_blue', name: { en: 'Blue dhurrie', hi: 'नीली दरी' }, kind: 'furniture', place: 'villa.bedroom_chintu', price: 12, icon: 'rug' },
  { id: 'deco.kite', name: { en: 'Kite', hi: 'पतंग' }, kind: 'toy', place: 'villa.terrace', price: 6, icon: 'kite' },
  { id: 'deco.cricket_set', name: { en: 'Cricket set', hi: 'क्रिकेट किट' }, kind: 'toy', place: 'villa.driveway', price: 18, icon: 'stumps' },
  { id: 'deco.blocks', name: { en: 'Building blocks', hi: 'ब्लॉक' }, kind: 'toy', place: 'villa.activity', price: 9, icon: 'blocks' },
  { id: 'deco.dholak', name: { en: 'Dholak', hi: 'ढोलक' }, kind: 'instrument', place: 'villa.activity', price: 14, icon: 'dholak' },
  { id: 'deco.flute', name: { en: 'Bamboo flute', hi: 'बाँसुरी' }, kind: 'instrument', place: 'villa.activity', price: 8, icon: 'flute' },
  { id: 'deco.keyboard', name: { en: 'Keyboard', hi: 'कीबोर्ड' }, kind: 'instrument', place: 'villa.activity', price: 25, icon: 'keyboard' },
  { id: 'deco.cap_yellow', name: { en: 'Yellow cap (avatar)', hi: 'पीली टोपी (अवतार)' }, kind: 'accessory', place: 'avatar', price: 5, icon: 'cap' },
  { id: 'deco.scarf_green', name: { en: 'Green scarf (avatar)', hi: 'हरा स्कार्फ़ (अवतार)' }, kind: 'accessory', place: 'avatar', price: 5, icon: 'scarf' },
  { id: 'deco.theme_monsoon', name: { en: 'Monsoon theme', hi: 'मानसून थीम' }, kind: 'theme', place: 'app', price: 12, icon: 'cloud' },
  { id: 'deco.theme_diwali', name: { en: 'Diwali lights theme', hi: 'दिवाली रोशनी थीम' }, kind: 'theme', place: 'app', price: 12, icon: 'diya' },
  { id: 'deco.nandu_bell', name: { en: "Nandu's bell (shed decoration)", hi: 'नंदू की घंटी (गौशाला सजावट)' }, kind: 'garden', place: 'animalia.cowshed', price: 12, icon: 'bell' },
  { id: 'deco.rabbit_tunnel', name: { en: 'Play tunnel for Chikki', hi: 'चिक्की की सुरंग' }, kind: 'garden', place: 'animalia.rabbit', price: 10, icon: 'tunnel' },
  { id: 'deco.dog_ball', name: { en: 'Ball for Buddy', hi: 'बडी की गेंद' }, kind: 'toy', place: 'animalia.dog', price: 4, icon: 'ball' },
  { id: 'deco.globe_lamp', name: { en: 'Globe lamp', hi: 'ग्लोब लैंप' }, kind: 'furniture', place: 'villa.living', price: 16, icon: 'globe' },
];

export function badgeById(id: string): Badge | undefined { return BADGES.find((b) => b.id === id); }

export function grant(w: WorldState, delta: { stars?: number; coins?: number; badges?: string[]; certificates?: string[] }): WorldState {
  const stars = Math.max(0, (delta.stars ?? 0));
  const coins = Math.max(0, (delta.coins ?? 0));
  const badges = [...w.rewards.badges];
  for (const b of delta.badges ?? []) if (badgeById(b) && !badges.includes(b)) badges.push(b);
  const certificates = [...w.rewards.certificates];
  for (const c of delta.certificates ?? []) if (!certificates.includes(c)) certificates.push(c);
  return { ...w, rewards: { stars: w.rewards.stars + stars, coins: w.rewards.coins + coins, badges, certificates } };
}

/** Apply a finished lesson: stars/coins, completion list, badges that depend on counts. */
export function applyLessonResult(w: WorldState, r: LessonResult, section: string, lessonsBySection: Record<string, number>): WorldState {
  const lessonsCompleted = w.lessonsCompleted.includes(r.lessonId) ? w.lessonsCompleted : [...w.lessonsCompleted, r.lessonId];
  const badges: string[] = [];
  if (lessonsCompleted.length === 1) badges.push('first_lesson');
  if (r.lessonId.includes('telescope')) badges.push('star_gazer');
  if (r.lessonId.includes('swara') || r.lessonId.includes('harmonium')) badges.push('seven_swaras');
  if (r.lessonId.includes('rangoli')) badges.push('pattern_finder');
  if (r.lessonId.includes('code')) badges.push('coder');
  const done = (lessonsBySection[section] ?? 0) + 1;
  if (section === 'stem' && done >= 3) badges.push('young_scientist');
  if (section === 'sports' && done >= 3) badges.push('athlete');
  // a repeated lesson still earns participation coins, but stars only the first time
  const first = !w.lessonsCompleted.includes(r.lessonId);
  const next = grant({ ...w, lessonsCompleted }, { stars: first ? r.stars : 0, coins: r.coins, badges });
  return { ...next, echoQueue: first ? [...next.echoQueue, r.lessonId].slice(-20) : next.echoQueue };
}

export function canAfford(w: WorldState, decoId: string): boolean {
  const d = DECORATIONS.find((x) => x.id === decoId);
  return !!d && w.rewards.coins >= d.price && !w.decorations.includes(decoId);
}

export function purchaseDecoration(w: WorldState, decoId: string): WorldState {
  if (!canAfford(w, decoId)) return w;
  const d = DECORATIONS.find((x) => x.id === decoId)!;
  return { ...w, decorations: [...w.decorations, decoId], rewards: { ...w.rewards, coins: w.rewards.coins - d.price } };
}

export function decorationsAt(w: WorldState, place: string): Decoration[] {
  return DECORATIONS.filter((d) => d.place === place && w.decorations.includes(d.id));
}

/** Certificates mark completed subjects; the parent dashboard prints them. */
export function certificateFor(section: string, lessonsDone: number, lessonsTotal: number): string | null {
  return lessonsTotal > 0 && lessonsDone >= lessonsTotal ? `cert.${section}` : null;
}
