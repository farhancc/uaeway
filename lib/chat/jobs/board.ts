/**
 * Reading the jobs board on behalf of a conversation.
 *
 * The flow's `jobs` box stops here: `./query.ts` has turned the message into
 * filters, `./answer.ts` can turn rows into sentences, and this is the part that
 * actually asks the database and decides what to do when the answer is nothing.
 *
 * Nothing in here costs a model call. That is the point of the box: a jobs site
 * is asked "any X jobs in Y" more than anything else, and today every one of
 * those questions falls through the authored flow to the model, which pays to
 * write a paragraph around two retrieved listings. A board search is an indexed
 * query and the figures in it are the employer's own.
 */

import { JOB_SLOT } from "../page-context";
import { getJob, searchJobs, type JobFilters, type JobSummary } from "../../content/queries";
import { parseBoardQuery, type BoardQuery } from "./query";
import {
  MIN_STATING,
  renderListings,
  renderPosting,
  renderSalary,
  type BoardResult,
  type Relaxation,
} from "./answer";

/** How many listings a reply carries. The board link carries the rest. */
const SHOWN = 3;

/** What the board is being asked to do. Mirrors the node's own field. */
export type BoardMode = "listings" | "salary" | "posting";

function filtersFor(query: BoardQuery, limit: number): JobFilters {
  return {
    q: query.terms.length > 0 ? query.terms.join(" ") : undefined,
    emirates: query.emirate ? [query.emirate] : undefined,
    salaryMin: query.salaryMin ?? undefined,
    // The strict filter, not the page's: see `JobFilters.freshersOnly`.
    freshersOnly: query.freshersOnly ? true : undefined,
    limit,
  };
}

/**
 * The same question, asked less and less precisely.
 *
 * An empty board is the common case for a specific search — 258 listings
 * across three emirates will not hold a civil engineering job in Fujairah — and
 * "no" is a worse answer than "not that, but these". So each rung gives up one
 * condition, in the order that costs the visitor least: the salary they named
 * is a preference, the emirate is a strong one, and the role is the thing they
 * actually came for, so it is relaxed last and only ever narrowed to its most
 * specific word rather than dropped.
 *
 * Only applicable rungs are built, so the ordinary search is one query.
 */
function ladder(query: BoardQuery): { query: BoardQuery; relaxed: Relaxation | null }[] {
  const rungs: { query: BoardQuery; relaxed: Relaxation | null }[] = [
    { query, relaxed: null },
  ];
  let current = query;

  if (current.salaryMin !== null) {
    current = { ...current, salaryMin: null };
    rungs.push({ query: current, relaxed: "salary" });
  }
  if (current.freshersOnly) {
    current = { ...current, freshersOnly: false };
    rungs.push({ query: current, relaxed: "experience" });
  }
  if (current.emirate !== null) {
    current = { ...current, emirate: null };
    rungs.push({ query: current, relaxed: "emirate" });
  }
  if (current.terms.length > 1) {
    // The longest word is the role rather than the qualifier: "senior civil
    // engineer" keeps "engineer", which is what the titles on the board are
    // written in.
    const longest = [...current.terms].sort((a, b) => b.length - a.length)[0];
    current = { ...current, terms: [longest] };
    rungs.push({ query: current, relaxed: "role" });
  }

  return rungs;
}

/** The first rung that matches anything, or the bottom rung's emptiness. */
async function firstHit(query: BoardQuery, limit = SHOWN): Promise<BoardResult> {
  const rungs = ladder(query);

  for (const rung of rungs) {
    const { rows, total } = await searchJobs(filtersFor(rung.query, limit));
    if (total > 0) return { query: rung.query, asked: query, rows, total, relaxed: rung.relaxed };
  }

  return {
    query: rungs[rungs.length - 1].query,
    asked: query,
    rows: [],
    total: 0,
    relaxed: null,
  };
}

/**
 * What the matching listings advertise, counted both ways.
 *
 * Two queries rather than one, because the honest sentence needs the listings
 * that state a salary *and* the listings that do not: a range drawn from four
 * adverts reads very differently alongside "of forty" than on its own, and the
 * second number is the one that stops it being quoted as the going rate.
 */
async function salaryEvidence(
  query: BoardQuery,
): Promise<{
  query: BoardQuery;
  asked: BoardQuery;
  total: number;
  stating: number;
  rows: JobSummary[];
}> {
  // A salary question's own number ("do nurses earn over 10k") must not filter
  // the evidence, or the answer is the question read back.
  const base = await firstHit({ ...query, salaryMin: null }, 1);
  if (base.total === 0) return { query: base.query, asked: query, total: 0, stating: 0, rows: [] };

  const paying = await searchJobs({
    ...filtersFor(base.query, Math.max(SHOWN, MIN_STATING)),
    hasSalary: true,
  });

  return {
    query: base.query,
    asked: query,
    total: base.total,
    stating: paying.total,
    rows: paying.rows,
  };
}

/**
 * One board-backed reply.
 *
 * `fallback` is the authored prose for the cases data cannot answer — an empty
 * board, or a role whose listings do not state pay. That division is the whole
 * arrangement: the figures come from the listings, and the advice around them
 * was written by a person and reviewed.
 */
export async function answerFromBoard(args: {
  mode: BoardMode;
  /** The node's own search terms, used when the message names no role. */
  preset: string;
  fallback: string;
  message: string;
  /** The conversation's slots, read for the listing a job page is showing. */
  slots: Record<string, string>;
  locale?: string;
  now?: Date;
}): Promise<string> {
  const { mode, preset, fallback, message, slots, locale = "en", now = new Date() } = args;

  if (mode === "posting") {
    const slug = slots[JOB_SLOT];
    const job = slug ? await getJob(slug) : null;
    // Asked away from a job page, or about a listing that has since expired.
    // Falling back to a search is better than "which job?", because the words
    // they used are usually the role anyway.
    if (job) return renderPosting(job, locale, now);
  }

  const query = parseBoardQuery(message, preset);

  if (mode === "salary") {
    return renderSalary(await salaryEvidence(query), fallback, locale, now);
  }

  return renderListings(await firstHit(query), fallback, locale, now);
}
