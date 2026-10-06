/**
 * Every read behind a public page.
 *
 * All of these go through the anon client and filter on approved status. When
 * the database is not configured yet they return empty results rather than
 * throwing, so the site renders during setup instead of showing an error page.
 */

import { isPublicDbConfigured, supabasePublic } from "../supabase/public";
import type { ArticleRow, JobRow } from "../supabase/types";

export type JobSummary = Pick<
  JobRow,
  | "slug"
  | "title"
  | "company"
  | "emirate"
  | "category"
  | "summary"
  | "documents_needed"
  | "posted_at"
  | "salary_text"
  | "salary_min"
  | "salary_max"
  | "experience_years"
  | "apply_by"
>;

const JOB_FIELDS =
  "slug, title, company, emirate, category, summary, documents_needed, posted_at, salary_text, salary_min, salary_max, experience_years, apply_by";
const ARTICLE_FIELDS = "slug, kind, title, excerpt, published_at, service_slug";

export type ArticleSummary = Pick<
  ArticleRow,
  "slug" | "kind" | "title" | "excerpt" | "published_at" | "service_slug"
>;

/** How a listing set can be narrowed. Arrays are OR within a field and AND
 *  across fields, which is what people mean by "Dubai or Sharjah, in tech". */
export interface JobFilters {
  emirates?: string[];
  categories?: string[];
  /** Exact employer, from the facet list rather than free text. */
  company?: string;
  /** One of the documents_needed stamps — the filter that turns "a job I want"
   *  into "the paperwork I will need", which is the whole point of this site. */
  document?: string;
  /** Only listings posted within this many days. */
  postedWithinDays?: number;
  /** Monthly AED. Keeps listings whose range reaches this figure — a job
   *  paying 8–12k is a match for someone asking for at least 10k. */
  salaryMin?: number;
  /** Monthly AED. Keeps listings whose range starts at or below this. */
  salaryMax?: number;
  /** Years the candidate has. Keeps listings asking for no more than that,
   *  which is the question people actually have. */
  experienceYears?: number;
  /**
   * Only listings that say outright they are open to someone with none.
   *
   * Not the same filter as `experienceYears: 0`, which also keeps every
   * listing that stated no requirement — right for the page, where the
   * question is "what could I apply for", and wrong for the chat, where "which
   * of your listings are open to freshers" was answered with 249 of 258
   * because almost none of them state a requirement either way.
   */
  freshersOnly?: boolean;
  /** Only listings that state a salary at all. */
  hasSalary?: boolean;
  q?: string;
  sort?: JobSort;
  limit?: number;
}

export type JobSort = "newest" | "oldest" | "title";

const SORTS: Record<JobSort, { column: string; ascending: boolean }> = {
  newest: { column: "posted_at", ascending: false },
  oldest: { column: "posted_at", ascending: true },
  title: { column: "title", ascending: true },
};

export function isJobSort(value: unknown): value is JobSort {
  return typeof value === "string" && value in SORTS;
}

/**
 * The live set, with filters applied.
 *
 * Shared by the jobs page, the count and the chatbot's board search, so that
 * all three mean the same thing by "a job someone can apply to": approved, not
 * past our shelf life, and not past the employer's own deadline. Those three
 * drifting apart is how the chat ends up quoting a number of listings that the
 * page it links to does not show.
 */
