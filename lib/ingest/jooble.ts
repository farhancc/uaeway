/**
 * Jooble API — the job source.
 *
 * Chosen after testing the alternatives against the only thing that matters
 * here, which is whether they carry UAE jobs at all:
 *
 *   Arbeitnow      no key   0 UAE listings of 325
 *   The Muse       no key   0 UAE listings across 60
 *   Jobicy         no key   remote boards only
 *   Adzuna         free tier, but no adzuna.ae — no UAE market
 *   Jooble         free key, ae.jooble.org exists
 *
 * There is no free, keyless, general UAE feed. Jooble is free, covers the
 * Emirates, and like Careerjet is built for publishers: show an excerpt, link
 * back to the original posting. Scraping the Gulf boards directly would breach
 * their terms, and they block server-side requests anyway.
 *
 * Key: https://jooble.org/api/about — a short form, no charge.
 */

import { dedupe, type JobSearch, type RawJob } from "./source";

const ENDPOINT = "https://jooble.org/api";

interface JoobleJob {
  title?: string;
  location?: string;
  snippet?: string;
  salary?: string;
  source?: string;
  type?: string;
  link?: string;
  company?: string;
  updated?: string;
  id?: number;
}

interface JoobleResponse {
  totalCount?: number;
  jobs?: JoobleJob[];
}

/** Jooble returns HTML in `snippet` — bold tags around the matched terms. The
 *  text is summarised by the model and never shown raw, but it should not carry
 *  markup into the prompt or the review queue. */
function plain(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

async function runSearch(search: JobSearch, key: string): Promise<RawJob[]> {
  const res = await fetch(`${ENDPOINT}/${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      keywords: search.keywords,
      location: search.location,
      page: "1",
      // Jooble caps this itself; asking for more than it will give is harmless.
      ResultOnPage: Number(process.env.JOOBLE_PAGE_SIZE || 20),
    }),
  });

  if (!res.ok) {
    const body = (await res.text().catch(() => "")).slice(0, 200);
    console.warn(
      `[jooble] ${search.keywords}/${search.location}: HTTP ${res.status}${body ? ` — ${body}` : ""}`,
    );
    return [];
  }

  const data = (await res.json().catch(() => null)) as JoobleResponse | null;
  const jobs = data?.jobs ?? [];
  console.log(`[jooble] ${search.keywords}/${search.location}: ${jobs.length} jobs`);

  return jobs
    .filter((j): j is JoobleJob & { title: string; link: string } => Boolean(j.title && j.link))
    .map((j) => ({
      title: plain(j.title),
      company: j.company?.trim() || null,
      sourceUrl: j.link,
      // Jooble aggregates: `source` names the board the ad came from, which is
      // the honest attribution to show. Fall back to Jooble itself.
      sourceName: j.source?.trim() || "Jooble",
      locations: plain(j.location ?? "") || search.location,
      salary: j.salary?.trim() || null,
      description: plain(j.snippet ?? "").slice(0, 2000),
      postedAt: j.updated ? new Date(j.updated).toISOString() : new Date().toISOString(),
    }));
}

/** Runs every search and returns de-duplicated jobs. Never throws: the ingest
 *  must degrade to fewer listings, not die half way through. */
export async function fetchJooble(searches: JobSearch[]): Promise<RawJob[]> {
  const key = process.env.JOOBLE_API_KEY;
  if (!key) {
    console.log("[jooble] JOOBLE_API_KEY not set, skipping");
    return [];
  }

  const all: RawJob[] = [];
  for (const search of searches) {
    try {
      all.push(...(await runSearch(search, key)));
    } catch (err) {
      console.warn(
        `[jooble] ${search.keywords}/${search.location} failed: ${(err as Error).message}`,
      );
    }
  }

  return dedupe(all);
}
