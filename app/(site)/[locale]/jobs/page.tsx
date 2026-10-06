import type { Metadata } from "next";
import Link from "next/link";
import { PageHead } from "@/components/site/PageHead";
import { JobFilters, type ActiveFilters } from "@/components/site/JobFilters";
import { JobRow } from "@/components/site/JobRow";
import { isJobSort, jobFacets, searchJobs } from "@/lib/content/queries";
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

  /**
   * How many listings this page shows.
   *
   * The page used to take the query's first forty and print "40 openings",
   * which was wrong twice: there are 258 live, and the other 218 had no route
   * to them at all — no pagination, no "show more", nothing but a filter that
   * happened to cut the board small enough. `show` grows in pages of forty
   * through an ordinary link, so it needs no JavaScript and every length is a
   * real URL.
   */
  const PAGE = 40;
  const requested = num(query.show) ?? PAGE;
  const show = Math.min(Math.max(requested, PAGE), 400);

  const [{ rows: jobs, total }, facets] = await Promise.all([
    searchJobs({
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
      limit: show,
    }),
    jobFacets(),
  ]);

  /** The same search, one page longer. Built from what is already in the URL
   *  so every other filter survives the click. */
  const showMore = () => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (key === "show") continue;
      for (const item of ([] as string[]).concat(value ?? [])) {
        if (item) params.append(key, item);
      }
    }
    params.set("show", String(show + PAGE));
    return `${href(locale, "/jobs")}?${params.toString()}`;
  };

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
      <PageHead title="Jobs in the UAE" arabic="الوظائف في الإمارات">
        Openings summarised from public listings. Open one to see what the employer asks for and
        the link to apply — applications go to them, never through us, and never for a fee.
      </PageHead>

      <JobFilters facets={facets} active={active} locale={locale} resultCount={total} />

      <div className="mt-8">
        {jobs.length > 0 ? (
          <>
            {/* Both numbers, always. "Showing 40 of 258" is the sentence the
                old page could not say, and the one that tells someone whether
                what they are looking at is the board or a corner of it. */}
            <p className="border-b border-rule pb-2 text-sm text-ink-soft">
              <span className="font-semibold tabular-nums text-ink">
                Showing {jobs.length} of {total}
              </span>{" "}
              {total === 1 ? "listing" : "listings"}
              {filtered ? " matching your filters" : ""}
            </p>

            {jobs.map((job) => (
              <JobRow key={job.slug} job={job} locale={locale} />
            ))}

            {jobs.length < total && (
              <p className="mt-8">
                <Link
                  href={showMore()}
                  className="inline-flex items-center gap-2.5 rounded-md border border-sign px-5 py-2.5 text-sm font-semibold text-sign transition-colors hover:bg-sign hover:text-white"
                >
                  Show {Math.min(PAGE, total - jobs.length)} more
                  <span aria-hidden="true" className="chev chev-down" />
                </Link>
              </p>
            )}
          </>
        ) : (
          /* An empty result is a dead end unless it says which filter to let
             go of. The narrowest one is almost always the culprit, so it is
             named rather than left to be guessed at. */
          <div className="field max-w-xl px-5 py-5">
            <p className="text-sm leading-relaxed text-ink-soft">
              {filtered
                ? `No listing matches all of those at once, though ${facets.total} are on the board.`
                : "No openings published yet. Listings appear here once they have been reviewed."}
            </p>
            {filtered && (
              <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                {active.document && (
                  <Link
                    href={`${href(locale, "/jobs")}${active.emirates.length === 1 ? `?emirate=${encodeURIComponent(active.emirates[0])}` : ""}`}
                    className="font-medium text-sign underline underline-offset-4"
                  >
                    Drop the paper filter
                  </Link>
                )}
                {active.emirates.length > 0 && (
                  <Link
                    href={href(locale, "/jobs")}
                    className="font-medium text-sign underline underline-offset-4"
                  >
                    Look across every emirate
                  </Link>
                )}
                <Link
                  href={href(locale, "/jobs")}
                  className="font-medium text-sign underline underline-offset-4"
                >
                  Start again with all {facets.total}
                </Link>
              </p>
            )}
          </div>
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
