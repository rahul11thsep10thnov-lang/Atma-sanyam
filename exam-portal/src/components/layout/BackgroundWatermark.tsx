/**
 * Decorative full-site watermark: the six-panel line-art sits in a fixed,
 * click-through layer behind everything, with a translucent white wash
 * above it. Rendered once from the root layout — never per page.
 *
 * Asset: public/watermark.webp (path, size mode, opacity and wash are all
 * CSS variables on :root in globals.css). If the file is missing the
 * layer is simply blank, so the site renders normally without it.
 */
export function BackgroundWatermark() {
  return (
    <>
      <div className="background-watermark" aria-hidden="true" />
      <div className="watermark-overlay" aria-hidden="true" />
    </>
  );
}
