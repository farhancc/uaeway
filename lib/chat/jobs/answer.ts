/**
 * The board, said out loud.
 *
 * Every figure in here came out of a listing an employer posted. Nothing is
 * averaged into a market rate, nothing is rounded into a "typical" salary, and
 * a role with too few stated salaries to be worth quoting gets a sentence
 * saying so rather than a range built on one outlier. That rule is the whole
 * reason this module exists instead of a paragraph from the model: `../prompt.ts`
 * forbids the chat from asserting a figure the context does not support, and
 * the context that supports a figure here is the listing it is printed beside.
 *
 * Pure, so the wording is testable without a database: `./board.ts` does the
 * reading and hands the rows in.
 */

import { formatSalary, experienceLabel, deadlineLabel } from "../../salary";
import type { JobSummary } from "../../content/queries";
import { boardPath, describeQuery, type BoardQuery } from "./query";

/** How many listings a reply shows before it stops being a reply and starts
 *  being a results page. The link to the board carries the rest. */
const SHOWN = 3;

/**
 * How many matching listings must state a salary before a range is quoted.
 *
 * Of 258 live listings, 17 state a salary we can read — so for most roles the
 * honest answer is that the board does not know, and a "range" drawn from one
 * or two posts would be a number someone takes into a negotiation. Three is the
 * point at which the spread describes the listings rather than an accident of
 * which employer happened to publish a figure, and even then it is labelled as
 * what these employers advertised.
 */
export const MIN_STATING = 3;

/** What had to be given up to find anything, so the reply can say so instead
 *  of quietly answering a different question than the one asked. */
export type Relaxation = "salary" | "experience" | "emirate" | "role";

export interface BoardResult {
  /**
   * What was actually searched, after any widening. Links and counts are about
   * this, because it is what the rows are.
   */
  query: BoardQuery;
  /**
   * What the visitor asked for, before widening.
   *
   * Kept separately because the reply has to say both: "nothing in Fujairah,
   * so this is the rest of the UAE" needs the emirate that was given up, and
   * reading it off the relaxed query printed "Nothing in null right now".
   */
  asked: BoardQuery;
  /** The listings to show, newest first. At most a handful. */
  rows: JobSummary[];
  /** How many match in total, which is the number worth telling someone. */
  total: number;
  relaxed: Relaxation | null;
}

/** AED per month across these listings, ignoring the ones that said nothing. */
export function salarySpread(rows: JobSummary[]): { min: number | null; max: number | null } {
  const lows = rows.map((r) => r.salary_min).filter((n): n is number => n !== null);
  const highs = rows.map((r) => r.salary_max).filter((n): n is number => n !== null);
  const all = [...lows, ...highs];
  if (all.length === 0) return { min: null, max: null };
  return { min: Math.min(...all), max: Math.max(...all) };
}

function count(n: number, singular: string, plural = `${singular}s`): string {
  return `${n} ${n === 1 ? singular : plural}`;
}

/**
 * One listing as a line someone can act on.
 *
 * The salary is the employer's own string where there is one — `salary_text` is
 * stored verbatim for exactly this reason — and the parsed range only where
 * there is not, because "AED 8k-10k negotiable" says more than our
 * reconstruction of it does.
 */
function line(job: JobSummary, locale: string, now: Date): string {
  const pay = job.salary_text?.trim() || formatSalary({ min: job.salary_min, max: job.salary_max });
  const deadline = deadlineLabel(job.apply_by, now);

  const facts = [
    [job.company, job.emirate].filter(Boolean).join(", "),
    pay,
    experienceLabel(job.experience_years),
    deadline?.urgent ? deadline.text : null,
  ].filter(Boolean);

  return `- **[${job.title}](/${locale}/jobs/${job.slug})** — ${facts.join(" · ")}`;
}

/** "All 14 nursing jobs in Dubai" — the way out of a three-item answer. */
function boardLink(result: BoardResult, locale: string): string {
  const path = boardPath(result.query, locale);

  // The one place the chat's count and the page's differ, said rather than
  // hidden: the board's own filter asks "what could I apply for with no
  // experience", which keeps every listing that stated no requirement, while
  // this reply counted only the ones that say so outright.
  if (result.query.freshersOnly) {
    return `A listing that states no requirement at all is not the same as one that welcomes a fresher, so those are not counted above — [the board's own filter](${path}) shows both.`;
  }

  return result.total > result.rows.length
    ? `[See all ${count(result.total, "listing")} on the board](${path})`
    : `[Open these on the board](${path})`;
}

/** What we widened, in a clause that admits it. */
function relaxedNote(result: BoardResult): string | null {
  switch (result.relaxed) {
    case "emirate":
      return `Nothing in ${result.asked.emirate} right now, so this is the rest of the UAE.`;
    case "salary":
      return "None of them state a salary that high, so the figure is not filtered here.";
    case "experience":
      return "None are marked open to freshers, so these ask for some experience.";
    case "role":
      return "Nothing matched that exactly, so this is the closest the board has.";
    case null:
      return null;
  }
}

