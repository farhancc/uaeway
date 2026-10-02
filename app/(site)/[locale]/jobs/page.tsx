import type { Metadata } from "next";
import { JobFilters, type ActiveFilters } from "@/components/site/JobFilters";
import { JobRow } from "@/components/site/JobRow";
import { isJobSort, jobFacets, listJobs } from "@/lib/content/queries";
import { breadcrumbs, itemList, JsonLd } from "@/components/site/JsonLd";
import { href } from "@/lib/i18n";
import { absoluteUrl, pageMetadata } from "@/lib/seo";
import { SITE } from "@/lib/site";

export const revalidate = 1800;

/* The filters put the state in the query string (?emirate=dubai&sort=...), so
   without a canonical every combination is a separate indexable near-duplicate
   of this page. The canonical is deliberately the bare /jobs. */
export async function generateMetadata({
  params,
}: PageProps<"/[locale]/jobs">): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata({
    locale,
    path: "/jobs",
    title: "Jobs in the UAE — Dubai, Abu Dhabi & Sharjah Vacancies",
    description:
      "Current job openings across Dubai, Abu Dhabi and the other emirates, with the documents each role typically needs translated or attested.",
  });
}

export default async function JobsPage({ params, searchParams }: PageProps<"/[locale]/jobs">) {
  const { locale } = await params;
  const query = await searchParams;

  // Checkboxes send one value or several; a search param is a string or an
  // array of them, so both shapes have to arrive as a list.
  const many = (value: string | string[] | undefined): string[] =>
    typeof value === "string" ? [value] : (value ?? []);
  const one = (value: string | string[] | undefined): string | undefined =>
    typeof value === "string" && value.trim() ? value : undefined;

  /** A number from a search param, or undefined — never NaN, and never a
   *  negative that would invert the comparison it feeds. */
  const num = (value: string | string[] | undefined): number | undefined => {
    const parsed = Number(one(value));
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
  };

  const posted = Number(one(query.posted));
  const active: ActiveFilters = {
    q: one(query.q),
    emirates: many(query.emirate),
    categories: many(query.category),
    company: one(query.company),
    document: one(query.document),
    postedWithinDays: Number.isFinite(posted) && posted > 0 ? posted : undefined,
    salaryMin: num(query.salaryMin),
    salaryMax: num(query.salaryMax),
    hasSalary: one(query.hasSalary) === "1",
    experienceYears: num(query.experience),
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
      salaryMin: active.salaryMin,
      salaryMax: active.salaryMax,
      hasSalary: active.hasSalary,
      experienceYears: active.experienceYears,
      sort: active.sort,
    }),
    jobFacets(),
  ]);

  const filtered =
    Boolean(
      active.q ||
        active.company ||
        active.document ||
        active.postedWithinDays ||
        active.salaryMin ||
        active.salaryMax ||
        active.hasSalary,
    ) ||
    active.experienceYears !== undefined ||
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

      {/* Unfiltered only: the filtered views all canonicalise to this URL, so
          emitting a different list for each would describe this page with a
          subset of itself. Individual listings carry no JobPosting markup, by
          the same reasoning as the job page itself. */}
      {jobs.length > 0 && !filtered && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: "Jobs in the UAE",
            url: absoluteUrl(locale, "/jobs"),
            inLanguage: locale,
            isPartOf: { "@id": `${SITE.url}/#website` },
            mainEntity: itemList(
              SITE.url,
              jobs.map((job) => ({ name: job.title, path: href(locale, `/jobs/${job.slug}`) })),
            ),
          }}
        />
      )}
      <JsonLd data={breadcrumbs(SITE.url, [{ name: "Jobs", path: href(locale, "/jobs") }])} />
    </div>
  );
}
