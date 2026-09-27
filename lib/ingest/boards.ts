/**
 * Employer job boards — Greenhouse and Lever.
 *
 * Both publish every customer's board as an open JSON endpoint: no key, no
 * signup, no approval, and nothing to rate-limit us out of. They are the only
 * free UAE-capable source that needs nothing from anyone.
 *
 * The trade-off is coverage. An aggregator answers "who is hiring nurses in
 * Dubai"; a board answers "what is Careem hiring for". So this source is only
 * as good as the employer list in /admin/boards, and it is a complement to
 * Jooble rather than a replacement.
 *
 * What it gives up in breadth it gains in quality: these are the employer's own
 * postings, with an apply link that goes to the employer rather than through an
 * aggregator's redirect.
 */

import { normalizeEmirate } from "../uae";
import { dedupe, htmlToText, type RawJob } from "./source";

export interface JobBoard {
  ats: "greenhouse" | "lever";
  /** The employer's identifier in that ATS's URLs. */
  slug: string;
  name: string;
}

/** What the caller needs to know about a board that did not work, so a dead or
 *  renamed board can be shown as dead in the admin rather than failing into a
 *  log nobody reads. */
export interface BoardResult {
  jobs: RawJob[];
  errors: { board: JobBoard; message: string }[];
}

interface GreenhouseJob {
  title?: string;
  absolute_url?: string;
  company_name?: string;
  content?: string;
  updated_at?: string;
  location?: { name?: string };
}

interface LeverJob {
  text?: string;
  hostedUrl?: string;
  descriptionPlain?: string;
  createdAt?: number;
  categories?: { location?: string; allLocations?: string[] };
}

/**
 * This site lists UAE work. A board is the whole employer, so most of what
 * comes back is somewhere else — Careem's board is 18 roles, 11 of them here.
 * Filtering at the source rather than in the review queue is what stops us
 * paying a model to summarise a job in Berlin that a human would then reject.
 */
function inUae(location: string | null | undefined): boolean {
  return normalizeEmirate(location) !== null;
}

async function greenhouse(board: JobBoard): Promise<RawJob[]> {
  const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(board.slug)}/jobs?content=true`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const data = (await res.json()) as { jobs?: GreenhouseJob[] };
  const jobs = data.jobs ?? [];
  const uae = jobs.filter((j) => inUae(j.location?.name));
  console.log(`[boards] greenhouse/${board.slug}: ${uae.length} UAE of ${jobs.length}`);

  return uae
    .filter((j): j is GreenhouseJob & { title: string; absolute_url: string } =>
      Boolean(j.title && j.absolute_url),
    )
    .map((j) => ({
      title: j.title.trim(),
      company: j.company_name?.trim() || board.name,
      sourceUrl: j.absolute_url,
      // The employer, not the ATS. These are their own postings, and crediting
      // "Greenhouse" would name the software rather than who is hiring.
      sourceName: board.name,
      locations: j.location?.name?.trim() ?? null,
      // Neither ATS exposes a salary field.
      salary: null,
      // Greenhouse HTML-escapes an entire document into this string.
      description: htmlToText(j.content ?? "").slice(0, 2000),
      postedAt: j.updated_at ? new Date(j.updated_at).toISOString() : new Date().toISOString(),
    }));
}

async function lever(board: JobBoard): Promise<RawJob[]> {
  const url = `https://api.lever.co/v0/postings/${encodeURIComponent(board.slug)}?mode=json`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const data = await res.json();
  // Lever answers 200 with an error object for a board that does not exist.
  if (!Array.isArray(data)) throw new Error("board not found");

  const jobs = data as LeverJob[];
  const uae = jobs.filter(
    (j) =>
      inUae(j.categories?.location) ||
      (j.categories?.allLocations ?? []).some((l) => inUae(l)),
  );
  console.log(`[boards] lever/${board.slug}: ${uae.length} UAE of ${jobs.length}`);

  return uae
    .filter((j): j is LeverJob & { text: string; hostedUrl: string } =>
      Boolean(j.text && j.hostedUrl),
    )
    .map((j) => ({
      title: j.text.trim(),
      company: board.name,
      sourceUrl: j.hostedUrl,
      sourceName: board.name,
      locations: j.categories?.location?.trim() ?? null,
      salary: null,
      // Lever gives us prose directly, so no markup to strip.
      description: (j.descriptionPlain ?? "").slice(0, 2000),
      postedAt: j.createdAt ? new Date(j.createdAt).toISOString() : new Date().toISOString(),
    }));
}

/** Fetches every board. Never throws: one dead board must not cost the run. */
export async function fetchBoards(boards: JobBoard[]): Promise<BoardResult> {
  const jobs: RawJob[] = [];
  const errors: BoardResult["errors"] = [];

  for (const board of boards) {
    try {
      jobs.push(...(board.ats === "greenhouse" ? await greenhouse(board) : await lever(board)));
    } catch (err) {
      const message = (err as Error).message;
      console.warn(`[boards] ${board.ats}/${board.slug} failed: ${message}`);
      errors.push({ board, message });
    }
  }

  return { jobs: dedupe(jobs), errors };
}
