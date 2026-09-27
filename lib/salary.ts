/**
 * Salary strings, as numbers you can compare.
 *
 * Feeds write salary however the employer wrote it: "AED 8,000 - 12,000",
 * "120000 per year", "Up to 15k", "Competitive". To filter by range we need
 * numbers; to show it honestly we keep the original string untouched.
 *
 * Everything here normalises to **AED per month**, which is how UAE job ads are
 * written. Anything we cannot be sure about returns nulls — a wrong salary is
 * the single most damaging thing this site could assert, and a job that simply
 * does not appear under a range filter is a far smaller harm than one that
 * appears under the wrong one.
 */

export interface ParsedSalary {
  /** AED per month. Null when the string could not be read with confidence. */
  min: number | null;
  max: number | null;
}

const NONE: ParsedSalary = { min: null, max: null };

/** Currencies we can compare without inventing an exchange rate. A UAE job ad
 *  with no currency marker means dirhams. */
const AED = /\b(aed|dhs?|dirhams?)\b|د\.إ/i;
const OTHER_CURRENCY = /[$£€₹¥]|\b(usd|eur|gbp|inr|sar|qar|kwd|omr|bhd|pkr|php)\b/i;

const YEARLY = /\b(year|yearly|annum|annual|annually|p\.?a\.?|yr)\b/i;
const HOURLY = /\b(hour|hourly|hr)\b/i;
const DAILY = /\b(day|daily|per diem)\b/i;

/** Below this a "salary" is a typo, a reference number or an hourly rate that
 *  slipped through; above it, a misread of an annual figure. Both directions
 *  produce nonsense in a range filter, so neither is kept. */
const MIN_PLAUSIBLE = 500;
const MAX_PLAUSIBLE = 500_000;

/** "8,000" → 8000, "8k" → 8000, "1.5k" → 1500. */
function toNumber(raw: string): number | null {
  const cleaned = raw.replace(/,/g, "").trim();
  const match = /^(\d+(?:\.\d+)?)\s*([km])?$/i.exec(cleaned);
  if (!match) return null;

  const value = Number.parseFloat(match[1]);
  if (!Number.isFinite(value)) return null;

  const suffix = match[2]?.toLowerCase();
  if (suffix === "k") return Math.round(value * 1_000);
  if (suffix === "m") return Math.round(value * 1_000_000);
  return Math.round(value);
}

function plausible(value: number | null): number | null {
  if (value === null) return null;
  return value >= MIN_PLAUSIBLE && value <= MAX_PLAUSIBLE ? value : null;
}

/**
 * Reads a salary string into a monthly AED range.
 *
 * Returns nulls rather than guessing whenever the string names a currency we
 * cannot convert, quotes an hourly or daily rate, or holds no number at all.
 */
export function parseSalary(input: string | null | undefined): ParsedSalary {
  if (!input) return NONE;
  const text = input.trim();
  if (!text) return NONE;

  // Another currency needs a rate we do not have and should not invent.
  if (OTHER_CURRENCY.test(text) && !AED.test(text)) return NONE;

  // An hourly or daily rate would need hours we were never told.
  if (HOURLY.test(text) || DAILY.test(text)) return NONE;

  // The (?![a-z]) matters: without it the "m" of "monthly" was read as a
  // millions suffix, turning "10,000 monthly" into ten billion, which then
  // failed the plausibility check and silently produced no salary at all.
  const numbers = [...text.matchAll(/(\d[\d,]*(?:\.\d+)?)\s*(?:([km])(?![a-z]))?/gi)]
    .map((m) => toNumber(`${m[1]}${m[2] ?? ""}`))
    .filter((n): n is number => n !== null);

  if (numbers.length === 0) return NONE;

  const perMonth = (value: number) => (YEARLY.test(text) ? Math.round(value / 12) : value);

  // "up to X" and "from X" are one-sided on purpose: asserting the other end
  // would be inventing a number the employer did not give.
  if (/\b(up to|max(imum)?|below|under)\b/i.test(text)) {
    return { min: null, max: plausible(perMonth(numbers[0])) };
  }
  if (/\b(from|starting|min(imum)?|above|over)\b/i.test(text) || /\d\s*\+/.test(text)) {
    return { min: plausible(perMonth(numbers[0])), max: null };
  }

  const values = numbers.map((n) => plausible(perMonth(n))).filter((n): n is number => n !== null);
  if (values.length === 0) return NONE;

  const min = Math.min(...values);
  const max = Math.max(...values);
  return { min, max: max === min ? min : max };
}

/** What to show when a listing has no salary string of its own but we parsed a
 *  range from somewhere else — e.g. a row typed into the admin. */
export function formatSalary({ min, max }: ParsedSalary): string | null {
  const aed = (value: number) => `AED ${value.toLocaleString("en-GB")}`;
  if (min !== null && max !== null && min !== max) return `${aed(min)} – ${aed(max)} per month`;
  if (min !== null && max !== null) return `${aed(min)} per month`;
  if (min !== null) return `From ${aed(min)} per month`;
  if (max !== null) return `Up to ${aed(max)} per month`;
  return null;
}

/**
 * How a listing describes the experience it wants.
 *
 * Zero is not "no experience required" phrased awkwardly — it is the thing a
 * great many people on this site are searching for, so it gets its own word.
 * Null returns null: a listing that did not say must not be made to look as
 * though it did.
 */
export function experienceLabel(years: number | null | undefined): string | null {
  if (years === null || years === undefined) return null;
  if (years === 0) return "Open to freshers";
  if (years === 1) return "1+ year experience";
  return `${years}+ years experience`;
}

/** A deadline, and how close it is — "in 3 days" moves people in a way that a
 *  date alone does not. Past dates return null; the query already hides them,
 *  and a listing that slipped through should not advertise that it is dead.
 *
 *  apply_by is a plain calendar date with no timezone. Letting Date localise it
 *  moved 31 December into 1 January for anyone east of UTC — a deadline shown a
 *  day late is worse than no deadline — so both the arithmetic and the
 *  formatting are pinned to UTC, and the countdown compares whole days rather
 *  than rounding up a partial one.
 */
export function deadlineLabel(
  applyBy: string | null | undefined,
  now = new Date(),
): { text: string; urgent: boolean } | null {
  if (!applyBy) return null;

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(applyBy.slice(0, 10));
  if (!match) return null;

  const [, year, month, day] = match;
  const deadline = Date.UTC(Number(year), Number(month) - 1, Number(day));
  if (Number.isNaN(deadline)) return null;

  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const days = Math.round((deadline - today) / 86_400_000);
  if (days < 0) return null;

  if (days === 0) return { text: "Closes today", urgent: true };
  if (days === 1) return { text: "Closes tomorrow", urgent: true };
  if (days <= 7) return { text: `Closes in ${days} days`, urgent: true };

  const formatted = new Date(deadline).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  return { text: `Apply by ${formatted}`, urgent: false };
}

/** "3 days ago", "today" — how fresh a listing is, which is the first thing
 *  people judge it on. */
export function postedLabel(postedAt: string, now = new Date()): string {
  const days = Math.floor((now.getTime() - new Date(postedAt).getTime()) / 86_400_000);
  if (days <= 0) return "Posted today";
  if (days === 1) return "Posted yesterday";
  if (days < 30) return `Posted ${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? "Posted last month" : `Posted ${months} months ago`;
}
