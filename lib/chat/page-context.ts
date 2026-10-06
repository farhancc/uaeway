/**
 * What the page already told us.
 *
 * A visitor who opened the widget on /en/services/attestation has said which
 * service they are here about. Working it out again from their first sentence
 * is paying twice for something we were handed — and getting it wrong where the
 * page could not have been.
 *
 * Derived from the path the widget already sends on every message, so this
 * costs no change to the browser at all.
 */

import { serviceSlugs } from "../services";

export interface PageContext {
  pageType: "service" | "job" | "article" | "other";
  /** A slug from `lib/services.ts`, never anything else. */
  serviceId: string | null;
  /**
   * The listing a job page is showing.
   *
   * Not validated against anything, because the jobs are rows rather than a
   * fixed list — so it is carried as the visitor's own string and only ever
   * used as an exact lookup, which returns nothing for a slug that is not real.
   */
  jobSlug: string | null;
}

const NONE: PageContext = { pageType: "other", serviceId: null, jobSlug: null };

/** The slot the service reaches the flow through, so a `branch` edge can route
 *  on it with the condition kind that already exists. */
export const SERVICE_SLOT = "service_id";

/** The same for the listing a visitor is reading. A `jobs` box set to answer
 *  about "this one" reads it from here, which is why opening the widget on a
 *  job page is enough to ask "does this one state the salary". */
export const JOB_SLOT = "job_slug";

export function pageContextFrom(pagePath: string | null | undefined): PageContext {
  if (!pagePath) return NONE;

  // /en/services/attestation → ["en", "services", "attestation"]
  const parts = pagePath.split("/").filter(Boolean);
  const section = parts[1];
  const slug = parts[2];

  if (section === "services" && slug) {
    // Checked against the real list: a path is user input, and a service id
    // that does not exist would send the qualification looking for a schema
    // that is not there.
    return {
      pageType: "service",
      serviceId: serviceSlugs().includes(slug) ? slug : null,
      jobSlug: null,
    };
  }
  if (section === "jobs" && slug) return { pageType: "job", serviceId: null, jobSlug: slug };
  if (section === "guides" || section === "news" || section === "blog") {
    return { pageType: "article", serviceId: null, jobSlug: null };
  }

  return NONE;
}
