import type { Metadata } from "next";
import Link from "next/link";
import { href } from "@/lib/i18n";
import { SERVICES } from "@/lib/services";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Attestation, certified legal translation, visa processing, notary, business setup, higher studies, CV writing and websites — what each involves and what we need from you.",
};

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
          <article key={service.slug} className="rounded-[2px] border border-rule bg-field p-5">
            <h2 className="sign text-lg leading-snug">
              <Link
                href={href(locale, `/services/${service.slug}`)}
                className="text-ink hover:text-go"
              >
                {service.name}
              </Link>
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{service.tagline}</p>
            <p className="mt-3 text-xs text-ink-faint">{service.turnaround}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
