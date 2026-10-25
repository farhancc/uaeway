/**
 * The shape of a listing on the wire to the site.
 *
 * This mirrors `rawJobInput` in the site's `lib/ingest/schema.ts`, which is the
 * authority — it validates every field on arrival and will reject anything
 * this gets wrong. The duplication is deliberate and unavoidable: the worker is
 * a separate npm package with its own dependency tree, so it cannot import the
 * site's types, exactly as any other API client could not.
 *
 * If you change a field here, change it there.
 */
export interface Listing {
  title: string;
  company: string | null;
  sourceUrl: string;
  sourceName: string;
  locations: string | null;
  /** Verbatim employer text, or null. Never a figure this worker worked out. */
  salary: string | null;
  description: string;
  /** ISO 8601. */
  postedAt: string;
}
