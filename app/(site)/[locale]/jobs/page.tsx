import type { Metadata } from "next";
import { JobFilters, type ActiveFilters } from "@/components/site/JobFilters";
import { JobRow } from "@/components/site/JobRow";
import { isJobSort, jobFacets, listJobs } from "@/lib/content/queries";

export const revalidate = 1800;

export const metadata: Metadata = {
  title: "Jobs in the UAE",
  description:
    "Current job openings across Dubai, Abu Dhabi and the other emirates, with the documents each role typically needs translated or attested.",
};

export default async function JobsPage({ params, searchParams }: PageProps<"/[locale]/jobs">) {
  const { locale } = await params;
  const query = await searchParams;

  // Checkboxes send one value or several; a search param is a string or an
  // array of them, so both shapes have to arrive as a list.
  const many = (value: string | string[] | undefined): string[] =>
    typeof value === "string" ? [value] : (value ?? []);
  const one = (value: string | string[] | undefined): string | undefined =>
    typeof value === "string" && value.trim() ? value : undefined;

  const posted = Number(one(query.posted));
  const active: ActiveFilters = {
    q: one(query.q),
    emirates: many(query.emirate),
    categories: many(query.category),
    company: one(query.company),
    document: one(query.document),
    postedWithinDays: Number.isFinite(posted) && posted > 0 ? posted : undefined,
    sort: isJobSort(query.sort) ? query.sort : "newest",
  };

  const [jobs, facets] = await Promise.all([
    listJobs({
      q: active.q,
      emirates: active.emirates,
      categories: active.categories,
      company: active.company,
      document: active.document,
      postedWithinDays: active.postedWithinDays,
      sort: active.sort,
    }),
    jobFacets(),
  ]);

  const filtered =
    Boolean(active.q || active.company || active.document || active.postedWithinDays) ||
    active.emirates.length > 0 ||
    active.categories.length > 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="sign text-3xl tracking-tight text-ink">Jobs in the UAE</h1>
      <p className="mt-3 max-w-[62ch] leading-relaxed text-ink-soft">
        Openings summarised from public listings. Each one links to the original posting — apply
        there, not here.
      </p>

      <JobFilters facets={facets} active={active} locale={locale} resultCount={jobs.length} />

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
            {filtered
              ? "Nothing matches those filters yet. Try widening or clearing them."
              : "No openings published yet. Listings appear here once they have been reviewed."}
          </p>
        )}
      </div>
    </div>
  );
}
