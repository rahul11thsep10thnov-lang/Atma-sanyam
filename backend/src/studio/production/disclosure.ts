import { getLanguageProfile } from "../language/languageProfiles";

/**
 * "Visual reconstruction" disclosure, in every supported language. Cinematic
 * shots are illustrated reconstructions, never camera footage, and every
 * published frame says so in the viewer's language.
 */
export const DISCLOSURE_TEXT: Record<string, string> = {
  hi: "दृश्य पुनर्निर्माण",
  en: "Visual reconstruction",
  bn: "দৃশ্য পুনর্গঠন",
  mr: "दृश्य पुनर्रचना",
  gu: "દૃશ્ય પુનર્રચના",
  ta: "காட்சி மறுஉருவாக்கம்",
  te: "దృశ్య పునర్నిర్మాణం",
  kn: "ದೃಶ್ಯ ಪುನರ್ನಿರ್ಮಾಣ",
  ml: "ദൃശ്യ പുനർനിർമ്മാണം",
  pa: "ਦ੍ਰਿਸ਼ ਪੁਨਰ-ਨਿਰਮਾਣ",
  or: "ଦୃଶ୍ୟ ପୁନର୍ନିର୍ମାଣ",
  as: "দৃশ্য পুনৰ্গঠন",
};

export function disclosureText(languageCode: string | null | undefined): string {
  return DISCLOSURE_TEXT[languageCode ?? "en"] ?? DISCLOSURE_TEXT.en;
}

function assTime(s: number): string {
  const cs = Math.max(0, Math.round(s * 100));
  const h = Math.floor(cs / 360000);
  const m = Math.floor((cs % 360000) / 6000);
  const sec = Math.floor((cs % 6000) / 100);
  return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}.${String(cs % 100).padStart(2, "0")}`;
}

/**
 * The disclosure as an ASS overlay (top-right, translucent box), rendered by
 * libass with complex shaping so Indic conjuncts are correct — drawtext
 * cannot shape these scripts.
 */
export function disclosureAss(languageCode: string | null | undefined, durationSeconds: number, opts: { width: number; height: number }): string {
  const lang = languageCode ?? "en";
  const font = getLanguageProfile(lang)?.notoFont ?? "Noto Sans";
  const size = Math.round(opts.height / 52);
  const margin = Math.round(opts.width * 0.035);
  return [
    "[Script Info]",
    "ScriptType: v4.00+",
    `PlayResX: ${opts.width}`,
    `PlayResY: ${opts.height}`,
    "ScaledBorderAndShadow: yes",
    "",
    "[V4+ Styles]",
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
    // Alignment 9 = top-right; BorderStyle 3 = opaque box behind the text
    `Style: Disclosure,${font},${size},&H26FFFFFF,&H26FFFFFF,&H8C000000,&H8C000000,0,0,0,0,100,100,0,0,3,${Math.max(2, Math.round(size / 4))},0,9,${margin},${margin},${Math.round(opts.height * 0.035)},1`,
    "",
    "[Events]",
    "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
    `Dialogue: 0,${assTime(0)},${assTime(durationSeconds + 1)},Disclosure,,0,0,0,,${disclosureText(lang)}`,
    "",
  ].join("\n");
}
