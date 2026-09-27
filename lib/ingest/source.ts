/**
 * What a job source has to produce, independent of who it is.
 *
 * These types used to live in `careerjet.ts`, so `ingest/jobs.ts` imported its
 * vocabulary from one particular vendor. Swapping the source then meant editing
 * the consumer too. They live here now, and a source is anything that turns
 * searches into RawJobs.
 */

export interface RawJob {
  title: string;
  company: string | null;
  sourceUrl: string;
  /** Shown on the listing as the attribution. */
  sourceName: string;
  locations: string | null;
  salary: string | null;
  /** An excerpt. We summarise in our own words and link out; never republished. */
  description: string;
  postedAt: string;
}

export interface JobSearch {
  keywords: string;
  location: string;
}

export type JobSource = (searches: JobSearch[]) => Promise<RawJob[]>;

/** The same listing matches several searches; the source URL is its identity. */
export function dedupe(jobs: RawJob[]): RawJob[] {
  const seen = new Set<string>();
  return jobs.filter((j) => (seen.has(j.sourceUrl) ? false : (seen.add(j.sourceUrl), true)));
}
