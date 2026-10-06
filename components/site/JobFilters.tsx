import Link from "next/link";
import { AutoSubmit } from "./AutoSubmit";
import { href } from "@/lib/i18n";
import type { Facet, JobFacets, JobSort } from "@/lib/content/queries";

export interface ActiveFilters {
  q?: string;
  emirates: string[];
  categories: string[];
  company?: string;
  document?: string;
  postedWithinDays?: number;
  /** Monthly AED. */
  salaryMin?: number;
  salaryMax?: number;
  hasSalary: boolean;
  /** Years the candidate has, not years the job wants. */
  experienceYears?: number;
  sort: JobSort;
}

const EXPERIENCE = [
  { years: 0, label: "No experience (fresher)" },
  { years: 1, label: "1 year" },
  { years: 2, label: "2 years" },
  { years: 3, label: "3 years" },
  { years: 5, label: "5 years" },
  { years: 10, label: "10+ years" },
];

const WINDOWS = [
  { days: 1, label: "Last 24 hours" },
  { days: 7, label: "Last week" },
  { days: 30, label: "Last month" },
];

/** Papers held by fewer listings than this go in the select rather than on a
 *  chip: a row of twenty-eight chips, twenty of them holding one listing each,
 *  is a wall rather than a shortcut. */
const CHIP_MIN_COUNT = 3;
/** Four, not six. The fifth and sixth papers are "Professional accounting
 *  certification" and "Educational certificates" — long labels holding nine
 *  and eight listings, which on a phone wrapped the row to three lines and
 *  pushed the first job below the fold. They stay reachable in the select. */
const MAX_DOCUMENT_CHIPS = 4;

/** Values that mean "not filtered", so they never reach the URL. */
const FILTER_DEFAULTS = { sort: "newest", document: "" };

const SORT_LABELS: Record<JobSort, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
  title: "Title A–Z",
};

const field =
  "w-full rounded-md border border-rule bg-field px-3 py-2 text-sm text-ink placeholder:text-ink-faint";
const legend = "text-[0.8125rem] font-semibold text-ink";

/** A checkbox or radio wearing a chip. The input stays real, so the form keeps
 *  working with no JavaScript and a screen reader still hears a checkbox. */
function Chip({
  name,
  value,
  count,
  label,
  checked,
  type = "checkbox",
  dark = false,
}: {
  name: string;
  value: string;
  count?: number;
  label: string;
  checked: boolean;
  type?: "checkbox" | "radio";
  dark?: boolean;
}) {
  return (
    <label>
      <input
        type={type}
        name={name}
        value={value}
        defaultChecked={checked}
        className="sr-only"
      />
      <span className={dark ? "chip chip-dark" : "chip"}>
        {label}
        {count !== undefined && <span className="chip-count">{count}</span>}
      </span>
    </label>
  );
}

/**
 * The filter panel, as the board at the top of an arrivals hall.
 *
 * Still a plain GET form with no JavaScript: every combination is a real URL
 * that can be shared, bookmarked and indexed, and it works before React loads.
 *
 * What changed is honesty. Every option now carries the number of listings
 * behind it, because on a board this size most of them are nearly empty — one
 * emirate holds 164 listings and four hold none, half of everything is filed
 * under "Other", and seventeen of 258 state a salary. A filter that does not
 * say so is a guess, and the visitor finds out by landing on an empty page.
 * For the same reason a window with nothing in it is not offered at all:
 * "Last 24 hours" returned nothing every time it was shown.
 *
 * The papers come first among the narrowing filters, promoted out of the
 * advanced panel they used to sit in. They are the filter only this site can
 * offer — the one that turns "a job I want" into "the paperwork I will need" —
 * and the chips are the same shape as the tags on the listings themselves.
 */
