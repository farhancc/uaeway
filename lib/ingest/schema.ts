import { z } from "zod";

/**
 * The wire shape of a listing posted to `/api/ingest/jobs`.
 *
 * Every other source is a module in this directory, so its output is checked
 * by the compiler. This one arrives over HTTP from a scraper running on
 * someone's laptop, which makes it the only untrusted producer of a `RawJob` —
 * and whatever lands here goes through the AI pass and onto the site. So it
 * gets validated rather than cast.
 *
 * The caps are not ceremony. `MAX_BATCH` bounds what one request can spend on
 * Gemini, and the string limits stop a listing with a megabyte of "description"
 * from being paid for twice, once in the prompt and once in the row.
 */

/** Enough for a full scraping run, small enough to bound one request's AI bill. */
export const MAX_BATCH = 200;

export const rawJobInput = z.object({
  title: z.string().trim().min(1).max(300),
  company: z.string().trim().max(200).nullable().default(null),
  // http(s) only, and a real URL: it becomes the row's identity and a link a
  // visitor clicks, so a `javascript:` or `data:` scheme must not reach the
  // page. `z.url` enforces the protocol itself; `z.string().url()` is the
  // deprecated spelling.
  sourceUrl: z.url({ protocol: /^https?$/ }).max(2000),
  sourceName: z.string().trim().min(1).max(120),
  locations: z.string().trim().max(300).nullable().default(null),
  // Verbatim employer text or nothing. Never a figure the scraper worked out.
  salary: z.string().trim().max(200).nullable().default(null),
  description: z.string().trim().max(4000).default(""),
  postedAt: z.iso.datetime(),
  /**
   * The caller asserting it matched a single-listing URL pattern, which is one
   * of the three things `autoApprove` needs. Accepting a publish-relevant claim
   * over the wire is only sound because this endpoint is behind `CRON_SECRET`:
   * anyone who can set this flag can already run the scheduled routes. It is
   * not a field any public caller can reach.
   */
  singleListingUrl: z.boolean().optional(),
});

export const ingestBody = z.object({
  jobs: z.array(rawJobInput).min(1).max(MAX_BATCH),
});
