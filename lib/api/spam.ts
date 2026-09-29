export interface SpamAssessment {
  score: number;
  reasons: string[];
  flagged: boolean;
}

/**
 * Cheap, explainable spam heuristics for user reviews. A flagged review is not deleted:
 * it goes to the moderation queue (status FLAGGED) for a human to approve or reject.
 */
export function assessSpam(text: string): SpamAssessment {
  const reasons: string[] = [];
  let score = 0;
  const t = text.trim();

  const links = (t.match(/https?:\/\/|www\./gi) ?? []).length;
  if (links >= 1) { score += 2 * links; reasons.push(`${links} link(s)`); }
  if (/(.)\1{7,}/.test(t)) { score += 2; reasons.push("long repeated characters"); }
  const letters = t.replace(/[^A-Za-z]/g, "");
  if (letters.length > 30 && letters.replace(/[^A-Z]/g, "").length / letters.length > 0.7) { score += 2; reasons.push("mostly capital letters"); }
  if (/\b(\+?\d[\d\s-]{8,}\d)\b/.test(t)) { score += 2; reasons.push("phone number"); }
  if (/\b(whatsapp|telegram|call now|click here|earn money|cheap tickets|best price guaranteed)\b/i.test(t)) { score += 3; reasons.push("promotional wording"); }
  const words = t.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length >= 12 && new Set(words).size / words.length < 0.4) { score += 2; reasons.push("highly repetitive text"); }
  if (t.length < 15) { score += 1; reasons.push("very short"); }

  return { score, reasons, flagged: score >= 3 };
}
