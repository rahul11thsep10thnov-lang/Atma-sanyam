export const locales = ["en", "hi", "mr", "kn", "ta", "te"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const localeNames: Record<Locale, { native: string; english: string }> = {
  en: { native: "English", english: "English" },
  hi: { native: "हिन्दी", english: "Hindi" },
  mr: { native: "मराठी", english: "Marathi" },
  kn: { native: "ಕನ್ನಡ", english: "Kannada" },
  ta: { native: "தமிழ்", english: "Tamil" },
  te: { native: "తెలుగు", english: "Telugu" }
};

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}
