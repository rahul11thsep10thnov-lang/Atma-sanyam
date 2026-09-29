import type { Crumb } from "./Breadcrumbs";
import type { AttractionRecord } from "@/lib/master/types";
import type { DestinationView } from "@/lib/master/view";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://budgettourism.com";

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

export function DestinationJsonLd({ view, locale, description }: { view: DestinationView; locale: string; description: string }) {
  const d = view.record;
  const image = view.heroImage.url;
  return (
    <Script
      data={{
        "@context": "https://schema.org",
        "@type": "TouristDestination",
        name: d.name,
        description,
        url: `${SITE_URL}/${locale}${view.path}`,
        image: image.startsWith("data:") ? undefined : image,
        geo: { "@type": "GeoCoordinates", latitude: d.latitude, longitude: d.longitude },
        address: { "@type": "PostalAddress", addressRegion: view.state.name, addressCountry: "IN" }
      }}
    />
  );
}

export function AttractionJsonLd({ attraction, destinationName, stateName, url }: { attraction: AttractionRecord; destinationName: string; stateName: string; url: string }) {
  return (
    <Script
      data={{
        "@context": "https://schema.org",
        "@type": "TouristAttraction",
        name: attraction.name,
        description: attraction.short_description,
        url: `${SITE_URL}${url}`,
        geo: { "@type": "GeoCoordinates", latitude: attraction.latitude, longitude: attraction.longitude },
        address: { "@type": "PostalAddress", addressLocality: destinationName, addressRegion: stateName, addressCountry: "IN" }
      }}
    />
  );
}

export function TripJsonLd({ name, description, url, stops }: { name: string; description: string; url: string; stops: Array<{ name: string; url: string }> }) {
  return (
    <Script
      data={{
        "@context": "https://schema.org",
        "@type": "Trip",
        name,
        description,
        url: `${SITE_URL}${url}`,
        itinerary: {
          "@type": "ItemList",
          itemListElement: stops.map((s, i) => ({ "@type": "ListItem", position: i + 1, name: s.name, url: `${SITE_URL}${s.url}` }))
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
