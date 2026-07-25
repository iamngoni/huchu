/**
 * Renders structured data. Kept as a server component so schema ships in the
 * initial HTML where crawlers actually read it.
 */
export function JsonLd({ data }: { data: Record<string, unknown> | Array<Record<string, unknown>> }) {
  return (
    <script
      type="application/ld+json"
      // Schema objects are built server-side from our own catalog, never user input.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
