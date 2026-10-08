import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { breadcrumbs, JsonLd } from "@/components/site/JsonLd";
import { JobRow } from "@/components/site/JobRow";
import { SectionHeading } from "@/components/site/SectionHeading";
import { ServiceCTA } from "@/components/site/ServiceCTA";
import { listJobs } from "@/lib/content/queries";
import { href, LOCALES } from "@/lib/i18n";
import {
  AUDIENCES,
  getAudience,
  pathFor,
  servicesFor,
  stepsFor,
  type Audience,
} from "@/lib/audiences";
import { absoluteUrl, metaDescription, pageMetadata } from "@/lib/seo";
import { getService } from "@/lib/services";
import { SITE } from "@/lib/site";

/**
 * One page per kind of person.
 *
 * The site's premise is that nobody arrives at the beginning. These pages are
 * the other half of that: nobody arrives as a general case either. Somebody
 * who knows they are a teacher does not know they need attestation, and no
 * amount of good writing on the attestation page reaches them.
 *
 * The shape is deliberately the same as a service page — breadcrumb, Arabic
 * above the heading, who it is for, a numbered sequence, then what we can do —
 * because a reader who lands on both should not have to learn two layouts.
 * What is different is the authorities block, which is the thing this page
 * exists to deliver.
 *
 * Revalidated rather than static because the jobs section reads the live
 * board, on the same hour the rest of the site uses.
 */
export const revalidate = 3600;

export function generateStaticParams() {
  return LOCALES.flatMap((locale) => AUDIENCES.map((a) => ({ locale, slug: a.slug })));
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/for/[slug]">): Promise<Metadata> {
  const { slug, locale } = await params;
  const audience = getAudience(slug);
  if (!audience) return { title: "Not found" };

  return pageMetadata({
    locale,
    path: `/for/${audience.slug}`,
    // "Teachers in the UAE", "Leaving the UAE" — several titles already carry
    // the country, and appending it unconditionally produced "Leaving the UAE
    // in the UAE", the same way the service titles once did.
    title: /\buae\b/i.test(audience.title) ? audience.title : `${audience.title} — UAE`,
    description: metaDescription(audience.intro),
    openGraph: { type: "article" },
  });
}

/** Jobs are shown only where listings are the point. A page about leaving the
 *  country with four vacancies under it is noise. */
async function jobsFor(audience: Audience) {
  if (audience.jobQuery === null) return [];
  return listJobs({ q: audience.jobQuery || undefined, limit: 4 });
}

