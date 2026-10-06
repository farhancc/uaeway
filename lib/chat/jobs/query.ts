/**
 * What a visitor's message asks of the jobs board.
 *
 * The flow answers written-down questions from written-down answers, which is
 * right for "do I need my degree attested" and useless for "any civil engineer
 * jobs in Dubai paying over 12k". There is no finite set of those: a role is
 * whatever the visitor does for a living, and the answer changes every time the
 * ingest runs. So this reads the message into the filters the board already
 * understands, and `../../content/queries.ts` answers it.
 *
 * Deliberately not a model call. Extraction would cost a turn's budget on the
 * single most common kind of question a jobs site gets, and the thing being
 * extracted is a noun and a place — which a stoplist does as well as a model
 * and the same way every time. `../qualify/extract.ts` is the model-backed
 * reader, and it earns its cost on sentences, not on "nurse jobs dubai".
 *
 * Pure: no database, no clock, no model.
 */

import { emirateInText, type Emirate } from "../../uae";
import { tokenize } from "../../text";

/** What the board is being asked for, in the terms `JobFilters` speaks. */
export interface BoardQuery {
  /**
   * The role, as search terms with everything that is not the job stripped out.
   *
   * Postgres `websearch_to_tsquery` ANDs its terms, so every word left in here
   * narrows the result — "any nurse jobs in dubai for a fresher" searched whole
   * matches nothing at all. That is why the stoplists below are long and why
   * this is capped: four nouns is a precise search, eight is an empty one.
   */
  terms: string[];
  emirate: Emirate | null;
  /** They said they have no experience, so listings asking for years are out. */
  freshersOnly: boolean;
  /** A floor they named — "at least 10k". Monthly AED, as the board stores it. */
  salaryMin: number | null;
}

/** Words to the effect of "is there a job" — true of every search, so they
 *  discriminate nothing and only narrow the result. */
const ASKING = new Set([
  "a", "about", "am", "an", "and", "any", "anybody", "anyone", "anything", "are", "around",
  "as", "at", "available", "based", "be", "been", "can", "could", "currently", "do", "does",
  "find", "for", "from", "get", "give", "got", "has", "have", "hiring", "how", "i", "if", "in",
  "is", "it", "job", "jobs", "just", "latest", "like", "list", "look", "looking", "me", "my",
  "near", "need", "new", "now", "of", "on", "open", "opening", "openings", "opportunities",
  "opportunity", "or", "please", "position", "positions", "post", "posted", "posting",
  "postings", "recruiting", "right", "role", "roles", "show", "some", "something", "tell",
  "that", "the", "their", "there", "these", "this", "those", "to", "uae", "us", "vacancies",
  "vacancy", "want", "we", "what", "whats", "when", "where", "which", "who", "will", "with",
  "work", "working", "would", "you", "your",
  // Words for the board itself. A tapped chip sends its own label — "Which of
  // your listings are open to freshers?" — and "listings" surviving as a search
  // term looked for vacancies with the word "listings" in them, which is three
  // adverts out of 258 and reads as a broken search.
  "board", "listing", "listings", "page", "portal", "site", "website",
]);

/** Pay vocabulary. A salary question is routed by the flow, not by these, so
 *  here they are only noise — "nurse salary dubai" searches for a nurse. */
const PAY = new Set([
  "aed", "allowance", "allowances", "annual", "annually", "annum", "average", "basic", "ctc",
  "dirham", "dirhams", "earn", "earning", "earnings", "earns", "expect", "expected", "income",
  "least", "making", "max", "maximum", "min", "minimum", "money", "month", "monthly", "much",
  "offering", "over", "package", "paid", "pay", "paying", "pays", "range", "salaries", "salary",
  "stipend", "under", "wage", "wages", "year", "yearly",
]);

/** Experience vocabulary, read into `freshersOnly` and then dropped. */
const EXPERIENCE = new Set([
  "entry", "experience", "experienced", "fresh", "fresher", "freshers", "graduate", "graduates",
  "junior", "level", "no", "senior", "years", "yrs",
]);

/** How many role words survive. See `BoardQuery.terms`. */
const MAX_TERMS = 4;

/** A term shorter than this is noise the stoplists missed, except for the
 *  abbreviations people really do search by. */
const MIN_TERM_CHARS = 3;
/** "it" is not here on purpose: it is a pronoun far more often than it is a
 *  field, and "it support" searched as "support" still finds the listings. */
