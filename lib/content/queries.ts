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

export interface JobFilters {
  emirate?: string;
  category?: string;
  q?: string;
  limit?: number;
}

export async function listJobs(filters: JobFilters = {}): Promise<JobSummary[]> {
  if (!isPublicDbConfigured()) return [];

  let query = supabasePublic()
    .from("jobs")
    .select(JOB_FIELDS)
    .eq("status", "approved")
    .order("posted_at", { ascending: false })
    .limit(filters.limit ?? 40);

  if (filters.emirate) query = query.eq("emirate", filters.emirate);
  if (filters.category) query = query.eq("category", filters.category);
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
export async function jobFacets(): Promise<{ emirates: string[]; categories: string[] }> {
  if (!isPublicDbConfigured()) return { emirates: [], categories: [] };

  const { data } = await supabasePublic()
    .from("jobs")
    .select("emirate, category")
    .eq("status", "approved")
    .limit(1000);

  const emirates = new Set<string>();
  const categories = new Set<string>();
  for (const row of (data ?? []) as { emirate: string | null; category: string | null }[]) {
    if (row.emirate) emirates.add(row.emirate);
    if (row.category) categories.add(row.category);
  }

  return {
    emirates: [...emirates].sort(),
    categories: [...categories].sort(),
  };
}
