/**
 * The nightly job ingest: Careerjet -> Gemini -> `jobs` as status 'pending'.
 *
 * Nothing here publishes. Every row lands pending and waits for a human in the
 * admin queue, because an AI summary that misstates a salary or invents a
 * requirement is our problem once it is on our domain.
 */

import { generateJSON } from "../ai/gemini";
import { mapLimit } from "../async";
import { uniqueSlug } from "../slug";
import { supabaseAdmin } from "../supabase/admin";
import { JOB_CATEGORIES, normalizeEmirate } from "../uae";
import { fetchCareerjet, type JobSearch, type RawJob } from "./careerjet";

/** How long a listing stays on the site before the prune job expires it. */
const SHELF_LIFE_DAYS = 45;

/** One per pooled key: the pool is the real concurrency limit. */
const AI_CONCURRENCY = 5;

export interface IngestResult {
  fetched: number;
  inserted: number;
  skipped: number;
  enriched: number;
}

interface Enrichment {
  summary: string;
  emirate: string | null;
  category: string;
  documentsNeeded: string[];
}

function prompt(job: RawJob): string {
  return `You are writing a short entry for a UAE jobs site. Its readers are mostly expats who
will need certificates translated and attested before they can start work.

Return JSON with these keys:
- "summary": 2-3 plain sentences describing the role, in your own words. Do NOT copy phrases
  from the listing. No marketing language. If the listing is too vague to describe, say so
  plainly rather than inventing detail.
- "emirate": the emirate if the listing states or clearly implies one, else null. One of:
  Dubai, Abu Dhabi, Sharjah, Ajman, Ras Al Khaimah, Fujairah, Umm Al Quwain.
- "category": exactly one of: ${JOB_CATEGORIES.join(", ")}.
- "documentsNeeded": up to 4 documents an applicant for THIS role would realistically need
  translated or attested (for example "Degree certificate", "Experience certificate",
  "Passport", "Driving licence"). Base it on the role, not on guesswork about the employer.

Never state a salary, visa condition or requirement that is not in the listing.

Listing
Title: ${job.title}
Company: ${job.company ?? "not stated"}
Location: ${job.locations ?? "UAE"}
Salary: ${job.salary ?? "not stated"}
Excerpt: ${job.description || "(none)"}`;
}

/** AI enrichment with a deterministic fallback, so a dead pool slows the ingest
 *  rather than stopping it. Fallback rows are still reviewed by a human. */
async function enrich(job: RawJob): Promise<{ value: Enrichment; fromAi: boolean }> {
  const result = await generateJSON<Enrichment>(prompt(job));

  if (result?.summary) {
    const category = JOB_CATEGORIES.includes(result.category as (typeof JOB_CATEGORIES)[number])
      ? result.category
      : "Other";
    return {
      value: {
        summary: result.summary.trim(),
        emirate: normalizeEmirate(result.emirate) ?? normalizeEmirate(job.locations),
        category,
        documentsNeeded: Array.isArray(result.documentsNeeded)
          ? result.documentsNeeded.filter((d) => typeof d === "string").slice(0, 4)
          : [],
      },
      fromAi: true,
    };
  }

  return {
    value: {
      // No invented prose: just the title and where it is, which is true.
      summary: `${job.title}${job.company ? ` at ${job.company}` : ""}. Details are on the original posting.`,
      emirate: normalizeEmirate(job.locations),
      category: "Other",
      documentsNeeded: [],
    },
    fromAi: false,
  };
}

/** Active searches, from the database so the team can retarget without a deploy. */
async function activeSearches(): Promise<JobSearch[]> {
  const { data, error } = await supabaseAdmin()
    .from("job_searches")
    .select("keywords, location")
    .eq("active", true);

  if (error) throw new Error(`could not read job_searches: ${error.message}`);
  return (data ?? []) as JobSearch[];
}

export async function ingestJobs(): Promise<IngestResult> {
  const db = supabaseAdmin();
  const searches = await activeSearches();
  if (searches.length === 0) {
    console.log("[ingest] no active job searches configured");
    return { fetched: 0, inserted: 0, skipped: 0, enriched: 0 };
  }

  const fetched = await fetchCareerjet(searches);
  console.log(`[ingest] fetched ${fetched.length} listings`);
  if (fetched.length === 0) return { fetched: 0, inserted: 0, skipped: 0, enriched: 0 };

  // Skip anything we already hold. source_url is unique, so this is only to
  // avoid paying for AI calls we would then throw away.
  const { data: known, error: knownErr } = await db
    .from("jobs")
    .select("source_url")
    .in("source_url", fetched.map((j) => j.sourceUrl));
  if (knownErr) throw new Error(`could not check existing jobs: ${knownErr.message}`);

  const seen = new Set((known ?? []).map((r) => (r as { source_url: string }).source_url));
  const fresh = fetched.filter((j) => !seen.has(j.sourceUrl));
  console.log(`[ingest] ${fresh.length} new, ${fetched.length - fresh.length} already held`);

  if (fresh.length === 0) {
    return { fetched: fetched.length, inserted: 0, skipped: fetched.length, enriched: 0 };
  }

  const enrichments = await mapLimit(fresh, AI_CONCURRENCY, (job) => enrich(job));

  // Slugs are allocated serially: uniqueSlug reads committed rows, so running it
  // in parallel over similar titles could hand out the same slug twice.
  const rows = [];
  for (let i = 0; i < fresh.length; i++) {
    const job = fresh[i];
    const { value } = enrichments[i];
    const expires = new Date(job.postedAt);
    expires.setDate(expires.getDate() + SHELF_LIFE_DAYS);

    rows.push({
      slug: await uniqueSlug("jobs", job.title),
      title: job.title,
      company: job.company,
      source_url: job.sourceUrl,
      source_name: job.sourceName,
      emirate: value.emirate,
      category: value.category,
      summary: value.summary,
      documents_needed: value.documentsNeeded,
      posted_at: job.postedAt,
      expires_at: expires.toISOString(),
      status: "pending" as const,
    });
  }

  // Ignore duplicates rather than failing the batch: a concurrent run may have
  // inserted the same source_url between our check and this write.
  const { data: inserted, error: insertErr } = await db
    .from("jobs")
    .upsert(rows, { onConflict: "source_url", ignoreDuplicates: true })
    .select("id");
  if (insertErr) throw new Error(`insert failed: ${insertErr.message}`);

  await db
    .from("job_searches")
    .update({ last_run_at: new Date().toISOString() })
    .eq("active", true);

  const result: IngestResult = {
    fetched: fetched.length,
    inserted: inserted?.length ?? 0,
    skipped: fetched.length - fresh.length,
    enriched: enrichments.filter((e) => e.fromAi).length,
  };
  console.log(
    `[ingest] inserted ${result.inserted} pending jobs (${result.enriched} AI-summarized)`,
  );
  return result;
}

/** Expires listings past their shelf life. Rows are kept for the record; they
 *  just stop being public. */
export async function pruneJobs(): Promise<number> {
  const { data, error } = await supabaseAdmin()
    .from("jobs")
    .update({ status: "rejected", reject_reason: "expired" })
    .eq("status", "approved")
    .lt("expires_at", new Date().toISOString())
    .select("id");

  if (error) throw new Error(`prune failed: ${error.message}`);
  return data?.length ?? 0;
}
