import { config } from "./config.js";
import type { Listing } from "./listing.js";

/**
 * Jobs from Google, through Serper.
 *
 * The thing to understand before touching this file: **a Google search for
 * "accountant jobs in Dubai" does not return jobs.** It returns boards'
 * category pages — `bayt.com/en/uae/jobs/accountant-jobs/`,
 * `dubizzle.com/jobs/accounting-finance/`, `gulftalent.com/jobs/category/
 * accounting` — whose titles read like job titles and whose snippets are six
 * unrelated roles mashed together. Measured on 2026-10-23, the first page of
 * that query was ten out of ten category pages and zero postings.
 *
 * Feeding one of those into the ingest produces a listing for a role that
 * nobody advertised, with a Gemini summary invented from a page of links, on a
 * public jobs board and in a WhatsApp group. So this module's real job is not
 * fetching — it is refusing. Every result must match a URL pattern known to
 * identify one posting, and anything else is dropped without comment.
 *
 * Serper has no jobs vertical (`/jobs` answers 404), so this is `/search` with
 * a `site:` restriction narrowed to the URL prefix where a board keeps its
 * individual postings.
 */

/**
 * Where to look, and how to recognise one posting when it comes back.
 *
 * Both of these were measured rather than guessed — the yields below are real
 * counts from 2026-10-23, and they are why the filter is not optional:
 *
 *   ae.indeed.com/viewjob   10/10 and 10/10 postings (accountant, driver, nurse)
 *   bayt.com/en/uae/jobs     2/10 and  2/10 postings — the other eight are
 *                            category pages, told apart only by the numeric
 *                            posting id that a real listing's URL ends with
 *
 * Two boards that look obvious and are not: `gulftalent.com/jobs` returned
 * nothing but `/jobs/title/…` and `/jobs/category/…` index pages, and
 * `naukrigulf.com/job-listings` returned nothing at all. Neither is included.
 *
 * To add a board: run the search by hand first, look at the links, and only
 * then write a `listing` pattern that matches a posting and rejects that
 * board's own index pages. A target whose pattern is too loose is worse than
 * no target at all.
 */
interface Target {
  /** The `site:` restriction. A path prefix narrows it; Google honours that. */
  site: string;
  /** A result link must match this to count as a single posting. */
  listing: RegExp;
  /** The attribution shown on our listing. */
  sourceName: string;
  /**
   * Query parameters that carry the posting's identity. They are kept and
   * everything else is dropped, because the rest is tracking noise that would
   * split one posting into several rows — `source_url` is unique on the site.
   *
   * They are also required: `ae.indeed.com/viewjob` with no `jk` is a dead
   * link, not a listing, and its path alone matches the pattern.
   */
  identityParams?: string[];
}

const TARGETS: Target[] = [
  {
    site: "ae.indeed.com/viewjob",
    listing: /\/viewjob$/,
    sourceName: "Indeed",
    // `jk` is Indeed's posting id and the whole identity of the listing.
    identityParams: ["jk"],
  },
  {
    site: "bayt.com/en/uae/jobs",
    // A posting ends in its numeric id; a category page ends in "-jobs/" or
    // "-jobs-in-dubai/". Five digits or more, because the ids seen were 8.
    listing: /\/en\/uae\/jobs\/[^/]*-\d{5,}\/?$/,
    sourceName: "Bayt",
  },
];

interface SerperOrganic {
  title?: string;
  link?: string;
  snippet?: string;
  date?: string;
}

interface SerperResponse {
  organic?: SerperOrganic[];
  credits?: number;
}

/**
 * The link, reduced to the posting's identity.
 *
 * Google hands back whatever URL it indexed, tracking parameters included. Two
 * spellings of one posting would be two rows on the board and two messages in
 * the group, because the site keys a listing on `source_url`.
 *
 * Returns null for a URL that does not parse, and for one missing the
 * parameter that identifies the posting — nothing downstream should ever see a
 * string that is not a usable listing URL.
 */
function canonical(link: string, target: Target): string | null {
  let url: URL;
  try {
    url = new URL(link);
  } catch {
    return null;
  }

  const kept = new URLSearchParams();
  for (const name of target.identityParams ?? []) {
    const value = url.searchParams.get(name);
    // Missing identity means this is not a posting, whatever the path says.
    if (!value) return null;
    kept.set(name, value);
  }

  url.search = kept.toString();
  url.hash = "";
  return url.toString();
}

/**
 * A Google result title, as a job title.
 *
 * Google appends furniture and truncates what is left: the raw strings are
 * "Tax Accountant - Dubai - Indeed.com", "Accountant (Apply via link) - Dubai
 * Jobs", "Assistant Accountant cum Document Controller ...". All of it reaches
 * the slug and the WhatsApp message, so the trailing segments that are the
 * board's name or the city we searched for come off — repeatedly, because
 * there are usually two of them.
 *
 * Only a segment that is *exactly* a place or a board is removed. "Accountant
 * - Dubai Office" keeps its suffix, because that one is part of the job.
 *
 * A title Google truncated stays truncated. There is nothing here to restore
 * it from, and inventing the rest of someone's job title is not an option.
 *
 * Exported so it can be checked against real Google titles without spending a
 * credit; nothing else calls it.
 */
const TITLE_FURNITURE = new RegExp(
  "\\s*[-–—|]\\s*(" +
    [
      "Indeed\\.com",
      "Bayt\\.com",
      "Dubai Jobs",
      "Jobs in [A-Za-z ]+",
      "Dubai",
      "Abu Dhabi",
      "Sharjah",
      "Ajman",
      "Ras Al Khaimah",
      "Fujairah",
      "Umm Al Quwain",
      "UAE",
      "United Arab Emirates",
    ].join("|") +
    ")\\s*$",
  "i",
);