/**
 * Matching listings, or an honest account of there being none.
 *
 * `fallback` is the authored sentence for an empty board — the one thing a
 * written answer does better than data, because what to do when there is no
 * vacancy is advice rather than a lookup.
 */
export function renderListings(
  result: BoardResult,
  fallback: string,
  locale = "en",
  now = new Date(),
): string {
  const what = describeQuery(result.query);

  if (result.rows.length === 0) {
    // Described as they asked it, plus the fact that widening found nothing
    // either — "nothing in Ajman" and "nothing anywhere" are different answers
    // and they are entitled to the second one when it is true.
    const everywhere =
      result.asked.emirate && !result.query.emirate ? ", or anywhere else in the UAE" : "";
    return [
      `I have nothing on the board for ${describeQuery(result.asked)}${everywhere} at the moment — the listings come off automatically once they expire, so this changes week to week.`,
      fallback,
      `[Browse everything we have](/${locale}/jobs)`,
    ].join("\n\n");
  }

  const note = relaxedNote(result);
  const lead =
    result.total > result.rows.length
      ? `${count(result.total, "listing")} for ${what} on the board right now. The newest ${result.rows.length}:`
      : `${count(result.total, "listing")} for ${what} on the board right now:`;

  return [
    note ? `${note}\n\n${lead}` : lead,
    result.rows.map((job) => line(job, locale, now)).join("\n"),
    boardLink(result, locale),
  ].join("\n\n");
}

/**
 * What the board says this role pays — or why it cannot say.
 *
 * Two numbers do the work: how many listings match, and how many of those
 * state a salary. Quoting the second without the first is how a spread taken
 * from three posts out of forty reads as the going rate.
 */
export function renderSalary(
  evidence: {
    query: BoardQuery;
    asked: BoardQuery;
    total: number;
    stating: number;
    rows: JobSummary[];
  },
  fallback: string,
  locale = "en",
  now = new Date(),
): string {
  const what = describeQuery(evidence.query);
  const link = `[Open the listings](${boardPath(evidence.query, locale)})`;

  if (evidence.total === 0) {
    return [
      `I have nothing on the board for ${describeQuery(evidence.asked)} at the moment, so I cannot tell you what it is advertised at here.`,
      fallback,
    ].join("\n\n");
  }

  if (evidence.stating < MIN_STATING) {
    const have =
      evidence.stating === 0
        ? `None of the ${count(evidence.total, "listing")} for ${what} state a salary`
        : `Only ${evidence.stating} of the ${count(evidence.total, "listing")} for ${what} ${
            evidence.stating === 1 ? "states" : "state"
          } a salary`;

    return [
      `${have}, which is too few to give you a figure worth using in a negotiation.`,
      fallback,
      evidence.rows.length > 0
        ? `What those listings do say:\n\n${evidence.rows.map((job) => line(job, locale, now)).join("\n")}`
        : link,
    ]
      .filter(Boolean)
      .join("\n\n");
  }

  const spread = salarySpread(evidence.rows);
  const range = formatSalary(spread);

  return [
    `${evidence.stating} of the ${count(evidence.total, "listing")} for ${what} state what they pay, and those advertise ${range}.`,
    "That is what these employers put in these adverts — not a market rate. Pay here moves with the sector, the employer and what the package includes around the basic, so treat it as the bottom of your research rather than the answer.",
    evidence.rows.length > 0
      ? evidence.rows.slice(0, SHOWN).map((job) => line(job, locale, now)).join("\n")
      : null,
    link,
  ]
    .filter(Boolean)
    .join("\n\n");
}

/**
 * The listing the visitor is reading.
 *
 * Reached from a job page, where "does this one state the salary" and "what
 * will they want from me" are the two questions, and both are answered by the
 * row itself. `documents_needed` is the bridge the rest of the site is built
 * on: the paperwork is the part we can actually take off them.
 */
export function renderPosting(job: JobSummary, locale = "en", now = new Date()): string {
  const pay = job.salary_text?.trim() || formatSalary({ min: job.salary_min, max: job.salary_max });
  const deadline = deadlineLabel(job.apply_by, now);
  const experience = experienceLabel(job.experience_years);

  const facts = [
    pay ? `**Pay:** ${pay}, as the employer advertised it` : "**Pay:** this listing does not state one, and I will not guess at it",
    experience ? `**Experience:** ${experience}` : null,
    deadline ? `**Deadline:** ${deadline.text}` : null,
  ].filter(Boolean);

  const documents =
    job.documents_needed.length > 0
      ? `The listing expects these from you: ${job.documents_needed.join(", ")}. Those have to be attested and, for most employers here, translated into Arabic before a work permit can be issued — which is the part that holds people up, and the part we can take off you.`
      : null;

  return [
    `**${job.title}**${job.company ? ` at ${job.company}` : ""}${job.emirate ? `, ${job.emirate}` : ""}.`,
    facts.join("  \n"),
    documents,
    `[Open the full listing](/${locale}/jobs/${job.slug})`,
  ]
    .filter(Boolean)
    .join("\n\n");
}
