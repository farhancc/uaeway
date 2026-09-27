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

export async function listJobs(filters: JobFilters = {}): Promise<JobSummary[]> {
  if (!isPublicDbConfigured()) return [];

  const sort = SORTS[filters.sort ?? "newest"];

  let query = supabasePublic()
    .from("jobs")
    .select(JOB_FIELDS)
    .eq("status", "approved")
    // Expiry is enforced here, not only by the weekly prune. Otherwise a job
    // that closed on Monday stays on the site until Sunday.
    .or(`expires_at.is.null,expires_at.gte.${new Date().toISOString()}`)
    // And the employer's own deadline, which outranks our shelf life: there is
    // no point showing a listing nobody can apply to any more.
    .or(`apply_by.is.null,apply_by.gte.${new Date().toISOString().slice(0, 10)}`)
    .order(sort.column, { ascending: sort.ascending })
    .limit(filters.limit ?? 40);

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
  if (filters.q) query = query.textSearch("search", filters.q, { type: "websearch", config: "english" });

  const { data, error } = await query;
  if (error) {
    console.warn(`[content] listJobs: ${error.message}`);
    return [];
  }
  return (data ?? []) as JobSummary[];
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

/** Distinct emirates and categories that actually have live jobs, for filters
 *  that never offer an option returning nothing. */
export interface JobFacets {
  emirates: string[];
  categories: string[];
  companies: string[];
  documents: string[];
}

/**
 * The values worth offering as filters — drawn from the listings that are
 * actually live, so the form never offers a choice that returns nothing.
 */
export async function jobFacets(): Promise<JobFacets> {
  const empty: JobFacets = { emirates: [], categories: [], companies: [], documents: [] };
  if (!isPublicDbConfigured()) return empty;

  const { data } = await supabasePublic()
    .from("jobs")
    .select("emirate, category, company, documents_needed")
    .eq("status", "approved")
    .or(`expires_at.is.null,expires_at.gte.${new Date().toISOString()}`)
    .limit(1000);

  const emirates = new Set<string>();
  const categories = new Set<string>();
  const companies = new Set<string>();
  const documents = new Set<string>();

  for (const row of (data ?? []) as {
    emirate: string | null;
    category: string | null;
    company: string | null;
    documents_needed: string[] | null;
  }[]) {
    if (row.emirate) emirates.add(row.emirate);
    if (row.category) categories.add(row.category);
    if (row.company) companies.add(row.company);
    for (const doc of row.documents_needed ?? []) documents.add(doc);
  }

  return {
    emirates: [...emirates].sort(),
    categories: [...categories].sort(),
    companies: [...companies].sort(),
    documents: [...documents].sort(),
  };
}
