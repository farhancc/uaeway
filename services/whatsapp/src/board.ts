import { config } from "./config.js";

/**
 * The approved listings, read from the site.
 *
 * Only approved ones exist here at all — `/api/digest?format=json` is the
 * public board's own query, so a listing waiting in the review queue, one that
 * expired, and one past the employer's closing date are all already absent.
 * The worker never has to decide what is postable.
 *
 * It asks for rows rather than the ready-made digest text because it posts
 * every hour and must not repeat itself: it needs the slugs to compare against
 * what it has already sent. See `posted.ts`.
 */

export interface BoardJob {
  slug: string;
  title: string;
  company: string | null;
  emirate: string | null;
  category: string | null;
  summary: string | null;
  /** Verbatim employer text, or null. Never quoted as anything else. */
  salaryText: string | null;
  postedAt: string | null;
  url: string;
}

export async function fetchApprovedJobs(): Promise<BoardJob[]> {
  const url = new URL(config.digestUrl);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", String(config.boardPoolSize));

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${config.cronSecret}` },
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    throw new Error(`digest endpoint returned HTTP ${res.status}`);
  }

  const data = (await res.json()) as { jobs?: BoardJob[] };
  return data.jobs ?? [];
}
