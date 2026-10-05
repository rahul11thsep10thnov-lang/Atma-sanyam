/** The site is English-only (the language switch was removed by request).
 * Kept as a single place so pages that used to branch on language still
 * compile and always render English. */
export type Lang = "en" | "hi";

export async function resolveLang(_param?: string | null): Promise<Lang> {
  void _param;
  return "en";
}
