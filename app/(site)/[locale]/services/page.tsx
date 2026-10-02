import type { Metadata } from "next";
import Link from "next/link";
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
      <h1 className="sign text-3xl tracking-tight text-ink">What we do</h1>
      <p className="mt-3 max-w-[62ch] leading-relaxed text-ink-soft">
        Eight things, done properly. Each page says what the work involves, what we need from you,
        and how long it takes — including the parts that depend on a government department rather
        than on us.
      </p>

      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        {SERVICES.map((service) => (
          <article key={service.slug} className="rounded-md border border-rule bg-field p-5">
            <h2 className="sign text-lg leading-snug">
              <Link
                href={href(locale, `/services/${service.slug}`)}
                className="text-ink hover:text-brass-deep"
              >
                {service.name}
              </Link>
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{service.tagline}</p>
            <p className="mt-3 text-xs text-ink-faint">{service.turnaround}</p>
          </article>
        ))}
      </div>

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