const SHORT_ROLES = new Set(["hr", "qa", "cad", "ceo", "cfo", "pa"]);

/**
 * A salary floor the visitor named, in monthly AED.
 *
 * Not `../../salary.ts`'s `parseSalary`: that reads what an employer advertised
 * and is right to treat a bare pair of numbers as a range. This reads a demand,
 * where a bare number means "about this much" and only an explicit "over",
 * "at least" or "10k+" means a floor — so a figure mentioned in passing cannot
 * silently empty the board.
 */
function salaryFloorIn(message: string): number | null {
  const match =
    /\b(?:over|above|more than|at least|minimum(?: of)?|min|starting(?: at| from)?|from|upwards of)\s*(?:aed\s*)?(\d[\d,]*(?:\.\d+)?)\s*(k)?/i.exec(
      message,
    ) ?? /\b(?:aed\s*)?(\d[\d,]*(?:\.\d+)?)\s*(k)?\s*\+/i.exec(message);
  if (!match) return null;

  const value = Number.parseFloat(match[1].replace(/,/g, ""));
  if (!Number.isFinite(value)) return null;

  const scaled = match[2] ? Math.round(value * 1_000) : Math.round(value);
  // A number this small is a count of years or a typo, and one this large is an
  // annual figure read as a monthly one. Either would hide the whole board.
  return scaled >= 1_000 && scaled <= 200_000 ? scaled : null;
}

/** "No experience", "fresher", "fresh graduate" — the question a large part of
 *  this site's traffic arrives with. "Senior" is not its opposite in the data,
 *  so it only ever turns the filter on. */
function freshersIn(words: string[], message: string): boolean {
  if (/\bno (?:prior |relevant |work |uae |gulf )?experience\b/i.test(message)) return true;
  if (/\b(?:entry|graduate)[ -]level\b/i.test(message)) return true;
  return words.some((w) => w === "fresher" || w === "freshers");
}

/**
 * The message as a board search.
 *
 * `preset` is the authored node's own terms, used when the message names no
 * role at all — a tapped "Healthcare jobs" chip carries no words of its own,
 * and neither does "what have you got in Dubai". The visitor's words win when
 * they have any, because the chip is a starting point and the sentence is the
 * question.
 */
export function parseBoardQuery(message: string, preset = ""): BoardQuery {
  const words = tokenize(message);

  const terms: string[] = [];
  for (const word of words) {
    if (terms.length >= MAX_TERMS) break;
    if (ASKING.has(word) || PAY.has(word) || EXPERIENCE.has(word)) continue;
    if (/^\d+$/.test(word) || /^\d+k$/.test(word)) continue;
    // A place is a filter, not a search term: searching the text for "dubai"
    // as well drops every listing that did not repeat it in its description.
    if (emirateInText(word)) continue;
    if (word.length < MIN_TERM_CHARS && !SHORT_ROLES.has(word)) continue;
    if (terms.includes(word)) continue;
    terms.push(word);
  }

  return {
    terms: terms.length > 0 ? terms : tokenize(preset).slice(0, MAX_TERMS),
    emirate: emirateInText(message),
    freshersOnly: freshersIn(words, message),
    salaryMin: salaryFloorIn(message),
  };
}

/** What to call the search in a sentence: "nurse jobs in Dubai", "jobs in
 *  Sharjah". Composed rather than echoed, so nothing a visitor typed is read
 *  back to them as though it were our own description of the board. */
export function describeQuery(query: BoardQuery): string {
  const role = query.terms.length > 0 ? `${query.terms.join(" ")} ` : "";
  const open = query.freshersOnly ? " open to freshers" : "";
  const place = query.emirate ? ` in ${query.emirate}` : " in the UAE";
  return `${role}jobs${open}${place}`;
}

/** The same search as a link to the board, so anyone can see the whole list
 *  and work the filters themselves. Params match the jobs page's own. */
export function boardPath(query: BoardQuery, locale = "en"): string {
  const params = new URLSearchParams();
  if (query.terms.length > 0) params.set("q", query.terms.join(" "));
  if (query.emirate) params.set("emirate", query.emirate);
  if (query.salaryMin) params.set("salaryMin", String(query.salaryMin));
  if (query.freshersOnly) params.set("experience", "0");

  const search = params.toString();
  return `/${locale}/jobs${search ? `?${search}` : ""}`;
}
