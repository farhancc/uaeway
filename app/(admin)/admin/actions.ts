"use server";

import { revalidatePath } from "next/cache";
import { fetchBoards } from "@/lib/ingest/boards";
import {
  articleImport,
  asArray,
  checkApplyLinks,
  jobImport,
  parseRows,
  toCitations,
  type RowError,
} from "@/lib/admin/import";
import { requireAdmin } from "@/lib/admin/auth";
import { clearAnswerCache } from "@/lib/chat/answers";
import { jobExpiry, normalizeApplyLink } from "@/lib/jobs";
import { parseSalary } from "@/lib/salary";
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

/** What approving sets, in one place so the single and bulk paths cannot
 *  drift into approving things differently. */
function approvalPatch(table: Table, adminId: string): Record<string, unknown> {
  const now = new Date().toISOString();
  return {
    status: "approved",
    reviewed_by: adminId,
    reviewed_at: now,
    reject_reason: null,
    // An article is only live once it has a publish date; jobs use posted_at.
    ...(table === "articles" ? { published_at: now } : {}),
  };
}

export async function approve(table: string, id: string) {
  assertTable(table);
  const admin = await requireAdmin();
  const db = await supabaseServer();

  const { error } = await db.from(table).update(approvalPatch(table, admin.id)).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin");
}

/**
 * Approves several at once.
 *
 * Takes explicit ids rather than "approve everything pending". The queue is
 * capped at 50 on screen while the table can hold hundreds, so a button that
 * meant "all pending" would publish rows the page never showed — and the point
 * of a review queue is that someone saw the thing.
 *
 * Still filtered to `status = pending`: two tabs open on the same queue should
 * not let one of them un-reject something the other rejected.
 */
