import type { Metadata } from "next";
import Link from "next/link";
import { ArticleStrip } from "@/components/site/ArticleStrip";
import { JobRow } from "@/components/site/JobRow";
import { PathPicker } from "@/components/site/PathPicker";
import { SectionHeading } from "@/components/site/SectionHeading";
import { listArticles, listJobs } from "@/lib/content/queries";
import { SECTIONS } from "@/lib/content/sections";
import { href } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";
import { SERVICES } from "@/lib/services";
import { SITE } from "@/lib/site";

export const revalidate = 3600;

/* The home page previously exported no metadata at all, so it inherited the
   layout default and shipped with no canonical — the one page most likely to
   be linked to with tracking parameters on the end. */
export async function generateMetadata({
  params,
}: PageProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata({
    locale,
    path: "/",
    // Absolute so the home page is not titled "... | UAEvia" by the layout's
    // own template, which would repeat the brand twice.
    title: { absolute: `UAE Jobs, Attestation & Visa Help — ${SITE.name}` },
    description: SITE.description,
    openGraph: { type: "website" },
  });
}

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  const [jobs, guides, posts] = await Promise.all([
    listJobs({ limit: 5 }),
    listArticles("guide", 4),
    listArticles("blog", 4),
  ]);

  return (
    <>
      {/* The hero continues the masthead's dark, so the two read as one block
          and the route can start high on the page. */}
      <section className="bg-ink pb-20 pt-12 sm:pb-24 sm:pt-16">
        <div className="mx-auto max-w-5xl px-5">
          <h1 className="sign max-w-[15ch] text-[2.75rem] text-paper sm:text-[4.25rem]">
            Your way through the UAE.
          </h1>
          <p className="mt-6 max-w-[58ch] text-lg leading-relaxed text-onink">
            Nobody arrives at UAE paperwork at the beginning. Pick where you actually are and see
            the whole route — what happens, in what order, and which parts we can take off you.
          </p>

          <div className="mt-12">
            <PathPicker locale={locale} />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-5">
        <section className="pt-20">
          <SectionHeading arabic="خدماتنا">What we do</SectionHeading>

          {/* A list separated by hairlines, not a grid of boxes. */}
          <ul className="mt-2 sm:grid sm:grid-cols-2 sm:gap-x-12">
            {SERVICES.map((service) => (
              <li key={service.slug} className="border-b border-rule">
                <Link
                  href={href(locale, `/services/${service.slug}`)}
                  className="group block py-5"
                >
                  <span className="sign block text-[1.0625rem] text-ink transition-colors group-hover:text-sign-deep">
                    {service.name}
                  </span>
                  <span className="mt-1.5 block text-sm leading-relaxed text-ink-faint">
                    {service.tagline}
                  </span>
                  {/* Who actually delivers it, on the list rather than only on
                      the service page — it changes whether this is a thing we
                      do or a thing we arrange. */}
                  <span className="mt-2 flex items-center gap-2 text-xs text-ink-faint">
                    <span
                      aria-hidden="true"
                      className={
                        service.delivery === "in-house"
                          ? "inline-block h-2 w-2 shrink-0 rounded-full bg-sign-deep"
                          : "inline-block h-2 w-2 shrink-0 rounded-full border-[1.5px] border-ink-faint"
                      }
                    />
                    {service.delivery === "in-house"
                      ? "We do this ourselves"
                      : "We connect you with a licensed provider"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

      </div>

      <section className="mt-20 bg-ink py-16">
        <div className="mx-auto max-w-5xl px-5">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-brass/40 pb-3">
            <h2 className="sign text-[1.75rem] text-paper">How we work</h2>
            <span className="arabic text-base text-onink/70" aria-hidden="true">
              كيف نعمل
            </span>
          </div>

          <dl className="mt-10 grid gap-10 sm:grid-cols-3 sm:gap-8">
            {[
              {
                term: "Quoted per case",
                detail:
                  "Where a provider does the work you see their charge and the government charge separately, against your actual documents — not a headline price few people qualify for.",
              },
              {
                term: "Told straight",
                detail:
                  "We say what your application really needs, including when the answer is that you do not need anyone. Talking you out of something costs us less than pointing you at the wrong thing.",
              },
              {
                term: "Nothing invented",
                detail:
                  "Fees and rules here change. If we have not confirmed a figure, we will not repeat it — we will check it and come back to you.",
              },
            ].map((item) => (
              <div key={item.term}>
                <span aria-hidden="true" className="block h-px w-10 bg-brass" />
                <dt className="sign mt-4 text-[1.0625rem] text-paper">{item.term}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-onink">{item.detail}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-5">
        <section className="pt-20">
          <SectionHeading
            arabic="وظائف شاغرة"
            action={
              <Link
                href={href(locale, "/jobs")}
                className="text-brass-deep underline underline-offset-4"
              >
                All jobs
              </Link>
            }
          >
            Latest openings
          </SectionHeading>

          {jobs.length > 0 ? (
            <div className="mt-2">
              {jobs.map((job) => (
                <JobRow key={job.slug} job={job} locale={locale} />
              ))}
            </div>
          ) : (
            <p className="mt-8 max-w-[58ch] leading-relaxed text-ink-faint">
              No openings published yet. Listings appear here once a person has checked them.
            </p>
          )}
        </section>

        <ArticleStrip section={SECTIONS.guide} articles={guides} locale={locale} />
        <ArticleStrip section={SECTIONS.blog} articles={posts} locale={locale} />

        <p className="max-w-[58ch] pt-20 leading-relaxed text-ink-faint">
          {SITE.name} is based in {SITE.area}. We tell you what an application realistically
          needs, and which providers actually do that work — including when the answer is that you
          do not need anyone.
        </p>
      </div>
    </>
  );
}
