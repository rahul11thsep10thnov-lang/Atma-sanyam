/** /ads.txt for Google AdSense, generated from NEXT_PUBLIC_ADSENSE_CLIENT
 * (ca-pub-XXXXXXXX → pub-XXXXXXXX). Empty file when ads are not set up. */
export function GET() {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? "";
  const pub = client.replace(/^ca-/, "");
  const body = pub ? `google.com, ${pub}, DIRECT, f08c47fec0942fa0\n` : "";
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
