import { config } from "./config.js";
import type { Listing } from "./listing.js";

/**
 * Hands the scraped listings to the site.
 *
 * The site owns what a listing becomes — the Gemini summary, the emirate, the
 * category, the documents, the slug, the duplicate check and whether it needs
 * a human before going public. None of that is re-implemented here, because
 * the copy on this laptop would be the one nobody re-reads. The worker finds
 * postings and posts them; `/api/ingest/jobs` decides what they are.
 */

/**
 * The site's own cap is 200 (`MAX_BATCH` in `lib/ingest/schema.ts`), but what
 * limits a request here is time, not size — the route runs every listing
 * through Gemini before answering. See `config.ingestBatch`.
 */
const MAX_BATCH = 200;

export interface PushResult {
  fetched: number;
  inserted: number;
  skipped: number;
  enriched: number;
  approved: number;
}

const EMPTY: PushResult = { fetched: 0, inserted: 0, skipped: 0, enriched: 0, approved: 0 };

async function postBatch(batch: Listing[]): Promise<PushResult> {
  const res = await fetch(config.ingestUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.cronSecret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ jobs: batch }),
    // The site runs every listing through Gemini before answering, and allows
    // itself 300 seconds to do it.
    signal: AbortSignal.timeout(300_000),
  });

  const body = (await res.text().catch(() => "")).slice(0, 500);

  if (!res.ok) {
    throw new Error(`ingest endpoint returned HTTP ${res.status}${body ? ` — ${body}` : ""}`);
  }

  const parsed = JSON.parse(body) as Partial<PushResult>;
  return { ...EMPTY, ...parsed };
}

/**
 * Pushes every listing, in batches the endpoint will accept.
 *
 * A failed batch is logged and the rest still go: a run that found eighty
 * postings should not lose all of them because one request timed out. The
 * listings it lost are not tracked for retry — Google will return them again
 * on the next run, and the site skips what it already holds.
 */
export async function pushListings(listings: Listing[]): Promise<PushResult> {
  if (listings.length === 0) return EMPTY;

  const total = { ...EMPTY };

  const size = Math.min(Math.max(config.ingestBatch, 1), MAX_BATCH);

  for (let i = 0; i < listings.length; i += size) {
    const batch = listings.slice(i, i + size);
    try {
      const result = await postBatch(batch);
      total.fetched += result.fetched;
      total.inserted += result.inserted;
      total.skipped += result.skipped;
      total.enriched += result.enriched;
      total.approved += result.approved;
    } catch (err) {
      // Logged and skipped rather than retried: Google returns the same
      // postings on the next run, and the site skips what it already holds.
      console.error(`[push] batch of ${batch.length} failed: ${(err as Error).message}`);
    }
  }

  console.log(
    `[push] ${total.inserted} new listings on the site — ${total.approved} approved, ` +
      `${total.inserted - total.approved} waiting for review, ${total.skipped} already held`,
  );
  return total;
}
