/**
 * Renders a single JSON-LD `<script>` tag. Section 24: only used where
 * the page's actual content supports the schema type — never to
 * manipulate search results with schema the page doesn't back up.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  // `data` is server-generated from our own database fields (job titles,
  // descriptions, ...), not raw request input — but those fields are
  // admin-entered free text rendered on every public visitor's page. A
  // title containing `</script><script>...` would otherwise break out of
  // this tag and run as a stored XSS against the whole site, not just
  // whoever entered it. Escaping `<` (as the standard `<` JSON
  // escape) makes that sequence inert without touching the JSON's
  // meaning — `<` never needs to appear unescaped in a script body.
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
