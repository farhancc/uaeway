import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { breadcrumbs, JsonLd } from "@/components/site/JsonLd";
import { LeadForm } from "@/components/site/LeadForm";
import { SectionHeading } from "@/components/site/SectionHeading";
import { href, LOCALES } from "@/lib/i18n";
import { getService, SERVICES } from "@/lib/services";
import { SITE, whatsappLink } from "@/lib/site";

export function generateStaticParams() {
  return LOCALES.flatMap((locale) => SERVICES.map((s) => ({ locale, slug: s.slug })));
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/services/[slug]">): Promise<Metadata> {
  const { slug, locale } = await params;
  const service = getService(slug);
  if (!service) return { title: "Service not found" };

  return {
    title: service.name,
    description: service.tagline,
    alternates: { canonical: `${SITE.url}${href(locale, `/services/${service.slug}`)}` },
  };
}

export default async function ServicePage({ params }: PageProps<"/[locale]/services/[slug]">) {
  const { slug, locale } = await params;
  const service = getService(slug);
  if (!service) notFound();

  const wa = whatsappLink(`Hello — I need help with ${service.shortName.toLowerCase()}.`);
  const related = service.related.map(getService).filter((s) => s !== undefined);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <nav aria-label="Breadcrumb" className="text-sm">
        <Link href={href(locale, "/services")} className="text-go underline underline-offset-2">
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

          {service.licence === "partner" && (
            <p className="mt-4 max-w-[64ch] rounded-[2px] border border-rule bg-paper px-4 py-3 text-sm leading-relaxed text-ink-soft">
              This service is delivered together with a licensed partner. We manage the process and
              stay your point of contact throughout.
            </p>
          )}

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
                  <span className="sign mt-0.5 w-5 shrink-0 text-sm text-seal">{i + 1}</span>
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

          <section className="mt-10">
            <SectionHeading arabic="أسئلة متكررة">Questions we get</SectionHeading>
            <div className="mt-4 divide-y divide-rule border-y border-rule">
              {service.faqs.map((faq) => (
                <details key={faq.q} className="qa py-4">
                  <summary className="font-medium text-ink">
                    {faq.q}
                  </summary>
                  <p className="mt-2 max-w-[64ch] text-sm leading-relaxed text-ink-soft">{faq.a}</p>
                </details>
              ))}
            </div>
          </section>

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

        <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <LeadForm service={service} />
          {wa && (
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-[2px] border border-rule bg-field px-4 py-3 text-center text-sm font-medium text-go-dark transition-colors hover:border-go"
            >
              Or message us on WhatsApp
            </a>
          )}
        </div>
      </div>

      <JsonLd
        data={breadcrumbs(SITE.url, [
          { name: "Services", path: href(locale, "/services") },
          { name: service.name, path: href(locale, `/services/${service.slug}`) },
        ])}
      />
      {/* FAQ markup: Google restricted FAQ rich results to authoritative health
          and government sites, so this is for machine readability — including by
          AI search — rather than for a rich snippet. */}
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: service.faqs.map((faq) => ({
            "@type": "Question",
            name: faq.q,
            acceptedAnswer: { "@type": "Answer", text: faq.a },
          })),
        }}
      />
    </div>
  );
}