export default async function AudiencePage({ params }: PageProps<"/[locale]/for/[slug]">) {
  const { slug, locale } = await params;
  const audience = getAudience(slug);
  if (!audience) notFound();

  const steps = stepsFor(audience);
  const services = servicesFor(audience);
  const journey = pathFor(audience);
  const jobs = await jobsFor(audience);
  const others = AUDIENCES.filter((a) => a.kind === audience.kind && a.slug !== audience.slug);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <nav aria-label="Breadcrumb" className="text-sm">
        <Link href={href(locale, "/for")} className="text-brass-deep underline underline-offset-4">
          Who we help
        </Link>
      </nav>

      <div className="mt-4 grid gap-10 lg:grid-cols-[1fr_20rem]">
        <div>
          <div>
            <span
              dir="rtl"
              aria-hidden="true"
              className="arabic block text-left text-sm leading-tight text-ink-faint"
            >
              {audience.titleAr}
            </span>
            <h1 className="sign mt-1 max-w-[20ch] text-[2.25rem] text-ink sm:text-[2.75rem]">
              {audience.title}
            </h1>
          </div>
          <p className="mt-3 max-w-[58ch] text-lg leading-relaxed text-ink-soft">
            {audience.intro}
          </p>

          <section className="mt-10">
            <SectionHeading arabic="لمن هذه الصفحة">Who this is for</SectionHeading>
            <ul className="mt-4">
              {audience.whoItsFor.map((who) => (
                <li
                  key={who}
                  className="border-b border-rule py-2 text-sm leading-relaxed text-ink-soft last:border-b-0"
                >
                  {who}
                </li>
              ))}
            </ul>
          </section>

          {/* Numbered because it is genuinely a sequence, and linked because
              each step that a service performs should be one tap from the
              page that describes it. */}
          <section className="mt-10">
            <SectionHeading arabic="الخطوات بالترتيب">The route, in order</SectionHeading>
            {journey && (
              <p className="mt-3 max-w-[64ch] text-sm leading-relaxed text-ink-soft">
                {journey.intro}
              </p>
            )}
            <ol className="steps mt-5 space-y-4">
              {steps.map((step, i) => {
                const service = step.service ? getService(step.service) : undefined;
                return (
                  <li key={step.text} className="flex gap-4">
                    <span className="numeral mt-0.5 w-5 shrink-0 text-base text-brass-deep">
                      {i + 1}
                    </span>
                    <span className="text-sm leading-relaxed text-ink-soft">
                      {step.text}
                      {service && (
                        <>
                          {" — "}
                          <Link
                            href={href(locale, `/services/${service.slug}`)}
                            className="text-sign-deep underline underline-offset-4"
                          >
                            {service.shortName}
                          </Link>
                        </>
                      )}
                    </span>
                  </li>
                );
              })}
            </ol>
          </section>

          {/* The reason this page exists. Everything above is a sequence a
              good guide could also give you; this is the list of who decides,
              and it is what a reader cannot assemble on their own. */}
          <section className="mt-10">
            <SectionHeading arabic="الجهات المختصة">Who decides</SectionHeading>
            <p className="mt-3 max-w-[64ch] text-sm leading-relaxed text-ink-soft">
              These are the bodies whose answer is the one that counts. We can tell you what they
              normally ask for and get the documents in order; what they decide is theirs, and the
              requirements change — confirm anything you are relying on with them directly.
            </p>
            <dl className="mt-4">
              {audience.authorities.map((authority) => (
                <div key={authority.name} className="border-b border-rule py-3 last:border-b-0">
                  <dt className="sign text-sm text-ink">{authority.name}</dt>
                  <dd className="mt-0.5 text-sm leading-relaxed text-ink-soft">
                    {authority.decides}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          {jobs.length > 0 && (
            <section className="mt-10">
              <SectionHeading
                arabic="وظائف ذات صلة"
                action={
                  <Link
                    href={href(locale, "/jobs")}
                    className="text-sm text-brass-deep underline underline-offset-4"
                  >
                    All jobs
                  </Link>
                }
              >
                Openings on the board now
              </SectionHeading>
              <div className="mt-2">
                {jobs.map((job) => (
                  <JobRow key={job.slug} job={job} locale={locale} />
                ))}
              </div>
            </section>
          )}

          <section className="mt-10">
            <SectionHeading arabic="ما يمكننا فعله">What we can do about it</SectionHeading>
            <ul className="mt-4 grid gap-x-8 sm:grid-cols-2">
              {services.map((service) => (
                <li key={service.slug} className="border-b border-rule last:border-b-0">
                  <Link
                    href={href(locale, `/services/${service.slug}`)}
                    className="block py-2.5 text-sm text-ink transition-colors hover:text-sign-deep"
                  >
                    {service.name}
                    <span className="mt-0.5 block text-xs leading-relaxed text-ink-faint">
                      {service.delivery === "in-house"
                        ? "We do this ourselves"
                        : "We connect you with a licensed provider"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {others.length > 0 && (
            <section className="mt-10">
              <SectionHeading arabic="ربما تكون أيضًا">You might also be</SectionHeading>
              <ul className="mt-3 flex flex-wrap gap-2">
                {others.map((other) => (
                  <li key={other.slug}>
                    <Link
                      href={href(locale, `/for/${other.slug}`)}
                      className="block rounded-md border border-rule px-3 py-1.5 text-sm text-ink-soft transition-colors hover:border-brass hover:text-brass-deep"
                    >
                      {other.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <p className="mt-10 rounded-md border border-rule bg-paper px-4 py-3 text-xs leading-relaxed text-ink-soft">
            General information, not legal or immigration advice. UAE rules and requirements
            change — confirm anything you are relying on with the authority named above, or ask us
            to check it for your case.
          </p>
        </div>

        <div className="lg:sticky lg:top-6 lg:self-start">
          {services[0] && <ServiceCTA service={services[0]} locale={locale} />}
        </div>
      </div>

      <JsonLd
        data={breadcrumbs(SITE.url, [
          { name: "Who we help", path: href(locale, "/for") },
          { name: audience.title, path: href(locale, `/for/${audience.slug}`) },
        ])}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "HowTo",
          name: audience.title,
          description: audience.intro,
          inLanguage: locale,
          publisher: { "@id": `${SITE.url}/#organization` },
          mainEntityOfPage: absoluteUrl(locale, `/for/${audience.slug}`),
          step: steps.map((step, i) => ({
            "@type": "HowToStep",
            position: i + 1,
            text: step.text,
          })),
        }}
      />
    </div>
  );
}
