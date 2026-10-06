/** Structured data. Kept as one component so every page emits it the same way. */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // The payload is built by us from our own data, never from user input.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

export function breadcrumbs(
  siteUrl: string,
  items: { name: string; path: string }[],
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${siteUrl}${item.path}`,
    })),
  };
}

/**
 * An ordered list of internal pages, for index pages that were previously
 * emitting no structured data at all — the listing is the substance of a
 * category page, so it is what the markup should describe.
 */
export function itemList(
  siteUrl: string,
  items: { name: string; path: string }[],
): Record<string, unknown> {
  return {
    "@type": "ItemList",
    numberOfItems: items.length,
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      url: `${siteUrl}${item.path}`,
    })),
  };
}