function liveJobs(filters: JobFilters, count?: "exact") {
  let query = supabasePublic()
    .from("jobs")
    .select(JOB_FIELDS, count ? { count } : undefined)
    .eq("status", "approved")
    // Expiry is enforced here, not only by the weekly prune. Otherwise a job
    // that closed on Monday stays on the site until Sunday.
    .or(`expires_at.is.null,expires_at.gte.${new Date().toISOString()}`)
    // And the employer's own deadline, which outranks our shelf life: there is
    // no point showing a listing nobody can apply to any more.
    .or(`apply_by.is.null,apply_by.gte.${new Date().toISOString().slice(0, 10)}`);

  if (filters.emirates?.length) query = query.in("emirate", filters.emirates);
  if (filters.categories?.length) query = query.in("category", filters.categories);
  if (filters.company) query = query.eq("company", filters.company);
  if (filters.document) query = query.contains("documents_needed", [filters.document]);
  if (filters.postedWithinDays) {
    const since = new Date(Date.now() - filters.postedWithinDays * 86_400_000).toISOString();
    query = query.gte("posted_at", since);
  }

  // Salary compares against the top of the listing's range, not the bottom:
  // someone asking for "at least 10k" should still see a job advertised at
  // 8–12k, because that job can pay it.
  //
  // The second half of each clause is the one that matters. An open-ended
  // listing — "AED 25,000+" — has no upper bound at all, and comparing against
  // a null salary_max quietly dropped exactly the jobs that pay *best*. Those
  // fall back to their stated end instead.
  if (filters.salaryMin) {
    query = query.or(
      `salary_max.gte.${filters.salaryMin},and(salary_max.is.null,salary_min.gte.${filters.salaryMin})`,
    );
  }
  if (filters.salaryMax) {
    query = query.or(
      `salary_min.lte.${filters.salaryMax},and(salary_min.is.null,salary_max.lte.${filters.salaryMax})`,
    );
  }
  if (filters.hasSalary) query = query.not("salary_min", "is", null);

  // A listing that does not state its requirement is kept: "not stated" is not
  // "requires twenty years", and dropping it would hide most of the board.
  if (filters.experienceYears !== undefined) {
    query = query.or(`experience_years.is.null,experience_years.lte.${filters.experienceYears}`);
  }
  if (filters.freshersOnly) query = query.eq("experience_years", 0);
  if (filters.q) query = query.textSearch("search", filters.q, { type: "websearch", config: "english" });

  return query;
}

export async function listJobs(filters: JobFilters = {}): Promise<JobSummary[]> {
  if (!isPublicDbConfigured()) return [];

  const sort = SORTS[filters.sort ?? "newest"];
  const { data, error } = await liveJobs(filters)
    .order(sort.column, { ascending: sort.ascending })
    .limit(filters.limit ?? 40);

  if (error) {
    console.warn(`[content] listJobs: ${error.message}`);
    return [];
  }
  return (data ?? []) as JobSummary[];
}

/**
 * The same search, plus how many listings match in all.
 *
 * The chatbot needs both halves: "14 listings, here are the newest three" is
 * the honest answer, and the fourteen is the half that tells someone whether
 * the board is worth their time at all. It is a second function rather than a
 * flag on `listJobs` because `count: "exact"` costs the database a second
 * scan, and the jobs page — which renders every row it asks for — would be
 * paying for a number nobody reads.
 */
export async function searchJobs(
  filters: JobFilters = {},
): Promise<{ rows: JobSummary[]; total: number }> {
  if (!isPublicDbConfigured()) return { rows: [], total: 0 };

  const sort = SORTS[filters.sort ?? "newest"];
  const { data, error, count } = await liveJobs(filters, "exact")
    .order(sort.column, { ascending: sort.ascending })
    .limit(filters.limit ?? 3);

  if (error) {
    console.warn(`[content] searchJobs: ${error.message}`);
    return { rows: [], total: 0 };
  }
  const rows = (data ?? []) as JobSummary[];
  return { rows, total: count ?? rows.length };
}

export async function getJob(slug: string): Promise<JobRow | null> {
  if (!isPublicDbConfigured()) return null;

  const { data } = await supabasePublic()
    .from("jobs")
    .select("*")
    .eq("slug", slug)
    .eq("status", "approved")
    .maybeSingle();

  return (data as JobRow) ?? null;
}

export async function listArticles(
  kind?: "news" | "guide" | "blog",
  limit = 24,
): Promise<ArticleSummary[]> {
  if (!isPublicDbConfigured()) return [];

  let query = supabasePublic()
    .from("articles")
    .select(ARTICLE_FIELDS)
    .eq("status", "approved")
    .not("published_at", "is", null)
    .order("published_at", { ascending: false })
    .limit(limit);

  if (kind) query = query.eq("kind", kind);

  const { data, error } = await query;
  if (error) {
    console.warn(`[content] listArticles: ${error.message}`);
    return [];
  }
  return (data ?? []) as ArticleSummary[];
}

