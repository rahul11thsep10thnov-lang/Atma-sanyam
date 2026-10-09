/** Fixed, full-screen, low-opacity background: the recruits photo. Sits behind
 * every page; cards stay readable on top. */
export default function Watermark() {
  return (
    <div className="watermark" aria-hidden>
      <div className="watermark-photo" />
    </div>
  );
}
