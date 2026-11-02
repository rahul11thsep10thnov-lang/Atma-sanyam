// The permanent character system. Pure module: no React Native imports.
// Legacy keys from the v2 design (gopu, kim, molly, dhanu) stay valid through
// `canonicalCharacter`, so stored content, progress and audio metadata are
// never rewritten.

export type CharacterKey = 'dadaji' | 'chintu' | 'buddy' | 'chikki' | 'gauri' | 'nandu' | 'mitthu';
export type LegacyCharacterKey = 'gopu' | 'kim' | 'molly' | 'dhanu';

export const CHARACTER_ALIASES: Record<LegacyCharacterKey, CharacterKey> = {
  gopu: 'chintu',
  kim: 'buddy',
  molly: 'chikki',
  dhanu: 'nandu',
};

export const PRIMARY_CHARACTERS: CharacterKey[] = ['dadaji', 'chintu', 'buddy', 'chikki', 'gauri', 'nandu'];

export interface CharacterSpec {
  key: CharacterKey;
  legacyKeys: LegacyCharacterKey[];
  name: { en: string; hi: string };
  kind: 'human' | 'dog' | 'rabbit' | 'cow' | 'calf' | 'parrot';
  /** Height in world units (1 wu = 16 px at zoom 1). Dadaji is the reference. */
  heightWu: number;
  role: { en: string; hi: string };
  voice: { en: string; hi: string };
  /** The learning areas this character joins in step 3 of the teaching formula. */
  joins: string[];
}

export const CHARACTERS: Record<CharacterKey, CharacterSpec> = {
  dadaji: {
    key: 'dadaji', legacyKeys: [], kind: 'human', heightWu: 10.5,
    name: { en: 'Dadaji', hi: 'दादाजी' },
    role: { en: 'The one and only teacher. Introduces, explains, asks, encourages, corrects and tells stories.', hi: 'एकमात्र शिक्षक। परिचय, व्याख्या, प्रश्न, हौसला, सुधार और कहानियाँ।' },
    voice: { en: 'Warm, slow, expressive, slightly husky; chuckles.', hi: 'गर्मजोशी भरी, धीमी, भावपूर्ण आवाज़।' },
    joins: [],
  },
  chintu: {
    key: 'chintu', legacyKeys: ['gopu'], kind: 'human', heightWu: 6,
    name: { en: 'Chintu', hi: 'चिंटू' },
    role: { en: 'The naughty, curious grandchild. Asks unexpected questions and makes funny mistakes.', hi: 'शरारती, जिज्ञासु बच्चा। अनोखे सवाल और मज़ेदार गलतियाँ।' },
    voice: { en: 'Young, bright, fast, giggly.', hi: 'छोटी, चमकीली, तेज़, खिलखिलाती आवाज़।' },
    joins: [],
  },
  buddy: {
    key: 'buddy', legacyKeys: ['kim'], kind: 'dog', heightWu: 4,
    name: { en: 'Buddy', hi: 'बडी' },
    role: { en: 'Playful golden dog. Sports, reasoning, "let us go and find out!"', hi: 'खिलंदड़ सुनहरा कुत्ता। खेल, तर्क, "चलो पता लगाएँ!"' },
    voice: { en: 'Playful, bouncy, short barks.', hi: 'चंचल, उछलती, छोटी भौं-भौं।' },
    joins: ['sports', 'stem', 'nature', 'mind'],
  },
  chikki: {
    key: 'chikki', legacyKeys: ['molly'], kind: 'rabbit', heightWu: 3,
    name: { en: 'Chikki', hi: 'चिक्की' },
    role: { en: 'White rabbit, curious and a little shy. Maths, puzzles, logic and patterns.', hi: 'सफ़ेद खरगोश, जिज्ञासु और थोड़ा शर्मीला। गणित, पहेलियाँ, तर्क।' },
    voice: { en: 'Soft, quick, precise.', hi: 'मुलायम, तेज़, सटीक।' },
    joins: ['academic', 'mind', 'art', 'stem'],
  },
  gauri: {
    key: 'gauri', legacyKeys: [], kind: 'cow', heightWu: 8,
    name: { en: 'Gauri', hi: 'गौरी' },
    role: { en: 'Gentle protective cow. Agriculture, nature, animals, nutrition, kindness.', hi: 'कोमल, रक्षक गाय। खेती, प्रकृति, जानवर, पोषण, दया।' },
    voice: { en: 'Calm, deep, slow.', hi: 'शांत, गहरी, धीमी।' },
    joins: ['nature', 'academic', 'explore'],
  },
  nandu: {
    key: 'nandu', legacyKeys: ['dhanu'], kind: 'calf', heightWu: 4.5,
    name: { en: 'Nandu', hi: 'नंदू' },
    role: { en: 'Small brown-and-white calf who follows Gauri. Simple activities and funny moments.', hi: 'छोटा भूरा-सफ़ेद बछड़ा जो गौरी के पीछे चलता है। आसान गतिविधियाँ और हँसी।' },
    voice: { en: 'Innocent, squeaky.', hi: 'मासूम, पतली आवाज़।' },
    joins: ['nature', 'music', 'explore'],
  },
  mitthu: {
    key: 'mitthu', legacyKeys: [], kind: 'parrot', heightWu: 2,
    name: { en: 'Mitthu', hi: 'मिट्ठू' },
    role: { en: 'Mountain parrot. Revision only: repeats key clauses, Chintu repeats after him.', hi: 'पहाड़ी तोता। केवल दोहराव: मुख्य बातें दोहराता है।' },
    voice: { en: 'Chirpy, rhythmic, musical lilt.', hi: 'चहकती, लयबद्ध आवाज़।' },
    joins: ['music'],
  },
};

export function canonicalCharacter(key: string): CharacterKey | null {
  if (key in CHARACTERS) return key as CharacterKey;
  if (key in CHARACTER_ALIASES) return CHARACTER_ALIASES[key as LegacyCharacterKey];
  return null;
}

/** Rewrites legacy character keys inside any string-keyed record (e.g. a script line's speaker). */
export function characterName(key: string, lang: 'en' | 'hi' | string): string {
  const k = canonicalCharacter(key);
  if (!k) return key;
  const n = CHARACTERS[k].name;
  return lang === 'hi' ? n.hi : n.en;
}