export async function getArticle(slug: string, locale: string): Promise<ArticleRow | null> {
  if (!isPublicDbConfigured()) return null;

  const { data } = await supabasePublic()
    .from("articles")
    .select("*")
    .eq("slug", slug)
    .eq("locale", locale)
    .eq("status", "approved")
    .maybeSingle();

  return (data as ArticleRow) ?? null;
}

/** One value a filter can take, and how many live listings it would return. */
export interface Facet {
  value: string;
  count: number;
}

/**
 * The values worth offering as filters, each with the number of listings
 * behind it.
 *
 * The count is the point. Without it a visitor picks "Education" and gets five
 * results with no way to have known, while "Other" holds half the board — and
 * on a board this size that is most of the filters most of the time. Offering
 * a choice and its consequence together is the difference between a filter and
 * a guess.
 *
 * Only values that actually have live listings are returned, so the form can
 * never offer a choice that leads to an empty page.
 */
export interface JobFacets {
  emirates: Facet[];
  categories: Facet[];
  companies: Facet[];
  documents: Facet[];
  /** Live listings in total, which is the only honest headline number. */
  total: number;
  /** Listings posted inside each window, so a window that would return
   *  nothing is not offered. Keyed by days. */
  postedWithin: Record<number, number>;
  /** Listings that state a salary at all — 17 of 258 when this was written, so
   *  a salary filter hides most of the board and has to say so. */
  withSalary: number;
  /** Listings marked open to someone with no experience. */
  freshers: number;
}

export async function jobFacets(): Promise<JobFacets> {
  const empty: JobFacets = {
    emirates: [],
    categories: [],
    companies: [],
    documents: [],
    total: 0,
    postedWithin: {},
    withSalary: 0,
    freshers: 0,
  };
  if (!isPublicDbConfigured()) return empty;

  const { data } = await supabasePublic()
    .from("jobs")
    .select("emirate, category, company, documents_needed, posted_at, salary_min, experience_years")
    .eq("status", "approved")
    .or(`expires_at.is.null,expires_at.gte.${new Date().toISOString()}`)
    .or(`apply_by.is.null,apply_by.gte.${new Date().toISOString().slice(0, 10)}`)
    .limit(1000);

  const rows = (data ?? []) as {
    emirate: string | null;
    category: string | null;
    company: string | null;
    documents_needed: string[] | null;
    posted_at: string;
    salary_min: number | null;
    experience_years: number | null;
  }[];

  const emirates = new Map<string, number>();
  const categories = new Map<string, number>();
  const companies = new Map<string, number>();
  const documents = new Map<string, number>();
  const postedWithin: Record<number, number> = { 1: 0, 7: 0, 30: 0 };
  let withSalary = 0;
  let freshers = 0;

  const now = Date.now();
  const bump = (map: Map<string, number>, key: string | null) => {
    if (key) map.set(key, (map.get(key) ?? 0) + 1);
  };

  for (const row of rows) {
    bump(emirates, row.emirate);
    bump(categories, row.category);
    bump(companies, row.company);
    for (const doc of row.documents_needed ?? []) bump(documents, doc);

    const age = now - new Date(row.posted_at).getTime();
    for (const days of [1, 7, 30]) {
      if (age <= days * 86_400_000) postedWithin[days] += 1;
    }
    if (row.salary_min !== null) withSalary += 1;
    if (row.experience_years === 0) freshers += 1;
  }

  /** Commonest first: a filter list is read from the top, and the useful ones
   *  are the ones with listings behind them. Ties fall back to alphabetical so
   *  the order is stable between requests. */
  const rank = (map: Map<string, number>): Facet[] =>
    [...map]
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));

  return {
    emirates: rank(emirates),
    categories: rank(categories),
    companies: rank(companies),
    documents: rank(documents),
    total: rows.length,
    postedWithin,
    withSalary,
    freshers,
  };
}
