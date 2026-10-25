/**
 * The job ingest: a source -> Gemini -> a row in `jobs`.
 *
 * Everything published, from every source. That was not always so: listings
 * used to land `pending` and wait for a human, then only the Google scraper's
 * were let through automatically. Both of those are gone, because the WhatsApp
 * group is meant to carry every listing the day brings in and a review cycle
 * cannot keep up with that.
 *
 * What that costs is worth stating plainly: a Gemini summary that misreads a
 * listing is on our domain and in a group of jobseekers without anyone having
 * read it. The prompt is the only guard left — it is told never to state a
 * salary, visa condition or requirement the listing does not contain, and the
 * fallback summary when the model does not answer is the title and nothing
 * else. `status` still exists, so a bad listing can be rejected by hand after
 * the fact; nothing holds one back before.
 */

import { generateJSON } from "../ai/gemini";
import { mapLimit } from "../async";
import { jobExpiry, JOB_RETENTION_DAYS } from "../jobs";
import { parseSalary } from "../salary";
import { uniqueSlug } from "../slug";
import { supabaseAdmin } from "../supabase/admin";
import { JOB_CATEGORIES, normalizeEmirate } from "../uae";
import { fetchBoards, type JobBoard } from "./boards";
import { fetchCareerjet } from "./careerjet";
import { fetchJooble } from "./jooble";
import { dedupe, type JobSearch, type RawJob } from "./source";

/** One per pooled key: the pool is the real concurrency limit. */
const AI_CONCURRENCY = 5;

export interface IngestResult {
  fetched: number;
  inserted: number;
  skipped: number;
  enriched: number;
  /** Of the inserted rows, how many are live on the board. Now the same as
   *  `inserted`, kept because the scraper reports it back. */
  approved: number;
}

interface Enrichment {
  summary: string;
  emirate: string | null;
  category: string;
  documentsNeeded: string[];
  /** Minimum years asked for. 0 means freshers welcome, null means unstated —
   *  and the difference matters, so the model is told so explicitly. */
  experienceYears: number | null;
  /** The employer's own deadline, ISO date, or null. */
  applyBy: string | null;
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
- "experienceYears": the minimum years of experience the listing asks for, as a number.
  Use 0 only if it explicitly welcomes freshers, graduates or people with no experience.
  Use null if the listing does not say — do NOT infer years from a job title. "Senior" is
  not a number. A wrong figure here sends someone to an application they cannot win.
- "applyBy": the closing date as YYYY-MM-DD if the listing states one, else null. Only a date
  the listing actually gives. Never calculate one from the posting date.

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
        // Both are optional facts, and a model that guessed one is worse than a
        // listing that omits it — so anything outside the expected shape
        // becomes null rather than being coerced.
        experienceYears:
          typeof result.experienceYears === "number" &&
          Number.isInteger(result.experienceYears) &&
          result.experienceYears >= 0 &&
          result.experienceYears <= 40
            ? result.experienceYears
            : null,
        applyBy:
          typeof result.applyBy === "string" && /^\d{4}-\d{2}-\d{2}$/.test(result.applyBy)
            ? result.applyBy
            : null,
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
      experienceYears: null,
      applyBy: null,
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

async function activeBoards(): Promise<(JobBoard & { id: string })[]> {
  const { data, error } = await supabaseAdmin()
    .from("job_boards")
    .select("id, ats, slug, name")
    .eq("active", true);

  if (error) throw new Error(`could not read job_boards: ${error.message}`);
  return (data ?? []) as (JobBoard & { id: string })[];
}

/**
 * Records how each board went, so a renamed or deleted board is visible in the
 * admin rather than a warning in last night's log. Best-effort: bookkeeping
 * must never fail the run that produced the jobs.
 */
async function recordBoardRuns(
  boards: (JobBoard & { id: string })[],
  errors: { board: JobBoard; message: string }[],
): Promise<void> {
  const failed = new Map(errors.map((e) => [`${e.board.ats}/${e.board.slug}`, e.message]));
  const now = new Date().toISOString();

  await Promise.all(
    boards.map(async (board) => {
      const { error } = await supabaseAdmin()
        .from("job_boards")
        .update({ last_run_at: now, last_error: failed.get(`${board.ats}/${board.slug}`) ?? null })
        .eq("id", board.id);
      if (error) console.warn(`[ingest] could not record board run: ${error.message}`);
    }),
  );
}

/**
 * Enrich a batch of listings and store them, whoever found them.
 *
 * This is the half of the ingest that decides what a listing looks like on
 * this site: the AI pass, the salary parse, slug allocation, the duplicate
 * check and the review status. It was split out of `ingestJobs` when the
 * Google scraper arrived, because that one runs on a machine outside Vercel
 * and posts what it finds to `/api/ingest/jobs`. Re-implementing any of this
 * over there would have meant two answers to the same question, and the one on
 * the laptop would be the one nobody re-read.
 *
 * So the scheduled ingest fetches from its sources and calls this; the
 * endpoint validates its body and calls this. Neither owns the rules.
 */
export async function ingestRawJobs(incoming: RawJob[]): Promise<IngestResult> {
  const db = supabaseAdmin();

  // Deduped again here rather than trusting the caller: `ingestJobs` has
  // already done it across its sources, but the endpoint's body is whatever
  // was posted to it, and `source_url` is a unique column.
  const fetched = dedupe(incoming);
  console.log(`[ingest] fetched ${fetched.length} listings`);
  if (fetched.length === 0) {
    return { fetched: 0, inserted: 0, skipped: 0, enriched: 0, approved: 0 };
  }

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
    return {
      fetched: fetched.length,
      inserted: 0,
      skipped: fetched.length,
      enriched: 0,
      approved: 0,
    };
  }

