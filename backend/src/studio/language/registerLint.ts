import { LintFlag } from "../types";

// Words and phrases that break the formal news register. Deliberately
// short, high-precision lists per language; extend as editors find more.
const SLANG_OR_COLLOQUIAL: Record<string, string[]> = {
  en: ["gonna", "wanna", "gotta", "dude", "bro", "lol", "omg", "kinda", "sorta", "ain't", "y'all", "cops", "hubby", "wifey", "in-laws from hell"],
  hi: ["यार", "अबे", "ओए", "भैया जी", "जुगाड़", "पंगा", "लफड़ा", "बवाल", "टेंशन"],
  bn: ["মামা", "ঝামেলা", "বাওয়াল"],
  mr: ["लफडा", "राडा", "भानगड"],
  gu: ["લફડું", "બબાલ"],
  ta: ["மச்சான்"],
  te: ["రా బాబు", "గొడవరా"],
  kn: ["ಮಚ್ಚಾ"],
  ml: ["അളിയാ", "മച്ചാ"],
  pa: ["ਯਾਰ", "ਪੰਗਾ"],
  or: ["ଝାମେଲା"],
  as: ["ভাইটি"],
};
const ABUSIVE: Record<string, string[]> = {
  en: ["bloody", "damn", "idiot", "stupid", "bastard", "moron", "shameless", "scum", "monster", "beast"],
  hi: ["साला", "साली", "कमीना", "कमीनी", "हरामी", "बेशर्म", "दरिंदा", "हैवान"],
  bn: ["শালা", "হারামি"],
  mr: ["साला", "हरामखोर", "नालायक"],
  gu: ["સાલો", "હરામી"],
  ta: ["பொறுக்கி"],
  te: ["దొంగ వెధవ"],
  kn: ["ಬೋಳಿಮಗ"],
  ml: ["തെണ്ടി"],
  pa: ["ਸਾਲਾ"],
  or: [],
  as: [],
};
const SENSATIONAL: Record<string, string[]> = {
  en: ["shocking", "horrifying", "horrific", "brutal", "gruesome", "jaw-dropping", "you won't believe", "bombshell", "sensational", "heart-wrenching", "spine-chilling", "chilling", "savage", "nightmare"],
  hi: ["सनसनीखेज", "खौफनाक", "दिल दहला देने वाला", "दिल दहला", "हैरान कर देने वाला", "रोंगटे खड़े", "शर्मनाक", "दर्दनाक", "वहशी"],
  bn: ["চাঞ্চল্যকর", "ভয়ঙ্কর", "লোমহর্ষক"],
  mr: ["खळबळजनक", "भयानक", "थरारक"],
  gu: ["સનસનીખેજ", "ભયાનક", "ચોંકાવનારું"],
  ta: ["அதிர்ச்சி", "பயங்கர", "கொடூர"],
  te: ["సంచలన", "దారుణ", "భయంకర"],
  kn: ["ಬೆಚ್ಚಿಬೀಳಿಸುವ", "ಭೀಕರ", "ಸಂಚಲನ"],
  ml: ["ഞെട്ടിക്കുന്ന", "ഭീകര", "ക്രൂര"],
  pa: ["ਸਨਸਨੀਖੇਜ਼", "ਭਿਆਨਕ", "ਦਿਲ ਦਹਿਲਾ"],
  or: ["ଚାଞ୍ଚଲ୍ୟକର", "ଭୟଙ୍କର"],
  as: ["চাঞ্চল্যকৰ", "ভয়ংকৰ"],
};

const EMOJI = /\p{Extended_Pictographic}/u;

function containsTerm(text: string, term: string, latin: boolean): boolean {
  if (latin) return new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text);
  return text.includes(term);
}

/**
 * Register lint (brief §7): flags slang, abusive words, colloquialisms,
 * internet language and sensational phrasing in any language's script.
 * Abuse is BLOCKING; the rest are WARNINGS for the editor.
 */
export function lintRegister(text: string, languageCode: string, sceneNumber?: number): LintFlag[] {
  const flags: LintFlag[] = [];
  const langs = languageCode === "en" ? ["en"] : [languageCode, "en"]; // English words also creep into Indic scripts
  for (const lang of langs) {
    const latin = lang === "en";
    for (const term of ABUSIVE[lang] ?? []) {
      if (containsTerm(text, term, latin)) flags.push({ rule: "ABUSIVE_LANGUAGE", severity: "BLOCKING", sceneNumber, excerpt: term, suggestion: "Remove abusive or insulting words." });
    }
    for (const term of SLANG_OR_COLLOQUIAL[lang] ?? []) {
      if (containsTerm(text, term, latin)) flags.push({ rule: "SLANG_OR_COLLOQUIAL", severity: "WARNING", sceneNumber, excerpt: term, suggestion: "Use standard, formal news language." });
    }
    for (const term of SENSATIONAL[lang] ?? []) {
      if (containsTerm(text, term, latin)) flags.push({ rule: "SENSATIONAL_LANGUAGE", severity: "WARNING", sceneNumber, excerpt: term, suggestion: "State facts plainly without dramatic adjectives." });
    }
  }
  if (/!/.test(text)) flags.push({ rule: "EXCLAMATION", severity: "WARNING", sceneNumber, excerpt: "!", suggestion: "News narration does not use exclamations." });
  if (EMOJI.test(text)) flags.push({ rule: "EMOJI_OR_INTERNET_LANGUAGE", severity: "BLOCKING", sceneNumber, suggestion: "Remove emoji." });
  if (/\b[A-Z]{5,}\b/.test(text) && languageCode === "en" && !/\b(POCSO|NCPCR)\b/.test(text)) {
    flags.push({ rule: "SHOUTING_CAPS", severity: "WARNING", sceneNumber, excerpt: text.match(/\b[A-Z]{5,}\b/)?.[0] });
  }
  return flags;
}