export function JobFilters({
  facets,
  active,
  locale,
  resultCount,
}: {
  facets: JobFacets;
  active: ActiveFilters;
  locale: string;
  /** Matching the current filters, in total — not the number on this page. */
  resultCount: number;
}) {
  const advancedInUse = Boolean(
    active.company ||
      active.categories.length > 0 ||
      active.postedWithinDays ||
      active.salaryMin ||
      active.salaryMax ||
      active.hasSalary ||
      active.experienceYears !== undefined,
  );
  const anyInUse =
    advancedInUse ||
    Boolean(active.q) ||
    Boolean(active.document) ||
    active.emirates.length > 0 ||
    active.sort !== "newest";

  const paperChips = facets.documents
    .filter((doc) => doc.count >= CHIP_MIN_COUNT)
    .slice(0, MAX_DOCUMENT_CHIPS);
  const paperRest = facets.documents.filter((doc) => !paperChips.includes(doc));
  const windows = WINDOWS.filter((w) => (facets.postedWithin[w.days] ?? 0) > 0);

  return (
    <form method="get" className="mt-8">
      {/* The board's own state: how many, and where they are. The emirate is
          the filter nearly everyone reaches for first, so it lives here rather
          than in a list below — and the counts make the shape of the board
          plain before anyone has clicked anything. */}
      <div className="panel panel-tight">
        <p className="flex flex-wrap items-baseline gap-x-3">
          <span className="sign text-[1.0625rem] text-white">On the board now</span>
          <span className="ml-auto text-[0.9375rem] font-semibold tabular-nums text-glow">
            {facets.total} {facets.total === 1 ? "opening" : "openings"}
          </span>
        </p>

        {facets.emirates.length > 0 && (
          <fieldset className="mt-3">
            <legend className="sr-only">Emirate</legend>
            <div className="flex flex-wrap gap-2">
              {facets.emirates.map((emirate: Facet) => (
                <Chip
                  key={emirate.value}
                  name="emirate"
                  value={emirate.value}
                  count={emirate.count}
                  label={emirate.value}
                  checked={active.emirates.includes(emirate.value)}
                  dark
                />
              ))}
            </div>
          </fieldset>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="min-w-[14rem] flex-1">
          <label htmlFor="q" className="block text-xs text-ink-faint">
            Search
          </label>
          <input
            id="q"
            name="q"
            defaultValue={active.q}
            placeholder="Job title, skill or employer"
            className={`mt-1 ${field}`}
          />
        </div>

        <div>
          <label htmlFor="sort" className="block text-xs text-ink-faint">
            Sort
          </label>
          <select id="sort" name="sort" defaultValue={active.sort} className={`mt-1 ${field}`}>
            {(Object.keys(SORT_LABELS) as JobSort[]).map((key) => (
              <option key={key} value={key}>
                {SORT_LABELS[key]}
              </option>
            ))}
          </select>
        </div>

        {/* Hidden by AutoSubmit once its script runs, so filtering still has
            a button for anyone without JavaScript. */}
        <button
          id="job-filter-submit"
          type="submit"
          className="rounded-md bg-sign px-4 py-2 text-sm font-semibold text-white hover:bg-sign-deep"
        >
          Filter
        </button>
        <AutoSubmit buttonId="job-filter-submit" defaults={FILTER_DEFAULTS} />
      </div>

      {facets.documents.length > 0 && (
        <fieldset className="mt-5">
          <legend className={legend}>Papers the job asks for</legend>
          <p className="mt-0.5 text-xs text-ink-faint">
            Pick one to see the roles that want it — and what it takes to get it attested.
          </p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            <Chip
              name="document"
              value=""
              label="Any paper"
              checked={!active.document}
              type="radio"
            />
            {paperChips.map((doc) => (
              <Chip
                key={doc.value}
                name="document"
                value={doc.value}
                count={doc.count}
                label={doc.value}
                checked={active.document === doc.value}
                type="radio"
              />
            ))}
          </div>
        </fieldset>
      )}

      <details open={advancedInUse} className="mt-5 border-t border-rule pt-3">
        <summary className="cursor-pointer text-sm font-medium text-ink-soft">
          More ways to narrow
        </summary>

        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          {facets.categories.length > 0 && (
            <fieldset className="sm:col-span-2">
              <legend className={legend}>Field</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {facets.categories.map((category: Facet) => (
                  <Chip
                    key={category.value}
                    name="category"
                    value={category.value}
                    count={category.count}
                    label={category.value}
                    checked={active.categories.includes(category.value)}
                  />
                ))}
              </div>
            </fieldset>
          )}

          <fieldset>
            <legend className={legend}>Salary, AED per month</legend>
            <div className="mt-2 flex items-center gap-2">
              <label htmlFor="salaryMin" className="sr-only">
                Minimum monthly salary in AED
              </label>
              <input
                id="salaryMin"
                name="salaryMin"
                type="number"
                min={0}
                step={500}
                inputMode="numeric"
                placeholder="From"
                defaultValue={active.salaryMin ?? ""}
                className={field}
              />
              <span aria-hidden="true" className="text-ink-faint">
                –
              </span>
              <label htmlFor="salaryMax" className="sr-only">
                Maximum monthly salary in AED
              </label>
              <input
                id="salaryMax"
                name="salaryMax"
                type="number"
                min={0}
                step={500}
                inputMode="numeric"
                placeholder="To"
                defaultValue={active.salaryMax ?? ""}
                className={field}
              />
            </div>
            {/* The number is the warning. Most employers here never publish
                pay, so any salary filter hides most of the board — and saying
                so is the difference between a filter and a dead end. */}
            <label className="mt-2 flex items-center gap-2 text-xs text-ink-soft">
              <input type="checkbox" name="hasSalary" value="1" defaultChecked={active.hasSalary} />
              Only the {facets.withSalary} listings that state a salary
            </label>
          </fieldset>

          <div>
            <label htmlFor="experience" className={`block ${legend}`}>
              Experience you have
            </label>
            <select
              id="experience"
              name="experience"
              defaultValue={active.experienceYears === undefined ? "" : String(active.experienceYears)}
              className={`mt-2 ${field}`}
            >
              <option value="">Any</option>
              {EXPERIENCE.map((option) => (
                <option key={option.years} value={option.years}>
                  {option.label}
                  {option.years === 0 ? ` — ${facets.freshers} listings` : ""}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs leading-relaxed text-ink-faint">
              Shows roles asking for no more than this, plus those that do not say.
            </p>
          </div>

          {paperRest.length > 0 && (
            <div>
              <label htmlFor="document" className={`block ${legend}`}>
                Another paper
              </label>
              <select
                id="document"
                name="document"
                defaultValue={
                  active.document && !paperChips.some((d) => d.value === active.document)
                    ? active.document
                    : ""
                }
                className={`mt-2 ${field}`}
              >
                <option value="">Any</option>
                {paperRest.map((doc) => (
                  <option key={doc.value} value={doc.value}>
                    {doc.value} — {doc.count}
                  </option>
                ))}
              </select>
            </div>
          )}

          {facets.companies.length > 0 && (
            <div>
              <label htmlFor="company" className={`block ${legend}`}>
                Employer
              </label>
              <select
                id="company"
                name="company"
                defaultValue={active.company ?? ""}
                className={`mt-2 ${field}`}
              >
                <option value="">Any</option>
                {facets.companies.map((company: Facet) => (
                  <option key={company.value} value={company.value}>
                    {company.value} — {company.count}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* A window with nothing in it is not offered: "Last 24 hours" was
              shown every day and returned nothing on most of them. */}
          {windows.length > 0 && (
            <div>
              <label htmlFor="posted" className={`block ${legend}`}>
                Posted
              </label>
              <select
                id="posted"
                name="posted"
                defaultValue={active.postedWithinDays ? String(active.postedWithinDays) : ""}
                className={`mt-2 ${field}`}
              >
                <option value="">Any time</option>
                {windows.map((window) => (
                  <option key={window.days} value={window.days}>
                    {window.label} — {facets.postedWithin[window.days]}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </details>

      {anyInUse && (
        <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-rule pt-3 text-sm">
          <span className="font-semibold tabular-nums text-ink">
            {resultCount} of {facets.total}
          </span>
          <span className="text-ink-soft">
            {resultCount === 1 ? "listing matches" : "listings match"} these filters
          </span>
          <Link
            href={href(locale, "/jobs")}
            className="ml-auto font-medium text-sign underline underline-offset-4 hover:text-sign-deep"
          >
            Clear filters
          </Link>
        </p>
      )}
    </form>
  );
}