  const enrichments = await mapLimit(fresh, AI_CONCURRENCY, (job) => enrich(job));

  // Slugs are allocated serially *and* against a running set. uniqueSlug reads
  // committed rows, and nothing in this batch is committed until the upsert
  // below — so without the set, two listings called "Sales Executive" claim the
  // same slug and the whole insert dies on the unique constraint. A real ingest
  // of eight searches hit this on the first run; eleven unique titles had not.
  const reserved = new Set<string>();
  const rows = [];
  for (let i = 0; i < fresh.length; i++) {
    const job = fresh[i];
    const { value } = enrichments[i];
    const salary = parseSalary(job.salary);
    rows.push({
      slug: await uniqueSlug("jobs", job.title, reserved),
      title: job.title,
      company: job.company,
      source_url: job.sourceUrl,
      source_name: job.sourceName,
      emirate: value.emirate,
      category: value.category,
      summary: value.summary,
      documents_needed: value.documentsNeeded,
      // Verbatim from the source, plus a monthly-AED range for filtering.
      // parseSalary returns nulls whenever it is not certain.
      salary_text: job.salary,
      salary_min: salary.min,
      salary_max: salary.max,
      experience_years: value.experienceYears,
      apply_by: value.applyBy,
      posted_at: job.postedAt,
      expires_at: jobExpiry(job.postedAt),
      // Every source, straight to the board. See the note at the top of this
      // file for what that trades away.
      status: "approved" as const,
    });
  }

  // Ignore duplicates rather than failing the batch: a concurrent run may have
  // inserted the same source_url between our check and this write.
  const { data: inserted, error: insertErr } = await db
    .from("jobs")
    .upsert(rows, { onConflict: "source_url", ignoreDuplicates: true })
    .select("id, status");
  if (insertErr) throw new Error(`insert failed: ${insertErr.message}`);

  const result: IngestResult = {
    fetched: fetched.length,
    inserted: inserted?.length ?? 0,
    skipped: fetched.length - fresh.length,
    enriched: enrichments.filter((e) => e.fromAi).length,
    // Counted from what came back, not from what was sent: `ignoreDuplicates`
    // means a row we built may not be a row that landed.
    approved: (inserted ?? []).filter((r) => (r as { status: string }).status === "approved")
      .length,
  };
  console.log(
    `[ingest] inserted ${result.inserted} listings — ${result.approved} approved, ` +
      `${result.inserted - result.approved} pending review (${result.enriched} AI-summarized)`,
  );
  return result;
}

/** The scheduled run: ask every configured source, then hand the lot to
 *  `ingestRawJobs`. */
export async function ingestJobs(): Promise<IngestResult> {
  const [searches, boards] = await Promise.all([activeSearches(), activeBoards()]);
  if (searches.length === 0 && boards.length === 0) {
    console.log("[ingest] no active job searches or employer boards configured");
    return { fetched: 0, inserted: 0, skipped: 0, enriched: 0, approved: 0 };
  }

  // Every source, in parallel. The keyed ones answer searches; the employer
  // boards answer a curated list and need no key at all. A source with nothing
  // configured logs that it is sitting out and returns nothing, which is also
  // how the whole ingest behaves before anyone has signed up for anything.
  const [jooble, careerjet, boardResult] = await Promise.all([
    fetchJooble(searches),
    fetchCareerjet(searches),
    fetchBoards(boards),
  ]);
  await recordBoardRuns(boards, boardResult.errors);

  const result = await ingestRawJobs([...jooble, ...careerjet, ...boardResult.jobs]);

  await supabaseAdmin()
    .from("job_searches")
    .update({ last_run_at: new Date().toISOString() })
    .eq("active", true);

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

/**
 * Deletes listings we have held for longer than the retention window.
 *
 * Taking a job off the site and deleting the row are different acts, and this
 * is the second one: rows were only ever marked `rejected`, so every listing
 * the ingest had ever seen stayed in the table for good.
 *
 * A listing that is still live is left alone even once it is old enough. The
 * shelf life is shorter than the retention window, so this almost never
 * applies — but "delete anything over sixty days" would otherwise be able to
 * remove a job a visitor is reading, and a housekeeping job should not be able
 * to do that. It goes on the next run, once it has stopped being live.
 */
export async function deleteStaleJobs(): Promise<number> {
  const cutoff = new Date(Date.now() - JOB_RETENTION_DAYS * 86_400_000).toISOString();
  const now = new Date().toISOString();
  const today = now.slice(0, 10);

  const { data, error } = await supabaseAdmin()
    .from("jobs")
    .delete()
    .lt("created_at", cutoff)
    // Not still on the site: either not approved, or past its own dates.
    .or(
      `status.neq.approved,expires_at.lt.${now},apply_by.lt.${today}`,
    )
    .select("id");

  if (error) throw new Error(`delete of stale jobs failed: ${error.message}`);

  const deleted = data?.length ?? 0;
  if (deleted > 0) console.log(`[prune] deleted ${deleted} listings older than ${JOB_RETENTION_DAYS} days`);
  return deleted;
}
