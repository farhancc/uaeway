"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import { jobExpiry, normalizeApplyLink } from "@/lib/jobs";
import { uniqueSlug } from "@/lib/slug";
import { EMIRATES, JOB_CATEGORIES } from "@/lib/uae";
import { supabaseServer } from "@/lib/supabase/server";
import type { ArticleKind, Citation } from "@/lib/supabase/types";

/**
 * Review actions.
 *
 * They run through the signed-in admin's client, not the service role, so RLS
 * checks membership of `admins` a second time at the database. requireAdmin()
 * is the first check; neither is trusted alone.
 */

type Table = "jobs" | "articles";

function assertTable(value: string): asserts value is Table {
  if (value !== "jobs" && value !== "articles") throw new Error("unknown table");
}

export async function approve(table: string, id: string) {
  assertTable(table);
  const admin = await requireAdmin();
  const db = await supabaseServer();

  const patch: Record<string, unknown> = {
    status: "approved",
    reviewed_by: admin.id,
    reviewed_at: new Date().toISOString(),
    reject_reason: null,
  };
  // An article is only live once it has a publish date; jobs use posted_at.
  if (table === "articles") patch.published_at = new Date().toISOString();

  const { error } = await db.from(table).update(patch).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin");
}

export async function reject(table: string, id: string, reason: string) {
  assertTable(table);
  const admin = await requireAdmin();
  const db = await supabaseServer();

  const { error } = await db
    .from(table)
    .update({
      status: "rejected",
      reviewed_by: admin.id,
      reviewed_at: new Date().toISOString(),
      // Kept deliberately: rejection reasons are how we find out which prompts
      // are producing bad drafts.
      reject_reason: reason.slice(0, 500) || "rejected",
    })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin");
}

export async function saveEdit(table: string, id: string, patch: Record<string, string>) {
  assertTable(table);
  await requireAdmin();
  const db = await supabaseServer();

  // Only fields a reviewer is meant to correct.
  const allowed = table === "jobs" ? ["title", "summary"] : ["title", "excerpt", "body_md"];
  const update = Object.fromEntries(
    Object.entries(patch).filter(([key]) => allowed.includes(key)),
  );
  if (Object.keys(update).length === 0) return;

  const { error } = await db.from(table).update(update).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin");
}

export async function setLeadStatus(id: string, status: string) {
  const allowed = ["new", "contacted", "qualified", "won", "lost"];
  if (!allowed.includes(status)) throw new Error("unknown status");

  await requireAdmin();
  const db = await supabaseServer();

  const { error } = await db.from("leads").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/leads");
}

/**
 * Writes a new article. It lands as 'pending' like every other draft, so the
 * review queue stays the single route to publication.
 *
 * Sources are required. An article on this site makes claims about fees and
 * government process, and one that cannot say where its claims came from is
 * exactly the kind we reject when the AI produces it.
 */
export async function createArticle(form: FormData): Promise<{ id: string }> {
  await requireAdmin();

  const kind = String(form.get("kind") ?? "blog") as ArticleKind;
  if (!["guide", "news", "blog"].includes(kind)) throw new Error("unknown kind");

  const title = String(form.get("title") ?? "").trim();
  const body = String(form.get("body_md") ?? "").trim();
  if (!title) throw new Error("A title is required.");
  if (!body) throw new Error("The post needs a body.");

  const citations: Citation[] = String(form.get("sources") ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      // "Title | https://example.com", or just the URL.
      const [first, second] = line.split("|").map((part) => part.trim());
      const url = second ?? first;
      return { title: second ? first : url, url, retrieved_at: new Date().toISOString() };
    });

  const db = await supabaseServer();
  const { data, error } = await db
    .from("articles")
    .insert({
      slug: await uniqueSlug("articles", title),
      locale: String(form.get("locale") ?? "en"),
      kind,
      title,
      excerpt: String(form.get("excerpt") ?? "").trim() || null,
      body_md: body,
      service_slug: String(form.get("service_slug") ?? "").trim() || null,
      citations,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/admin");
  return { id: data.id as string };
}

/**
 * Adds a job by hand — an employer who sent the vacancy directly, rather than
 * one the ingest found. It lands as 'pending' like every ingested listing, so
 * the review queue stays the only route to publication.
 */
export async function createJob(form: FormData): Promise<{ id: string }> {
  await requireAdmin();

  const title = String(form.get("title") ?? "").trim();
  if (!title) throw new Error("A job title is required.");

  const company = String(form.get("company") ?? "").trim();
  if (!company) throw new Error("The employer's name is required.");

  // Applicants apply at the source, never here — we are not the recruiter — so
  // a listing without a working way to apply is not worth publishing.
  const applyLink = normalizeApplyLink(String(form.get("apply_link") ?? ""));
  if (!applyLink) {
    throw new Error("Add a link or an email address where people can apply.");
  }

  const emirate = String(form.get("emirate") ?? "").trim();
  if (emirate && !EMIRATES.includes(emirate as (typeof EMIRATES)[number])) {
    throw new Error("Unknown emirate.");
  }

  const category = String(form.get("category") ?? "").trim() || "Other";
  if (!JOB_CATEGORIES.includes(category as (typeof JOB_CATEGORIES)[number])) {
    throw new Error("Unknown category.");
  }

  const documents = String(form.get("documents_needed") ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 6);

  const postedAt = new Date().toISOString();
  const db = await supabaseServer();

  const { data, error } = await db
    .from("jobs")
    .insert({
      slug: await uniqueSlug("jobs", title),
      title,
      company,
      source_url: applyLink,
      // For a direct submission the employer is the source.
      source_name: String(form.get("source_name") ?? "").trim() || company,
      emirate: emirate || null,
      category,
      summary: String(form.get("summary") ?? "").trim() || null,
      documents_needed: documents,
      posted_at: postedAt,
      expires_at: jobExpiry(postedAt),
      status: "pending",
    })
    .select("id")
    .single();

  if (error) {
    // source_url is unique: the same vacancy twice is a duplicate, not a crash.
    if (error.code === "23505") {
      throw new Error("That apply link is already on a listing.");
    }
    throw new Error(error.message);
  }

  revalidatePath("/admin");
  return { id: data.id as string };
}

/** Adds a keyword/location pair for the nightly ingest to search. */
export async function addJobSearch(form: FormData): Promise<void> {
  await requireAdmin();

  const keywords = String(form.get("keywords") ?? "").trim();
  const location = String(form.get("location") ?? "").trim();
  if (!keywords || !location) throw new Error("Both a keyword and a location are needed.");

  const db = await supabaseServer();
  const { error } = await db.from("job_searches").insert({ keywords, location });

  if (error) {
    if (error.code === "23505") throw new Error("That search already exists.");
    throw new Error(error.message);
  }

  revalidatePath("/admin/searches");
}

/** Pauses or resumes a search without losing it, which is usually what you want
 *  over deleting one that produced good listings last season. */
export async function setJobSearchActive(id: string, active: boolean): Promise<void> {
  await requireAdmin();

  const db = await supabaseServer();
  const { error } = await db.from("job_searches").update({ active }).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/searches");
}

export async function deleteJobSearch(id: string): Promise<void> {
  await requireAdmin();

  const db = await supabaseServer();
  const { error } = await db.from("job_searches").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/searches");
}
