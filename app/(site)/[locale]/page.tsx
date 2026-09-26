import Link from "next/link";
import { ArticleStrip } from "@/components/site/ArticleStrip";
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
    <div className="mx-auto max-w-5xl px-4">
      <section className="pt-12 sm:pt-16">
        <h1 className="sign max-w-[16ch] text-[2.5rem] text-ink sm:text-[3.5rem]">
          Start from where you are.
        </h1>
        <p className="mt-4 max-w-[62ch] text-lg leading-relaxed text-ink-soft">
          Everyone arrives at UAE paperwork in the middle of it. Pick your situation and see the
          whole sequence — what has to happen, in what order, and which parts we handle.
        </p>

        <div className="mt-8">
          <PathPicker locale={locale} />
        </div>
      </section>

      <section className="pt-16">
        <SectionHeading arabic="خدماتنا">What we do</SectionHeading>

        {/* A form grid: each service is a boxed cell, divided by rules rather
            than floated as a card. */}
        <ul className="mt-6 grid border-l border-t border-rule sm:grid-cols-2">
          {SERVICES.map((service) => (
            <li key={service.slug} className="border-b border-r border-rule bg-field">
              <Link
                href={href(locale, `/services/${service.slug}`)}
                className="flex h-full flex-col gap-1 px-4 py-4 transition-colors hover:bg-paper"
              >
                <span className="sign text-[0.9375rem] text-ink">{service.name}</span>
                <span className="text-sm leading-relaxed text-ink-soft">{service.tagline}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="pt-16">
        <SectionHeading
          arabic="وظائف شاغرة"
          action={
            <Link href={href(locale, "/jobs")} className="text-go underline underline-offset-2">
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
          <p className="field mt-6 max-w-[62ch] px-4 py-5 text-sm leading-relaxed text-ink-soft">
            No openings published yet. Listings appear here once a person has checked them.
          </p>
        )}
      </section>

      <ArticleStrip section={SECTIONS.guide} articles={guides} locale={locale} />
      <ArticleStrip section={SECTIONS.blog} articles={posts} locale={locale} />

      <p className="max-w-[62ch] pt-16 text-sm leading-relaxed text-ink-faint">
        {SITE.company} is based in {SITE.area}. We tell you what an application realistically
        needs, including when the answer is that you do not need us.
      </p>
    </div>
  );
}
