import type { Crumb } from "./Breadcrumbs";
import type { Destination } from "@/lib/types";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://triptoe.com";

function Script({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function BreadcrumbJsonLd({ items }: { items: Crumb[] }) {
  return (
    <Script
      data={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: item.label,
          item: `${SITE_URL}${item.href}`
        }))
      }}
    />
  );
}

export function DestinationJsonLd({ destination, locale }: { destination: Destination; locale: string }) {
  const url = `${SITE_URL}/${locale}/india/${destination.stateSlug}/${destination.slug}`;
  return (
    <Script
      data={{
        "@context": "https://schema.org",
        "@type": "TouristDestination",
        name: destination.name,
        description: destination.shortDescription,
        url,
        image: destination.heroImage.url.startsWith("data:") ? undefined : destination.heroImage.url,
        geo: {
          "@type": "GeoCoordinates",
          latitude: destination.latitude,
          longitude: destination.longitude
        },
        address: {
          "@type": "PostalAddress",
          addressRegion: destination.state,
          addressCountry: "IN"
        }
      }}
    />
  );
}

export function FaqJsonLd({ faqs }: { faqs: Array<{ question: string; answer: string }> }) {
  if (faqs.length === 0) return null;
  return (
    <Script
      data={{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: { "@type": "Answer", text: faq.answer }
        }))
      }}
    />
  );
}
