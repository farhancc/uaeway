import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { answersForService } from "@/lib/chat/answers";
import { breadcrumbs, JsonLd } from "@/components/site/JsonLd";
import { LeadForm } from "@/components/site/LeadForm";
import { SectionHeading } from "@/components/site/SectionHeading";
import { href, LOCALES } from "@/lib/i18n";
import { absoluteUrl, metaDescription, pageMetadata } from "@/lib/seo";
import { getService, SERVICES } from "@/lib/services";
import { SITE } from "@/lib/site";

// The FAQ block now comes from the answer bank, so the page reads the database
// and is revalidated rather than frozen at build time.
export const revalidate = 3600;

export function generateStaticParams() {
  return LOCALES.flatMap((locale) => SERVICES.map((s) => ({ locale, slug: s.slug })));
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/services/[slug]">): Promise<Metadata> {
  const { slug, locale } = await params;
  const service = getService(slug);
  if (!service) return { title: "Service not found" };

  // Several service names already say "UAE" ("UAE Visa Processing", "Business
  // Setup in the UAE"); appending it unconditionally produced titles like
  // "Business Setup in the UAE in the UAE".
  const title = /\buae\b/i.test(service.name) ? service.name : `${service.name} in the UAE`;

  return pageMetadata({
    locale,
    path: `/services/${service.slug}`,
    title,
    // The tagline alone ran to about 60 characters and left half the snippet
    // unused, so the summary continues it up to the length Google will show.
    description: metaDescription(service.tagline, service.summary),
    openGraph: { type: "article" },
  });
}

export default async function ServicePage({ params }: PageProps<"/[locale]/services/[slug]">) {
  const { slug, locale } = await params;
  const service = getService(slug);
  if (!service) notFound();

  const related = service.related.map(getService).filter((s) => s !== undefined);
  const faqs = await answersForService(service.slug);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <nav aria-label="Breadcrumb" className="text-sm">
        <Link href={href(locale, "/services")} className="text-brass-deep underline underline-offset-4">
          Services
        </Link>
      </nav>

      <div className="mt-4 grid gap-10 lg:grid-cols-[1fr_20rem]">
        <div>
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <h1 className="sign max-w-[18ch] text-3xl text-ink sm:text-4xl">{service.name}</h1>
            <span aria-hidden="true" className="arabic text-lg text-ink-faint">
              {service.nameAr}
            </span>
          </div>
          <p className="mt-3 max-w-[58ch] text-lg leading-relaxed text-ink-soft">
            {service.tagline}
          </p>
          <p className="mt-6 max-w-[64ch] leading-relaxed text-ink-soft">{service.summary}</p>

          {/* Who actually does the work, said plainly before anyone hands over
              a document or a fee. Both cases are stated — saying nothing on the
              in-house ones would let the referred wording bleed across. */}
          <p className="mt-4 max-w-[64ch] rounded-md border border-rule bg-paper px-4 py-3 text-sm leading-relaxed text-ink-soft">
            {service.delivery === "referred" ? (
              <>
                We do not carry this out ourselves. We work out what your case actually needs and
                put you in touch with a licensed provider who does — and we stay your point of
                contact while it runs.
              </>
            ) : (
              <>
                We do this one ourselves, start to finish. No third party, no handover in the
                middle.
              </>
            )}
          </p>

          <section className="mt-10">
            <SectionHeading arabic="لمن هذه الخدمة">Who this is for</SectionHeading>
            <ul className="mt-4">
              {service.whoItsFor.map((who) => (
                <li
                  key={who}
                  className="border-b border-rule py-2 text-sm leading-relaxed text-ink-soft last:border-b-0"
                >
                  {who}
                </li>
              ))}
            </ul>
          </section>

          {/* Numbered because it genuinely is a sequence — each step depends on
              the one before it. */}
          <section className="mt-10">
            <SectionHeading arabic="خطوات العمل">How it works</SectionHeading>
            <ol className="steps mt-5 space-y-4">
              {service.process.map((step, i) => (
                <li key={step} className="flex gap-4">
                  <span className="numeral mt-0.5 w-5 shrink-0 text-base text-brass-deep">{i + 1}</span>
                  <span className="text-sm leading-relaxed text-ink-soft">{step}</span>
                </li>
              ))}
            </ol>
          </section>

          <section className="mt-10">
            <SectionHeading arabic="المستندات المطلوبة">What we need from you</SectionHeading>
            <div className="mt-4 flex flex-wrap gap-2">
              {service.documents.map((doc) => (
                <span key={doc} className="stamp">
                  {doc}
                </span>
              ))}
            </div>
            <p className="mt-4 text-sm leading-relaxed text-ink-soft">
              <strong className="font-semibold text-ink">Turnaround:</strong> {service.turnaround}
            </p>
          </section>

          {faqs.length > 0 && (
          <section className="mt-10">
            <SectionHeading arabic="أسئلة متكررة">Questions we get</SectionHeading>
            <div className="mt-4 divide-y divide-rule border-y border-rule">
              {faqs.map((faq) => (
                <details key={faq.slug} className="qa py-4">
                  <summary className="font-medium text-ink">{faq.question}</summary>
                  <div className="prose-doc mt-2 max-w-[64ch] text-sm">
                    <ReactMarkdown>{faq.answer_md}</ReactMarkdown>
                  </div>
                </details>
              ))}
            </div>
          </section>
          )}

          {related.length > 0 && (
            <section className="mt-10">
              <SectionHeading arabic="خدمات ذات صلة">Usually needed alongside</SectionHeading>
              <ul className="mt-5 border-t border-rule">
                {related.map((r) => (
                  <li key={r.slug} className="border-b border-rule">
                    <Link
                      href={href(locale, `/services/${r.slug}`)}
                      className="block py-3 transition-colors hover:bg-field"
                    >
                      <span className="sign text-[0.9375rem] text-ink">{r.name}</span>
                      <span className="mt-0.5 block text-sm leading-relaxed text-ink-soft">
                        {r.tagline}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <div className="lg:sticky lg:top-6 lg:self-start">
          <LeadForm service={service} />
        </div>
      </div>

      {/* Service, describing what this page is actually about.

          `provider` is set only for the two lines we carry out ourselves. On a
          referred service naming ourselves as the provider would assert in
          machine-readable form the exact thing the page above is at pains to
          deny — that we perform regulated work — so it is omitted rather than
          fudged. No `offers`: there is no agreed price to state. */}
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Service",
          name: service.name,
          alternateName: service.nameAr,
          serviceType: service.name,
          description: service.summary,
          url: absoluteUrl(locale, `/services/${service.slug}`),
          areaServed: { "@type": "Country", name: "United Arab Emirates" },
          ...(service.delivery === "in-house"
            ? { provider: { "@id": `${SITE.url}/#organization` } }
            : {}),
        }}
      />
      <JsonLd
        data={breadcrumbs(SITE.url, [
          { name: "Services", path: href(locale, "/services") },
          { name: service.name, path: href(locale, `/services/${service.slug}`) },
        ])}
      />
      {/* FAQ markup: Google restricted FAQ rich results to authoritative health
          and government sites, so this is for machine readability — including by
          AI search — rather than for a rich snippet. Omitted entirely when the
          bank has nothing, rather than emitting an empty FAQPage. */}
      {faqs.length > 0 && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((faq) => ({
              "@type": "Question",
              name: faq.question,
              acceptedAnswer: { "@type": "Answer", text: faq.answer_md },
            })),
          }}
        />
      )}
    </div>
  );
}
