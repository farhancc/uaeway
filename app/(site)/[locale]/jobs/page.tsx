import type { Metadata } from "next";
import Link from "next/link";
import { JobRow } from "@/components/site/JobRow";
import { jobFacets, listJobs } from "@/lib/content/queries";
import { href } from "@/lib/i18n";

export const revalidate = 1800;

export const metadata: Metadata = {
  title: "Jobs in the UAE",
  description:
    "Current job openings across Dubai, Abu Dhabi and the other emirates, with the documents each role typically needs translated or attested.",
};

export default async function JobsPage({ params, searchParams }: PageProps<"/[locale]/jobs">) {
  const { locale } = await params;
  const query = await searchParams;

  const emirate = typeof query.emirate === "string" ? query.emirate : undefined;
  const category = typeof query.category === "string" ? query.category : undefined;
  const q = typeof query.q === "string" ? query.q : undefined;

  const [jobs, facets] = await Promise.all([
    listJobs({ emirate, category, q }),
    jobFacets(),
  ]);

  const active = Boolean(emirate || category || q);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="sign text-3xl tracking-tight text-ink">Jobs in the UAE</h1>
      <p className="mt-3 max-w-[62ch] leading-relaxed text-ink-soft">
        Openings summarised from public listings. Each one links to the original posting — apply
        there, not here.
      </p>

      {/* A plain GET form: filtering works without JavaScript, and every filtered
          view is a real URL that can be shared and indexed. */}
      <form method="get" className="mt-8 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="q" className="block text-xs text-ink-faint">
            Search
          </label>
          <input
            id="q"
            name="q"
            defaultValue={q}
            placeholder="Job title or skill"
            className="mt-1 rounded-md border border-rule bg-field px-3 py-2 text-sm text-ink"
          />
        </div>

        {facets.emirates.length > 0 && (
          <div>
            <label htmlFor="emirate" className="block text-xs text-ink-faint">
              Emirate
            </label>
            <select
              id="emirate"
              name="emirate"
              defaultValue={emirate ?? ""}
              className="mt-1 rounded-md border border-rule bg-field px-3 py-2 text-sm text-ink"
            >
              <option value="">All</option>
              {facets.emirates.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
          </div>
        )}

        {facets.categories.length > 0 && (
          <div>
            <label htmlFor="category" className="block text-xs text-ink-faint">
              Category
            </label>
            <select
              id="category"
              name="category"
              defaultValue={category ?? ""}
              className="mt-1 rounded-md border border-rule bg-field px-3 py-2 text-sm text-ink"
            >
              <option value="">All</option>
              {facets.categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        )}

        <button
          type="submit"
          className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper hover:opacity-90"
        >
          Filter
        </button>

        {active && (
          <Link href={href(locale, "/jobs")} className="py-2 text-sm text-go hover:underline">
            Clear
          </Link>
        )}
      </form>

      <div className="mt-8">
        {jobs.length > 0 ? (
          <>
            <p className="pb-2 text-sm text-ink-faint">
              {jobs.length} {jobs.length === 1 ? "opening" : "openings"}
            </p>
            {jobs.map((job) => (
              <JobRow key={job.slug} job={job} locale={locale} />
            ))}
          </>
        ) : (
          <p className="max-w-xl rounded-md border border-rule bg-field px-4 py-5 text-sm leading-relaxed text-ink-soft">
            {active
              ? "Nothing matches those filters yet. Try clearing them."
              : "No openings published yet. Listings appear here once they have been reviewed."}
          </p>
        )}
      </div>
    </div>
  );
}
