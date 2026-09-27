import Link from "next/link";
import { ArticleStrip } from "@/components/site/ArticleStrip";
import { Guilloche, Seal } from "@/components/site/Guilloche";
import { JobRow } from "@/components/site/JobRow";
import { PathPicker } from "@/components/site/PathPicker";
import { SectionHeading } from "@/components/site/SectionHeading";
import { listArticles, listJobs } from "@/lib/content/queries";
import { SECTIONS } from "@/lib/content/sections";
import { href } from "@/lib/i18n";
import { SERVICES } from "@/lib/services";
import { SITE } from "@/lib/site";

export const revalidate = 3600;

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  const [jobs, guides, posts] = await Promise.all([
    listJobs({ limit: 5 }),
    listArticles("guide", 4),
    listArticles("blog", 4),
  ]);

  return (
    <>
      {/* The hero continues the masthead's navy, so the two read as one block. */}
      <section className="relative overflow-hidden bg-ink pb-20 pt-10 sm:pb-24 sm:pt-14">
        {/* Engraved off the right edge, the way a certificate carries its
            rosette into the margin. Low enough to sit under the type. */}
        <Guilloche className="pointer-events-none absolute -right-28 -top-20 h-[26rem] w-[26rem] text-brass opacity-[0.10] sm:-right-32 sm:-top-32 sm:h-[48rem] sm:w-[48rem] sm:opacity-[0.15]" />
        <div className="relative mx-auto max-w-5xl px-5">
          <h1 className="sign max-w-[14ch] text-[2.75rem] text-paper sm:text-[4rem]">
            Start from where you are.
          </h1>
          <p className="mt-6 max-w-[58ch] text-lg leading-relaxed text-onink">
            Everyone arrives at UAE paperwork somewhere in the middle. Choose your situation and
            see the whole sequence — what happens, in what order, and which parts we handle.
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
                  <span className="sign block text-[1.0625rem] text-ink transition-colors group-hover:text-brass-deep">
                    {service.name}
                  </span>
                  <span className="mt-1.5 block text-sm leading-relaxed text-ink-faint">
                    {service.tagline}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

      </div>

      <section className="relative mt-20 overflow-hidden bg-ink py-16">
        <Seal className="pointer-events-none absolute -bottom-24 -right-20 h-72 w-72 text-brass opacity-[0.09]" />
        <div className="relative mx-auto max-w-5xl px-5">
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
                  "Government charges are itemised separately from our fee. We quote against your actual documents rather than advertising a headline price few people qualify for.",
              },
              {
                term: "Told straight",
                detail:
                  "We say what your application really needs, including when the answer is that you do not need us. A job we talk you out of costs us less than one we get wrong.",
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
          {SITE.company} is based in {SITE.area}. We tell you what an application realistically
          needs, including when the answer is that you do not need us.
        </p>
      </div>
    </>
  );
}
