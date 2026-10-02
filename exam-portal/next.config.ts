import type { NextConfig } from "next";
import path from "node:path";

// Applies to every route, public and admin alike — a public exam portal
// still shouldn't be embeddable in a third-party frame, leak referrer
// query strings, or run without HSTS. Kept identical to the pattern in
// ../admin/next.config.ts so both CMS surfaces in this repo agree on a
// baseline, minus the blanket `X-Robots-Tag: noindex` that app applies
// (that app is a private console; this one has a public site that must
// be indexed — see src/app/robots.ts, which already disallows /admin).
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "same-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  // Node-only pipeline libraries (WASM/worker files, dynamic requires)
  // are loaded from node_modules at runtime rather than bundled.
  serverExternalPackages: ["pdfjs-dist", "tesseract.js", "cheerio"],
  // The repo root also has a lockfile (for the unrelated FOCUS app), which
  // makes Next.js guess the wrong workspace root. Pin it explicitly.
  turbopack: {
    root: path.resolve(__dirname),
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Defense in depth on top of robots.txt: even a crawler that
      // ignores robots.txt gets an explicit noindex on every admin
      // response.
      {
        source: "/admin/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;
