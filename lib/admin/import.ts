/**
 * Bulk import from pasted JSON.
 *
 * One object or an array of them, for jobs and for articles. The point is to
 * take work that already exists somewhere — a spreadsheet export, another
 * model's output, a list someone keeps by hand — without retyping it into a
 * form one row at a time.
 *
 * Two rules it does not bend:
 *
 * Everything arrives as `pending`. Nothing reaches the public site without a
 * person approving it, and a bulk path is exactly where that would erode.
 *
 * The whole batch is validated before anything is written. A partial import
 * leaves you guessing which half landed; refusing the batch and naming the bad
 * rows costs one more paste and nothing else, because nothing was written.
 */

import { z } from "zod";
import { EMIRATES, JOB_CATEGORIES } from "../uae";
import { normalizeApplyLink } from "../jobs";

/** Accepts either shape, because "paste your JSON" should not mean "remember
 *  to wrap it in brackets". */
export function asArray(parsed: unknown): unknown[] {
  return Array.isArray(parsed) ? parsed : [parsed];
}

const trimmed = z.string().trim();

export const jobImport = z.object({
  title: trimmed.min(1, "title is required").max(200),
  company: trimmed.min(1, "company is required").max(160),
  /** Where people actually apply. A listing without one is not worth having. */
  applyLink: trimmed.min(1, "applyLink is required"),
  emirate: z.enum(EMIRATES).nullish(),
  category: z.enum(JOB_CATEGORIES).default("Other"),
  summary: trimmed.max(4000).nullish(),
  documentsNeeded: z.array(trimmed).max(6).default([]),
  /** Who the listing came from. Defaults to the employer. */
  sourceName: trimmed.max(160).nullish(),
  /** ISO date. Defaults to now, which also drives the expiry. */
  postedAt: trimmed.nullish(),
});

export const articleImport = z.object({
  kind: z.enum(["guide", "news", "blog"]).default("blog"),
  title: trimmed.min(1, "title is required").max(300),
  bodyMd: trimmed.min(1, "bodyMd is required"),
  excerpt: trimmed.max(500).nullish(),
  locale: trimmed.default("en"),
  serviceSlug: trimmed.nullish(),
  /** "Title | https://example.com", or a bare URL. */
  sources: z.array(trimmed).default([]),
});

export type JobImport = z.infer<typeof jobImport>;
export type ArticleImport = z.infer<typeof articleImport>;

export interface RowError {
  /** 1-based, because the person is looking at a list, not an array. */
  row: number;
  message: string;
}

/** A row that validated, carrying where it came from. The position in the
 *  surviving array is not the position in the paste — once an earlier row is
 *  dropped the two diverge, and a later check that reported its own index
 *  pointed the reader at the wrong line. */
export interface Row<T> {
  row: number;
  value: T;
}

export interface Parsed<T> {
  rows: Row<T>[];
  errors: RowError[];
}

/** Zod's own message, prefixed with the field, so "row 3: applyLink — required"
 *  points at something the person can actually find in their paste. */
function describe(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.join(".");
      return path ? `${path} — ${issue.message}` : issue.message;
    })
    .join("; ");
}

export function parseRows<T>(schema: z.ZodType<T>, input: unknown[]): Parsed<T> {
  const rows: Row<T>[] = [];
  const errors: RowError[] = [];

  input.forEach((item, i) => {
    const result = schema.safeParse(item);
    if (result.success) rows.push({ row: i + 1, value: result.data });
    else errors.push({ row: i + 1, message: describe(result.error) });
  });

  return { rows, errors };
}

/**
 * Apply links are checked here rather than at insert time so a bad one is
 * reported against its row alongside everything else, instead of failing the
 * batch from inside the database.
 */
export function checkApplyLinks(rows: Row<JobImport>[]): RowError[] {
  const errors: RowError[] = [];
  for (const { row, value } of rows) {
    if (!normalizeApplyLink(value.applyLink)) {
      errors.push({
        row,
        message: `applyLink — "${value.applyLink}" is neither a link nor an email address`,
      });
    }
  }
  return errors;
}

/** Citations from the "Title | URL" shorthand the article form already uses. */
export function toCitations(sources: string[]): { title: string; url: string; retrieved_at: string }[] {
  return sources.map((line) => {
    const [first, second] = line.split("|").map((part) => part.trim());
    const url = second ?? first;
    return { title: second ? first : url, url, retrieved_at: new Date().toISOString() };
  });
}
