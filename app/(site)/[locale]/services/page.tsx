import type { Metadata } from "next";
import Link from "next/link";
import { PageHead } from "@/components/site/PageHead";
import { href } from "@/lib/i18n";
import { breadcrumbs, itemList, JsonLd } from "@/components/site/JsonLd";
import { absoluteUrl, pageMetadata } from "@/lib/seo";
import { SERVICES } from "@/lib/services";
import { SITE } from "@/lib/site";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/services">): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata({
    locale,
    path: "/services",
    title: "UAE Attestation, Translation & Visa Services",
    description:
      "Attestation, certified legal translation, visa processing, notary, business setup, higher studies, CV writing and websites — what each involves, start to finish.",
  });
}

export default async function ServicesPage({ params }: PageProps<"/[locale]/services"> ) {
  const { locale } = await params;

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <PageHead title="What we do" arabic="خدماتنا">
        Eight things, done properly. Each page says what the work involves, what we need from you,
        and how long it takes — including the parts that depend on a government department rather
        than on us.
      </PageHead>

      {/* A list divided by rules, not a grid of identical boxes: these are
          seven steps of one process, and boxing each one the same way says
          they are seven unrelated products. */}
      <ul className="mt-10 sm:grid sm:grid-cols-2 sm:gap-x-12">
        {SERVICES.map((service) => (
          <li key={service.slug} className="border-b border-rule">
            <Link href={href(locale, `/services/${service.slug}`)} className="group block py-5">
              <span dir="rtl" className="arabic block text-left text-[0.75rem] leading-tight text-ink-faint" aria-hidden="true">
                {service.nameAr}
              </span>
              <h2 className="sign mt-0.5 text-[1.1875rem] text-ink transition-colors group-hover:text-sign">
                {service.name}
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{service.tagline}</p>
              <p className="mt-2.5 flex items-center gap-2 text-xs text-ink-faint">
                <span
                  aria-hidden="true"
                  className={
                    service.delivery === "in-house"
                      ? "inline-block h-2 w-2 shrink-0 rounded-full bg-sign"
                      : "inline-block h-2 w-2 shrink-0 rounded-full border-[1.5px] border-ink-faint"
                  }
                />
                {service.delivery === "in-house"
                  ? "We do this ourselves"
                  : "We connect you with a licensed provider"}
                <span className="ml-auto">{service.turnaround}</span>
              </p>
            </Link>
          </li>
        ))}
      </ul>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Services",
          url: absoluteUrl(locale, "/services"),
          inLanguage: locale,
          isPartOf: { "@id": `${SITE.url}/#website` },
          mainEntity: itemList(
            SITE.url,
            SERVICES.map((service) => ({
              name: service.name,
              path: href(locale, `/services/${service.slug}`),
            })),
          ),
        }}
      />
      <JsonLd data={breadcrumbs(SITE.url, [{ name: "Services", path: href(locale, "/services") }])} />
    </div>
  );
}
