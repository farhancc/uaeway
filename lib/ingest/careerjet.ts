/**
 * Careerjet Partners API v4 — the primary job source.
 *
 * Careerjet is used because it is built for publishers: it expects us to show an
 * excerpt and link back to the original posting, which is exactly the posture
 * this site needs. Scraping job boards would breach their terms and expose us to
 * takedowns.
 *
 * Note for anyone porting the older prototype: the legacy
 * `public.api.careerjet.net/search` endpoint it used is closed to new partners
 * ("only accessible for authenticated legacy users") and was plain HTTP. v4 is
 * HTTPS with Basic auth, and the field names differ.
 *
 * Docs: https://www.careerjet.com/partners/api
 */

const ENDPOINT = "https://search.api.careerjet.net/v4/query";

export interface RawJob {
  title: string;
  company: string | null;
  sourceUrl: string;
  sourceName: string;
  locations: string | null;
  salary: string | null;
  description: string;
  postedAt: string;
}

export interface JobSearch {
  keywords: string;
  location: string;
}

interface V4Job {
  title?: string;
  company?: string;
  date?: string;
  description?: string;
  locations?: string;
  salary?: string;
  url?: string;
}

interface V4Response {
  type?: string;
  hits?: number;
  pages?: number;
  jobs?: V4Job[];
  error?: string;
}

function auth(): string | null {
  const key = process.env.CAREERJET_API_KEY;
  if (!key) return null;
  // Basic auth: API key as the username, empty password.
  return `Basic ${Buffer.from(`${key}:`).toString("base64")}`;
}

async function runSearch(search: JobSearch, header: string): Promise<RawJob[]> {
  const params = new URLSearchParams({
    locale_code: process.env.CAREERJET_LOCALE || "en_AE",
    keywords: search.keywords,
    location: search.location,
    sort: "date",
    page_size: process.env.CAREERJET_PAGE_SIZE || "20",
    // Both are required by the API. This is a scheduled batch, so there is no
    // end user to attribute; CAREERJET_USER_IP lets you set the server's
    // public address if Careerjet asks for a real one.
    user_ip: process.env.CAREERJET_USER_IP || "127.0.0.1",
    user_agent: "uae-gateway-ingest/1.0",
  });

  const res = await fetch(`${ENDPOINT}?${params}`, {
    headers: {
      Authorization: header,
      Accept: "application/json",
      Referer: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
    },
  });

  const data = (await res.json().catch(() => null)) as V4Response | null;

  if (!res.ok || data?.error) {
    console.warn(
      `[careerjet] ${search.keywords}/${search.location}: HTTP ${res.status}${data?.error ? ` — ${data.error}` : ""}`,
    );
    return [];
  }

  const jobs = data?.jobs ?? [];
  console.log(`[careerjet] ${search.keywords}/${search.location}: ${jobs.length} jobs`);

  return jobs
    .filter((j): j is V4Job & { title: string; url: string } => Boolean(j.title && j.url))
    .map((j) => ({
      title: j.title.trim(),
      company: j.company?.trim() || null,
      sourceUrl: j.url,
      sourceName: "Careerjet",
      locations: j.locations?.trim() || search.location,
      salary: j.salary?.trim() || null,
      // An excerpt only. We summarize this in our own words and link out; the
      // source text is never republished.
      description: (j.description || "").slice(0, 2000),
      postedAt: j.date ? new Date(j.date).toISOString() : new Date().toISOString(),
    }));
}

/** Runs every search and returns de-duplicated jobs. Never throws. */
export async function fetchCareerjet(searches: JobSearch[]): Promise<RawJob[]> {
  const header = auth();
  if (!header) {
    console.log("[careerjet] CAREERJET_API_KEY not set, skipping");
    return [];
  }

  const all: RawJob[] = [];
  for (const search of searches) {
    try {
      all.push(...(await runSearch(search, header)));
    } catch (err) {
      console.warn(
        `[careerjet] ${search.keywords}/${search.location} failed: ${(err as Error).message}`,
      );
    }
  }

  // The same job matches several searches; the source URL is the identity.
  const seen = new Set<string>();
  return all.filter((j) => (seen.has(j.sourceUrl) ? false : (seen.add(j.sourceUrl), true)));
}