/** Two passes would do for everything seen; four is cheap and cannot loop. */
const MAX_FURNITURE_PASSES = 4;

/**
 * Labels an employer typed in front of the title instead of just writing it:
 * "Job Title: Civil / Structural Engineer". Google indexes the lot, and it
 * reached a WhatsApp post and a slug reading
 * `job-title-civil-structural-engineer` before this existed.
 *
 * Only a label followed by a colon, so "Position Available - Driver" keeps its
 * words and nothing that is part of a real title is touched.
 */
const TITLE_LABEL = /^\s*(job title|job|position|vacancy|post|role|hiring for)\s*:\s*/i;

/** Exported only so it can be checked against real Google titles without
 *  spending a Serper credit. Nothing else calls it. */
export function cleanTitle(raw: string): string {
  let title = raw.replace(/\s+/g, " ").replace(TITLE_LABEL, "").trim();

  for (let pass = 0; pass < MAX_FURNITURE_PASSES; pass++) {
    const stripped = title.replace(TITLE_FURNITURE, "").trim();
    if (stripped === title) break;
    // Never strip the whole thing: a listing titled only "Dubai Jobs" is
    // useless, but an empty title would be worse, and the caller drops it.
    if (stripped === "") break;
    title = stripped;
  }

  return title.replace(/\s*\.{3}$|\s*…$/, "").trim();
}

/** One query against one target. Never throws: a run must degrade to fewer
 *  listings rather than die part-way through. */
async function runQuery(
  keywords: string,
  location: string,
  target: Target,
): Promise<{ listings: Listing[]; credits: number }> {
  const q = `${keywords} ${location} site:${target.site}`;

  const res = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "X-API-KEY": config.serperKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ q, gl: "ae", num: config.serperNum }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const body = (await res.text().catch(() => "")).slice(0, 200);
    console.warn(`[serper] "${q}": HTTP ${res.status}${body ? ` — ${body}` : ""}`);
    return { listings: [], credits: 0 };
  }

  const data = (await res.json().catch(() => null)) as SerperResponse | null;
  const organic = data?.organic ?? [];
  const credits = data?.credits ?? 0;

  const listings: Listing[] = [];
  for (const result of organic) {
    const link = result.link;
    const title = result.title;
    if (!link || !title) continue;

    const url = canonical(link, target);
    // The refusal this module exists for. Matched against the canonical URL so
    // a pattern never has to allow for tracking parameters.
    if (!url || !target.listing.test(new URL(url).pathname)) continue;

    const cleaned = cleanTitle(title);
    if (!cleaned) continue;

    listings.push({
      title: cleaned,
      // Google does not give one. Bayt often puts it in the title ("… at
      // Careers International") but pulling it out of prose turns "Accountant
      // at Dubai Office" into an employer called Dubai Office, so the field
      // stays empty and the row carries its attribution instead.
      company: null,
      sourceUrl: url,
      sourceName: target.sourceName,
      // What we asked for, which is what the `site:` restriction and the query
      // together actually targeted.
      locations: location,
      // Deliberately never set. The snippets do carry pay — "AED6,000 - AED8,000
      // a month", "From AED5,000 a month" — but a regex over a Google snippet
      // drops the "From" and turns a floor into a fixed figure, and a wrong
      // salary is the most damaging thing this site can assert. The snippet
      // still reaches Gemini as the excerpt, and the prompt forbids it from
      // stating a salary. So the board shows no pay for these rather than a
      // number nobody promised.
      salary: null,
      description: (result.snippet ?? "").replace(/\s+/g, " ").trim().slice(0, 2000),
      // Serper rarely dates an organic result, and "2 days ago" is not a date.
      // Discovery time is honest and is what the Jooble source falls back to;
      // the site computes the shelf life from it.
      postedAt: isoOrNow(result.date),
      // The point of the filter above: this URL matched a pattern known to
      // identify one posting. The site reads this when deciding whether the
      // listing may skip the review queue.
      singleListingUrl: true,
    });
  }

  console.log(
    `[serper] "${q}": ${listings.length} postings from ${organic.length} results`,
  );
  return { listings, credits };
}

/** An absolute date if Serper gave one, otherwise now. Relative strings like
 *  "3 days ago" are not parsed — a guessed posting date sets a wrong expiry. */
function isoOrNow(raw: string | undefined): string {
  if (raw) {
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  return new Date().toISOString();
}

/**
 * Every keyword against every location against every target.
 *
 * One Serper credit per query, so the cost of a run is
 * `keywords × locations × targets`. With the defaults that is 6 × 2 × 2 = 24,
 * which is why the scrape runs on its own schedule and not once an hour — see
 * the credit arithmetic in the README.
 */
export async function fetchSerperListings(): Promise<Listing[]> {
  const byUrl = new Map<string, Listing>();
  let credits = 0;

  for (const keywords of config.serperKeywords) {
    for (const location of config.serperLocations) {
      for (const target of TARGETS) {
        try {
          const result = await runQuery(keywords, location, target);
          credits += result.credits;
          // The same posting answers several keywords; the URL is its identity,
          // and the site keys on it too.
          for (const listing of result.listings) {
            if (!byUrl.has(listing.sourceUrl)) byUrl.set(listing.sourceUrl, listing);
          }
        } catch (err) {
          console.warn(
            `[serper] "${keywords} ${location}" on ${target.site} failed: ${(err as Error).message}`,
          );
        }
      }
    }
  }

  console.log(`[serper] ${byUrl.size} distinct postings, ${credits} credits spent`);
  return [...byUrl.values()];
}
