import { Header } from "@/components/layout/Header";
import { MottoBand } from "@/components/layout/MottoBand";
import { CtaTabs } from "@/components/layout/CtaTabs";
import { Footer } from "@/components/layout/Footer";
import { JsonLd } from "@/components/JsonLd";
import { SITE_NAME, SITE_DESCRIPTION, SITE_URL } from "@/lib/siteConfig";

/**
 * Wraps every public-facing page (homepage, search, and every content
 * page added from Phase 5 onward) with the shared shell: header, the
 * motto band, the CTA tabs that serve as primary navigation, and the
 * footer. `/admin/*` and `/api/*` are outside this route group.
 */
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Site-wide structured data (Section 24) — genuinely describes
          this site (an independent portal, not a government body), so
          it's safe to emit on every public page. */}
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: SITE_NAME,
          url: SITE_URL,
          description: SITE_DESCRIPTION,
          potentialAction: {
            "@type": "SearchAction",
            target: `${SITE_URL}/search?q={search_term_string}`,
            "query-input": "required name=search_term_string",
          },
        }}
      />
      <Header />
      <MottoBand />
      <CtaTabs />
      <div className="flex-1">{children}</div>
      <Footer />
    </div>
  );
}
