/** Indian mobile numbers: 10 digits starting 6–9, optional +91 / 91 / 0
 * prefix, spaces and dashes ignored. Stored as E.164 (+91XXXXXXXXXX). */
export function normalizeIndianMobile(input: string): string | null {
  const digits = String(input ?? "").replace(/[\s\-()]/g, "");
  const m = /^(?:\+?91|0)?([6-9]\d{9})$/.exec(digits);
  return m ? `+91${m[1]}` : null;
}

/** "+919876543210" → "98XXXXXX10" for admin lists and logs. */
export function maskMobile(e164: string): string {
  const d = e164.replace(/^\+91/, "");
  return d.length === 10 ? `${d.slice(0, 2)}XXXXXX${d.slice(8)}` : "XXXXXXXXXX";
}
