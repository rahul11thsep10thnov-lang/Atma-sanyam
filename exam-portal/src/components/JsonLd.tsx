/**
 * Renders a single JSON-LD `<script>` tag. Section 24: only used where
 * the page's actual content supports the schema type — never to
 * manipulate search results with schema the page doesn't back up.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    // JSON-LD has to be a literal script body; `data` is server-generated
    // from our own database fields, never raw user input.
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
