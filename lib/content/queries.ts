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
  "slug" | "title" | "company" | "emirate" | "category" | "summary" | "documents_needed" | "posted_at"
>;

const JOB_FIELDS =
  "slug, title, company, emirate, category, summary, documents_needed, posted_at";
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
