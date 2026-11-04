import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/siteConfig";

// Read at request time: the preview password is set on the host, not at build.
export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  // Private preview (SITE_ACCESS_PASSWORD set): ask every crawler to stay away.
  if (process.env.SITE_ACCESS_PASSWORD) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
