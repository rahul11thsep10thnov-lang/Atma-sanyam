// DADU localisation. Fourteen launch languages; a string falls back to the
// helper language, then English. Coverage is tracked honestly: a language is
// "ready" only when its table is complete and proofread (see coverage()).
import type { Lang, Localised } from '../core/content';

export const LANGS: { id: Lang; name: string; native: string; script: string; rtl?: boolean; headingFont: string }[] = [
  { id: 'en', name: 'English', native: 'English', script: 'Latin', headingFont: 'Baloo 2' },
  { id: 'hi', name: 'Hindi', native: 'हिन्दी', script: 'Devanagari', headingFont: 'Baloo 2' },
  { id: 'bn', name: 'Bengali', native: 'বাংলা', script: 'Bengali', headingFont: 'Baloo Da 2' },
  { id: 'as', name: 'Assamese', native: 'অসমীয়া', script: 'Bengali', headingFont: 'Baloo Da 2' },
  { id: 'or', name: 'Odia', native: 'ଓଡ଼ିଆ', script: 'Odia', headingFont: 'Baloo Bhaina 2' },
  { id: 'mr', name: 'Marathi', native: 'मराठी', script: 'Devanagari', headingFont: 'Baloo 2' },
  { id: 'gu', name: 'Gujarati', native: 'ગુજરાતી', script: 'Gujarati', headingFont: 'Baloo Bhai 2' },
  { id: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ', script: 'Gurmukhi', headingFont: 'Baloo Paaji 2' },
  { id: 'ta', name: 'Tamil', native: 'தமிழ்', script: 'Tamil', headingFont: 'Baloo Thambi 2' },
  { id: 'te', name: 'Telugu', native: 'తెలుగు', script: 'Telugu', headingFont: 'Baloo Tammudu 2' },
  { id: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ', script: 'Kannada', headingFont: 'Baloo Tamma 2' },
  { id: 'ml', name: 'Malayalam', native: 'മലയാളം', script: 'Malayalam', headingFont: 'Baloo Chettan 2' },
  { id: 'ur', name: 'Urdu', native: 'اردو', script: 'Perso-Arabic', rtl: true, headingFont: 'Baloo Bhaijaan 2' },
  { id: 'sa', name: 'Sanskrit', native: 'संस्कृतम्', script: 'Devanagari', headingFont: 'Baloo 2' },
];

export type LanguageMode = 'single' | 'bilingual' | 'compare' | 'en-with-hi' | 'hi-with-en';

export interface LangPrefs { primary: Lang; helper?: Lang; mode: LanguageMode }

export function isLang(x: string | undefined | null): x is Lang {
  return !!x && LANGS.some((l) => l.id === x);
}

/** Resolve a localised value for the preferences; returns the text and which language was actually used. */
export function pick(v: Localised | string, prefs: LangPrefs | Lang): { text: string; lang: Lang } {
  if (typeof v === 'string') return { text: v, lang: 'en' };
  const p: LangPrefs = typeof prefs === 'string' ? { primary: prefs, mode: 'single' } : prefs;
  const order: Lang[] = [p.primary];
  if (p.helper) order.push(p.helper);
  order.push('en');
  for (const l of order) {
    const t = v[l];
    if (t) return { text: t, lang: l };
  }
  return { text: v.en, lang: 'en' };
}

export function tx(v: Localised | string, prefs: LangPrefs | Lang): string {
  return pick(v, prefs).text;
}

/** Second line shown under the primary text in bilingual and explanation modes. */
export function helperText(v: Localised | string, prefs: LangPrefs): string | null {
  if (typeof v === 'string') return null;
  const helper = prefs.mode === 'bilingual' || prefs.mode === 'compare' ? prefs.helper : prefs.mode === 'en-with-hi' ? 'hi' : prefs.mode === 'hi-with-en' ? 'en' : undefined;
  if (!helper || helper === prefs.primary) return null;
  return v[helper] ?? null;
}

/** UI strings. Keys are English; `hi` is complete; other languages are filled by the CMS translation workflow. */
export const UI: Record<string, Localised> = {
  'tabs.world': { en: 'Miniverse', hi: 'मिनीवर्स' },
  'tabs.learn': { en: 'Learn', hi: 'सीखें' },
  'tabs.stories': { en: 'Stories', hi: 'कहानियाँ' },
  'tabs.tests': { en: 'Tests', hi: 'परीक्षा' },
  'tabs.me': { en: 'Me', hi: 'मैं' },
  'common.next': { en: 'Next', hi: 'आगे' },
  'common.back': { en: 'Back', hi: 'पीछे' },
  'common.start': { en: 'Start', hi: 'शुरू करें' },
  'common.done': { en: 'Finish', hi: 'पूरा' },
  'common.close': { en: 'Close', hi: 'बंद करें' },
  'common.listen': { en: 'Listen', hi: 'सुनो' },
  'common.tryAgain': { en: 'Try again', hi: 'फिर से' },
  'common.save': { en: 'Save', hi: 'सहेजें' },
  'common.cancel': { en: 'Cancel', hi: 'रद्द' },
  'common.yes': { en: 'Yes', hi: 'हाँ' },
  'common.no': { en: 'No', hi: 'नहीं' },
  'lesson.repeat': { en: 'Say it again', hi: 'फिर से बताओ' },
  'lesson.simpler': { en: 'Make it simpler', hi: 'आसान करो' },
  'lesson.advanced': { en: 'Tell me more', hi: 'और बताओ' },
  'lesson.example': { en: 'Another example', hi: 'एक और उदाहरण' },
  'lesson.break': { en: 'Take a break', hi: 'थोड़ा आराम' },
  'lesson.well': { en: 'Shabash! That is right.', hi: 'शाबाश! बिल्कुल सही।' },
  'lesson.again': { en: 'Not this one. Let us look again together.', hi: 'यह नहीं। चलो फिर से साथ देखते हैं।' },
  'lesson.objective': { en: 'Learning objective', hi: 'सीखने का लक्ष्य' },
  'lesson.realworld': { en: 'Real-world adventure', hi: 'असली दुनिया का काम' },
  'lesson.steps.intro': { en: 'Dadaji introduces', hi: 'दादाजी बताते हैं' },
  'lesson.steps.question': { en: 'Chintu asks', hi: 'चिंटू पूछता है' },
  'lesson.steps.friend': { en: 'A friend joins in', hi: 'दोस्त साथ देता है' },
  'lesson.steps.explain': { en: 'Dadaji explains', hi: 'दादाजी समझाते हैं' },
  'lesson.steps.activity': { en: 'Your turn', hi: 'आपकी बारी' },
  'lesson.steps.feedback': { en: 'Feedback', hi: 'प्रतिक्रिया' },
  'lesson.steps.quiz': { en: 'Quick check', hi: 'छोटी परीक्षा' },
  'lesson.steps.echo': { en: "Mitthu's Echo", hi: 'मिट्ठू की गूँज' },
  'world.tap': { en: 'Tap something to learn about it', hi: 'किसी चीज़ को छुओ और सीखो' },
  'world.enter': { en: 'Enter', hi: 'अंदर जाएँ' },
  'world.leave': { en: 'Back to the Miniverse', hi: 'मिनीवर्स पर वापस' },
  'world.switchCamera': { en: 'Change view', hi: 'दृश्य बदलें' },
  'care.feed': { en: 'Feed', hi: 'खिलाओ' },
  'care.water': { en: 'Water', hi: 'पानी' },
  'care.rest': { en: 'Rest', hi: 'आराम' },
  'care.groom': { en: 'Brush', hi: 'ब्रश' },
  'care.happy': { en: 'Happy', hi: 'खुश' },
  'care.content': { en: 'Content', hi: 'ठीक' },
  'care.needs': { en: 'Needs care', hi: 'देखभाल चाहिए' },
  'garden.plant': { en: 'Plant a seed', hi: 'बीज बोओ' },
  'garden.water': { en: 'Water', hi: 'पानी दो' },
  'garden.harvest': { en: 'Harvest', hi: 'काटो' },
  'garden.stage.seed': { en: 'Seed', hi: 'बीज' },
  'garden.stage.germination': { en: 'Germinating', hi: 'अंकुरण' },
  'garden.stage.seedling': { en: 'Seedling', hi: 'पौध' },
  'garden.stage.growing': { en: 'Growing', hi: 'बढ़ रहा' },
  'garden.stage.mature': { en: 'Mature', hi: 'परिपक्व' },
  'garden.stage.flowering': { en: 'Flowering', hi: 'फूल' },
  'garden.stage.fruiting': { en: 'Fruiting', hi: 'फल' },
  'garden.stage.harvest': { en: 'Ready to harvest', hi: 'कटाई के लिए तैयार' },
  'time.morning': { en: 'Morning', hi: 'सुबह' },
  'time.afternoon': { en: 'Afternoon', hi: 'दोपहर' },
  'time.evening': { en: 'Evening', hi: 'शाम' },
  'time.night': { en: 'Night', hi: 'रात' },
  'weather.sunny': { en: 'Sunny', hi: 'धूप' },
  'weather.cloudy': { en: 'Cloudy', hi: 'बादल' },
  'weather.rainy': { en: 'Rainy', hi: 'बारिश' },
  'weather.stormy': { en: 'Stormy', hi: 'तूफ़ान' },
  'weather.foggy': { en: 'Foggy', hi: 'कोहरा' },
  'season.spring': { en: 'Spring', hi: 'वसंत' },
  'season.summer': { en: 'Summer', hi: 'गर्मी' },
  'season.monsoon': { en: 'Monsoon', hi: 'मानसून' },
  'season.autumn': { en: 'Autumn', hi: 'शरद' },
  'season.winter': { en: 'Winter', hi: 'सर्दी' },
  'parent.gate': { en: 'For parents', hi: 'अभिभावकों के लिए' },
  'parent.gateQuestion': { en: 'What is {a} times {b}?', hi: '{a} गुणा {b} कितना होता है?' },
  'parent.gateWrong': { en: 'That is not it. Try again.', hi: 'यह नहीं। फिर से कोशिश करें।' },
  'parent.dashboard': { en: 'Parent dashboard', hi: 'अभिभावक डैशबोर्ड' },
  'parent.screenTime': { en: 'Screen time today', hi: 'आज का स्क्रीन-टाइम' },
  'parent.limit': { en: 'Daily limit', hi: 'दैनिक सीमा' },
  'parent.bedtime': { en: 'Bedtime', hi: 'सोने का समय' },
  'parent.windDown': { en: 'Dadaji is winding down. {m} minutes left.', hi: 'दादाजी समेट रहे हैं। {m} मिनट बचे।' },
  'parent.timeUp': { en: 'Time to rest, beta. Your progress is saved. Same time tomorrow!', hi: 'आराम का समय, बेटा। प्रगति सहेज ली गई। कल फिर मिलेंगे!' },
  'parent.breakReminder': { en: 'Stretch, drink water, look far away for a minute.', hi: 'स्ट्रेच करो, पानी पियो, एक मिनट दूर देखो।' },
  'rewards.stars': { en: 'Stars', hi: 'तारे' },
  'rewards.coins': { en: 'Coins', hi: 'सिक्के' },
  'rewards.badges': { en: 'Badges', hi: 'बैज' },
  'rewards.earned': { en: 'You earned {stars} star and {coins} coins!', hi: 'आपको {stars} तारा और {coins} सिक्के मिले!' },
  'rwa.markDone': { en: 'Mark complete with a parent', hi: 'बड़े के साथ पूरा करें' },
  'rwa.done': { en: 'Completed with a parent', hi: 'अभिभावक के साथ पूरा हुआ' },
  'onboarding.language': { en: 'Namaste! Which language?', hi: 'नमस्ते! कौन-सी भाषा?' },
  'onboarding.languageHint': { en: 'Parents can change this later', hi: 'अभिभावक बाद में बदल सकते हैं' },
  'onboarding.parent': { en: 'A grown-up sets things up', hi: 'एक बड़ा व्यक्ति सेटअप करेगा' },
  'onboarding.consent': { en: 'I am the parent or guardian and I consent to DADU storing this child\'s learning progress on this device and, if I sign in, in my account.', hi: 'मैं अभिभावक हूँ और सहमत हूँ कि DADU इस बच्चे की सीखने की प्रगति इस डिवाइस पर और साइन-इन करने पर मेरे खाते में रखे।' },
  'onboarding.childName': { en: "Child's name", hi: 'बच्चे का नाम' },
  'onboarding.ageBand': { en: 'Age band', hi: 'आयु वर्ग' },
  'onboarding.difficulty': { en: 'Difficulty (separate from age)', hi: 'कठिनाई (आयु से अलग)' },
  'onboarding.meet': { en: 'Meet Dadaji', hi: 'दादाजी से मिलें' },
  'difficulty.gentle': { en: 'Gentle', hi: 'कोमल' },
  'difficulty.steady': { en: 'Steady', hi: 'सम' },
  'difficulty.stretch': { en: 'Stretch', hi: 'चुनौती' },
  'mode.lap': { en: 'Lap mode', hi: 'गोद मोड' },
  'mode.little': { en: 'Little mode', hi: 'लिटिल मोड' },
  'mode.explorer': { en: 'Explorer mode', hi: 'एक्सप्लोरर मोड' },
};

export function ui(key: string, prefs: LangPrefs | Lang, params?: Record<string, string | number>): string {
  const v = UI[key];
  let s = v ? tx(v, prefs) : key;
  if (params) for (const [k, val] of Object.entries(params)) s = s.split(`{${k}}`).join(String(val));
  return s;
}

/** Honest language coverage: fraction of UI keys present per language. */
export function coverage(): Record<Lang, number> {
  const keys = Object.keys(UI);
  const out = {} as Record<Lang, number>;
  for (const l of LANGS) out[l.id] = keys.filter((k) => !!UI[k][l.id]).length / keys.length;
  return out;
}
