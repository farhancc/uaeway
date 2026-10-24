import { config } from "./config.js";

/**
 * The approved listings, read from the site.
 *
 * Only approved ones exist here at all — `/api/digest?format=json` is the
 * public board's own query, so a listing waiting in the review queue, one that
 * expired, and one past the employer's closing date are all already absent.
 * The worker never has to decide what is postable.
 *
 * It reads rows rather than the ready-made digest text because it posts every
 * hour and must not repeat itself: it needs the slugs to compare against what
 * it has already sent. See `posted.ts`.
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

interface Page {
  jobs: BoardJob[];
  total: number;
}

async function fetchPage(limit: number, offset: number): Promise<Page> {
  const url = new URL(config.digestUrl);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("offset", String(offset));

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${config.cronSecret}` },
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    throw new Error(`digest endpoint returned HTTP ${res.status}`);
  }

  const data = (await res.json()) as { jobs?: BoardJob[]; total?: number };
  const jobs = data.jobs ?? [];
  return { jobs, total: data.total ?? jobs.length };
}

/**
 * Enough unsent listings to fill one message.
 *
 * This pages rather than reading one batch, and the reason is the whole point
 * of the function. The board holds a couple of hundred approved listings and a
 * message carries three, so "ask for the newest sixty and skip what was sent"
 * stops working the moment those sixty have all gone out: every later run
 * would find nothing new and the group would go quiet for good, with the rest
 * of the board still unposted. Measured on 2026-10-24 that was 161 of 221
 * listings that could never have been posted.
 *
 * So it walks from the newest until it has `want` the posted log has not seen,
 * or until the board runs out. Newest-first means a freshly approved listing
 * goes out in the next message rather than behind the backlog, and the backlog
 * drains from the far end as capacity allows.
 *
 * The walk restarts from the first page on every run. Remembering a cursor
 * would be wrong: approvals, expiries and closing dates all change what is on
 * the board between runs, so an offset from an hour ago points somewhere else
 * now. Re-walking costs a handful of queries and is always correct.
 */
export async function fetchUnpostedJobs(
  want: number,
  seen: (jobs: BoardJob[]) => Promise<BoardJob[]>,
): Promise<{ ready: BoardJob[]; approved: number }> {
  const pageSize = config.boardPoolSize;
  const ready: BoardJob[] = [];
  let offset = 0;
  let total = 0;

  // Bounded so a board that keeps growing, or a `total` that disagrees with
  // what the pages return, cannot spin here.
  for (let page = 0; page < MAX_PAGES; page++) {
    const result = await fetchPage(pageSize, offset);
    total = result.total;

    if (result.jobs.length === 0) break;

    ready.push(...(await seen(result.jobs)));
    if (ready.length >= want) break;

    offset += result.jobs.length;
    if (offset >= total) break;
  }

  return { ready: ready.slice(0, want), approved: total };
}

/** 100 is the endpoint's own cap per page, so this covers 2,000 listings. */
const MAX_PAGES = 20;
