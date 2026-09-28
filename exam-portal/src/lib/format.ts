const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

/** Consistent date rendering across every card/detail page. Never guesses
 * a value when one is missing — that's the caller's job to label clearly
 * (Section 9: "Not specified in the available notification."). */
export function formatDate(date: Date | null | undefined): string | null {
  if (!date) return null;
  return dateFormatter.format(date);
}
