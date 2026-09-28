import Link from "next/link";
import { AutoSubmit } from "./AutoSubmit";
import { href } from "@/lib/i18n";
import type { JobFacets, JobSort } from "@/lib/content/queries";

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

/** Values that mean "not filtered", so they never reach the URL. */
const FILTER_DEFAULTS = { sort: "newest" };

const SORT_LABELS: Record<JobSort, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
  title: "Title A–Z",
};

/**
 * The filter panel.
 *
 * Still a plain GET form with no JavaScript: every combination is a real URL
 * that can be shared, bookmarked and indexed, and it works before React loads.
 * Emirates and categories are checkboxes rather than selects because "Dubai or
 * Sharjah" is a normal thing to want and a single select cannot say it.
 *
 * `details` keeps the advanced half out of the way until it is wanted, and is
 * forced open when a filter inside it is already set — a filter you cannot see
 * is worse than no filter at all.
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
  resultCount: number;
}) {
  const advancedInUse = Boolean(
    active.company ||
      active.document ||
      active.postedWithinDays ||
      active.salaryMin ||
      active.salaryMax ||
      active.hasSalary ||
      active.experienceYears !== undefined,
  );
  const anyInUse =
    advancedInUse ||
    Boolean(active.q) ||
    active.emirates.length > 0 ||
    active.categories.length > 0 ||
    active.sort !== "newest";

  return (
    <form method="get" className="mt-8 rounded-md border border-rule bg-field p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[14rem] flex-1">
          <label htmlFor="q" className="block text-xs text-ink-faint">
            Search
          </label>
          <input
            id="q"
            name="q"
            defaultValue={active.q}
            placeholder="Job title, skill or employer"
            className="mt-1 w-full rounded-md border border-rule bg-paper px-3 py-2 text-sm text-ink"
          />
        </div>

        <div>
          <label htmlFor="sort" className="block text-xs text-ink-faint">
            Sort
          </label>
          <select
            id="sort"
            name="sort"
            defaultValue={active.sort}
            className="mt-1 rounded-md border border-rule bg-paper px-3 py-2 text-sm text-ink"
          >
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
          className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper hover:opacity-90"
        >
          Filter
        </button>
        <AutoSubmit buttonId="job-filter-submit" defaults={FILTER_DEFAULTS} />

        {anyInUse && (
          <Link href={href(locale, "/jobs")} className="py-2 text-sm text-go hover:underline">
            Clear all
          </Link>
        )}
      </div>

      {(facets.emirates.length > 0 || facets.categories.length > 0) && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {facets.emirates.length > 0 && (
            <fieldset>
              <legend className="text-xs text-ink-faint">Emirate</legend>
              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1.5">
                {facets.emirates.map((emirate) => (
                  <label key={emirate} className="flex items-center gap-1.5 text-sm text-ink-soft">
                    <input
                      type="checkbox"
                      name="emirate"
                      value={emirate}
                      defaultChecked={active.emirates.includes(emirate)}
                    />
                    {emirate}
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {facets.categories.length > 0 && (
            <fieldset>
              <legend className="text-xs text-ink-faint">Field</legend>
              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1.5">
                {facets.categories.map((category) => (
                  <label key={category} className="flex items-center gap-1.5 text-sm text-ink-soft">
                    <input
                      type="checkbox"
                      name="category"
                      value={category}
                      defaultChecked={active.categories.includes(category)}
                    />
                    {category}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
        </div>
      )}

      <details open={advancedInUse} className="mt-4 border-t border-rule pt-3">
        <summary className="cursor-pointer text-sm text-ink-soft">More filters</summary>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <fieldset>
            <legend className="text-xs text-ink-faint">Salary, AED per month</legend>
            <div className="mt-1 flex items-center gap-2">
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
                className="w-full rounded-md border border-rule bg-paper px-3 py-2 text-sm text-ink"
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
                className="w-full rounded-md border border-rule bg-paper px-3 py-2 text-sm text-ink"
              />
            </div>
            {/* Most listings never state pay, so a range filter would silently
                hide the majority. This makes that choice the visitor's. */}
            <label className="mt-1.5 flex items-center gap-1.5 text-xs text-ink-soft">
              <input type="checkbox" name="hasSalary" value="1" defaultChecked={active.hasSalary} />
              Only listings that state a salary
            </label>
          </fieldset>

          <div>
            <label htmlFor="experience" className="block text-xs text-ink-faint">
              Experience you have
            </label>
            <select
              id="experience"
              name="experience"
              defaultValue={active.experienceYears === undefined ? "" : String(active.experienceYears)}
              className="mt-1 w-full rounded-md border border-rule bg-paper px-3 py-2 text-sm text-ink"
            >
              <option value="">Any</option>
              {EXPERIENCE.map((option) => (
                <option key={option.years} value={option.years}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs leading-relaxed text-ink-faint">
              Shows roles asking for no more than this, plus those that do not say.
            </p>
          </div>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {facets.companies.length > 0 && (
            <div>
              <label htmlFor="company" className="block text-xs text-ink-faint">
                Employer
              </label>
              <select
                id="company"
                name="company"
                defaultValue={active.company ?? ""}
                className="mt-1 w-full rounded-md border border-rule bg-paper px-3 py-2 text-sm text-ink"
              >
                <option value="">Any</option>
                {facets.companies.map((company) => (
                  <option key={company} value={company}>
                    {company}
                  </option>
                ))}
              </select>
            </div>
          )}

          {facets.documents.length > 0 && (
            <div>
              <label htmlFor="document" className="block text-xs text-ink-faint">
                Needs this document
              </label>
              <select
                id="document"
                name="document"
                defaultValue={active.document ?? ""}
                className="mt-1 w-full rounded-md border border-rule bg-paper px-3 py-2 text-sm text-ink"
              >
                <option value="">Any</option>
                {facets.documents.map((doc) => (
                  <option key={doc} value={doc}>
                    {doc}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label htmlFor="posted" className="block text-xs text-ink-faint">
              Posted
            </label>
            <select
              id="posted"
              name="posted"
              defaultValue={active.postedWithinDays ? String(active.postedWithinDays) : ""}
              className="mt-1 w-full rounded-md border border-rule bg-paper px-3 py-2 text-sm text-ink"
            >
              <option value="">Any time</option>
              {WINDOWS.map((window) => (
                <option key={window.days} value={window.days}>
                  {window.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </details>

      {anyInUse && (
        <p className="mt-3 border-t border-rule pt-3 text-xs text-ink-faint">
          {resultCount} {resultCount === 1 ? "opening matches" : "openings match"} these filters.
        </p>
      )}
    </form>
  );
}
