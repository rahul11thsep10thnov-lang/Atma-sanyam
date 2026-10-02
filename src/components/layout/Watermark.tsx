/** Fixed, low-opacity background: the police group photo with the logo in
 * the middle. Sits behind every page; cards stay readable on top. */
export default function Watermark() {
  return (
    <div className="watermark" aria-hidden>
      <div className="watermark-photo" />
      <div className="watermark-logo" />
    </div>
  );
}
