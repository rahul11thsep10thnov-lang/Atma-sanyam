import { cookies } from "next/headers";

/** Site language (spec §22 bilingual EN/HI). `?lang=` wins over the cookie
 * so links can force a language; the cookie remembers the toggle. */
export type Lang = "en" | "hi";
export const LANG_COOKIE = "lang";

export function pickLang(param?: string | null, cookieValue?: string | null): Lang {
  if (param === "hi" || param === "en") return param;
  if (cookieValue === "hi" || cookieValue === "en") return cookieValue;
  return "en";
}

export async function resolveLang(param?: string | null): Promise<Lang> {
  const jar = await cookies();
  return pickLang(param, jar.get(LANG_COOKIE)?.value);
}

/** Append the language to a path only when it differs from the default. */
export function withLang(path: string, lang: Lang): string {
  if (lang === "en") return path;
  return `${path}${path.includes("?") ? "&" : "?"}lang=hi`;
}

/** Small bilingual dictionary for shared chrome. */
export const T = {
  en: { machineTranslated: "AI translation", switchTo: "हिन्दी", switchLang: "hi" as Lang, recruitments: "Recruitments", alerts: "Alerts" },
  hi: { machineTranslated: "AI अनुवाद", switchTo: "English", switchLang: "en" as Lang, recruitments: "भर्तियाँ", alerts: "अलर्ट" },
} as const;