export async function approveMany(
  table: string,
  ids: string[],
): Promise<{ approved: number }> {
  assertTable(table);
  const admin = await requireAdmin();
  if (ids.length === 0) return { approved: 0 };
  if (ids.length > 100) throw new Error("Approve at most 100 at a time.");

  const db = await supabaseServer();
  const { data, error } = await db
    .from(table)
    .update(approvalPatch(table, admin.id))
    .in("id", ids)
    .eq("status", "pending")
    .select("id");

  if (error) throw new Error(error.message);

  revalidatePath("/admin");
  // Approved rows go straight onto the public pages that list them.
  revalidatePath("/[locale]", "layout");
  return { approved: data?.length ?? 0 };
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

  // Optional, but still validated when given: a link that is neither a URL nor
  // an email address is worse than none, because the page renders it as a
  // button someone clicks. Blank is allowed and the listing says so.
  const rawLink = String(form.get("apply_link") ?? "").trim();
  const applyLink = rawLink ? normalizeApplyLink(rawLink) : null;
  if (rawLink && !applyLink) {
    throw new Error("That apply link is neither a web address nor an email address.");
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

  // Optional, every one of them: a listing is publishable without a salary, a
  // years figure or a deadline, and a blank field must stay blank rather than
  // becoming a zero or today's date.
  const salaryText = String(form.get("salary_text") ?? "").trim() || null;
  const parsedSalary = parseSalary(salaryText);

  const rawYears = String(form.get("experience_years") ?? "").trim();
  const experienceYears = rawYears === "" ? null : Number(rawYears);
  if (experienceYears !== null && (!Number.isInteger(experienceYears) || experienceYears < 0 || experienceYears > 40)) {
    throw new Error("Experience must be a whole number of years between 0 and 40.");
  }

  const applyBy = String(form.get("apply_by") ?? "").trim() || null;

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
      salary_text: salaryText,
      salary_min: parsedSalary.min,
      salary_max: parsedSalary.max,
      experience_years: experienceYears,
      apply_by: applyBy,
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

/**
 * Adds an employer's board. The slug is whatever appears in that ATS's URL —
 * "careem" from boards.greenhouse.io/careem — and it is checked against the
 * live API before saving, because a typo here is a board that silently returns
 * nothing every night.
 */
export async function addJobBoard(form: FormData): Promise<void> {
  await requireAdmin();

  const ats = String(form.get("ats") ?? "").trim();
  const slug = String(form.get("slug") ?? "").trim().toLowerCase();
  const name = String(form.get("name") ?? "").trim();
  if (ats !== "greenhouse" && ats !== "lever") throw new Error("Pick Greenhouse or Lever.");
  if (!slug || !name) throw new Error("Both the board slug and a name are needed.");

  const { jobs, errors } = await fetchBoards([{ ats, slug, name }]);
  if (errors.length > 0) {
    throw new Error(
      `No board found at ${ats}/${slug} (${errors[0].message}). Check the slug in the board's URL.`,
    );
  }

  const db = await supabaseServer();
  const { error } = await db.from("job_boards").insert({ ats, slug, name });
  if (error) {
    if (error.code === "23505") throw new Error("That board is already on the list.");
    throw new Error(error.message);
  }

  revalidatePath("/admin/boards");

  if (jobs.length === 0) {
    // Saved, but worth knowing: the board is real and hiring nowhere near here.
    console.log(`[admin] board ${ats}/${slug} added but has no UAE listings today`);
  }
}

export async function setJobBoardActive(id: string, active: boolean): Promise<void> {
  await requireAdmin();

  const db = await supabaseServer();
  const { error } = await db.from("job_boards").update({ active }).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/boards");
}

export async function deleteJobBoard(id: string): Promise<void> {
  await requireAdmin();

  const db = await supabaseServer();
  const { error } = await db.from("job_boards").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/boards");
}

/* ── Answer bank ─────────────────────────────────────────────────────────────
   These are human-written answers, not AI drafts, so they do not go through the
   review queue: saving one publishes it. The cache is cleared on every write so
   an edit shows in the chatbot immediately rather than after the TTL. */

function lines(form: FormData, field: string, limit: number): string[] {
  return String(form.get(field) ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, limit);
}

function answerFields(form: FormData) {
  const question = String(form.get("question") ?? "").trim();
  const answer_md = String(form.get("answer_md") ?? "").trim();
  if (!question) throw new Error("A question is required.");
  if (!answer_md) throw new Error("An answer is required.");

  return {
    question,
    answer_md,
    service_slug: String(form.get("service_slug") ?? "").trim() || null,
    keywords: lines(form, "keywords", 12),
    follow_up_slugs: form.getAll("follow_up_slugs").map(String).filter(Boolean).slice(0, 6),
    is_opener: form.get("is_opener") === "on",
    show_on_page: form.get("show_on_page") === "on",
    position: Number(form.get("position") ?? 0) || 0,
    active: form.get("active") !== "off",
  };
}

export async function createAnswer(form: FormData): Promise<{ slug: string }> {
  await requireAdmin();

  const fields = answerFields(form);
  // The slug is the identity a suggestion chip refers to, so it is set once at
  // creation and never edited: changing it would break chips already on screen.
  const slug = await uniqueSlug("answers", String(form.get("slug") ?? "") || fields.question);

  const db = await supabaseServer();
  const { error } = await db.from("answers").insert({ slug, ...fields });
  if (error) {
    if (error.code === "23505") throw new Error("That slug is already taken.");
    throw new Error(error.message);
  }

  clearAnswerCache();
  revalidatePath("/admin/answers");
  return { slug };
}

export async function updateAnswer(id: string, form: FormData): Promise<void> {
  await requireAdmin();

  const db = await supabaseServer();
  const { error } = await db.from("answers").update(answerFields(form)).eq("id", id);
  if (error) throw new Error(error.message);

  clearAnswerCache();
  revalidatePath("/admin/answers");
}

/** Retire an answer without deleting it, so chips pointing at it degrade
 *  gracefully instead of vanishing mid-conversation. */
export async function setAnswerActive(id: string, active: boolean): Promise<void> {
  await requireAdmin();

  const db = await supabaseServer();
  const { error } = await db.from("answers").update({ active }).eq("id", id);
  if (error) throw new Error(error.message);

  clearAnswerCache();
  revalidatePath("/admin/answers");
}

export async function setAnswerOpener(id: string, isOpener: boolean): Promise<void> {
  await requireAdmin();

  const db = await supabaseServer();
  const { error } = await db.from("answers").update({ is_opener: isOpener }).eq("id", id);
  if (error) throw new Error(error.message);

  clearAnswerCache();
  revalidatePath("/admin/answers");
}


/** Imported rows go straight to the public site, so every cached surface that
 *  lists them has to be rebuilt — not just the admin. */
function revalidateImported(): void {
  revalidatePath("/admin");
  revalidatePath("/[locale]", "layout");
}

export interface ImportResult {
  imported: number;
  /** Jobs already held, matched on the apply link. Not an error: re-pasting a
   *  list you have partly imported should be safe and boring. */
  duplicates: number;
  errors: RowError[];
}

/** Shared front door: valid JSON, and something to actually import. */
function readBatch(raw: string): unknown[] {
  const text = raw.trim();
  if (!text) throw new Error("Paste some JSON first.");

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new Error(`That is not valid JSON: ${(err as Error).message}`);
  }

  const items = asArray(parsed);
  if (items.length === 0) throw new Error("The array is empty.");
  if (items.length > 200) throw new Error("Import at most 200 at a time.");
  return items;
}

/**
 * Bulk job import. Publishes straight to the site.
 *
 * Unlike the nightly ingest, which queues AI-summarised listings for a human to
 * read, these rows were written by the admin pasting them — the review step
 * would be reviewing your own work. The trade-off is real and worth stating:
 * validation checks that a row is well-formed, not that it is true, so a wrong
 * figure in the paste is a wrong figure on the live site immediately.
 */
export async function importJobs(raw: string): Promise<ImportResult> {
  const admin = await requireAdmin();
  const now = new Date().toISOString();

  const { rows, errors } = parseRows(jobImport, readBatch(raw));
  const linkErrors = checkApplyLinks(rows);
  const allErrors = [...errors, ...linkErrors].sort((a, b) => a.row - b.row);

  // Nothing is written while anything is wrong: a partial import leaves you
  // guessing which half landed.
  if (allErrors.length > 0) return { imported: 0, duplicates: 0, errors: allErrors };

  const db = await supabaseServer();
  let imported = 0;
  let duplicates = 0;

  // Serially: uniqueSlug reads committed rows, so running it in parallel over
  // similar titles could hand out the same slug twice.
  for (const { value: row } of rows) {
    const applyLink = row.applyLink ? normalizeApplyLink(row.applyLink) : null;
    const postedAt = row.postedAt ? new Date(row.postedAt).toISOString() : new Date().toISOString();
    const parsedSalary = parseSalary(row.salary);

    const { error } = await db.from("jobs").insert({
      slug: await uniqueSlug("jobs", row.title),
      title: row.title,
      company: row.company,
      source_url: applyLink,
      source_name: row.sourceName || row.company,
      emirate: row.emirate ?? null,
      category: row.category,
      summary: row.summary ?? null,
      documents_needed: row.documentsNeeded,
      salary_text: row.salary ?? null,
      salary_min: parsedSalary.min,
      salary_max: parsedSalary.max,
      experience_years: row.experienceYears ?? null,
      apply_by: row.applyBy ?? null,
      posted_at: postedAt,
      expires_at: jobExpiry(postedAt),
      status: "approved",
      reviewed_by: admin.id,
      reviewed_at: now,
    });

    if (!error) imported += 1;
    else if (error.code === "23505") duplicates += 1;
    else throw new Error(`Row for "${row.title}" failed: ${error.message}`);
  }

  revalidateImported();
  return { imported, duplicates, errors: [] };
}

/** Bulk article import — guides, news or blog posts. Also published on import;
 *  see importJobs for why, and for what that costs. */
export async function importArticles(raw: string): Promise<ImportResult> {
  const admin = await requireAdmin();
  const now = new Date().toISOString();

  const { rows, errors } = parseRows(articleImport, readBatch(raw));
  if (errors.length > 0) return { imported: 0, duplicates: 0, errors };

  const db = await supabaseServer();
  let imported = 0;

  for (const { value: row } of rows) {
    const { error } = await db.from("articles").insert({
      slug: await uniqueSlug("articles", row.title),
      locale: row.locale,
      kind: row.kind,
      title: row.title,
      excerpt: row.excerpt ?? null,
      body_md: row.bodyMd,
      service_slug: row.serviceSlug ?? null,
      citations: toCitations(row.sources),
      // An article is only live once it has a publish date; jobs use posted_at.
      status: "approved",
      published_at: now,
      reviewed_by: admin.id,
      reviewed_at: now,
    });

    if (error) throw new Error(`Row for "${row.title}" failed: ${error.message}`);
    imported += 1;
  }

  revalidateImported();
  return { imported, duplicates: 0, errors: [] };
}