import type { Metadata } from "next";
import Link from "next/link";
import { href } from "@/lib/i18n";
import { SERVICES } from "@/lib/services";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: `Contact ${SITE.name}, ${SITE.area}.`,
};

/**
 * There is one way in: the assistant, which is on every page including this
 * one. This page exists for people who went looking for a contact page anyway,
 * so it says where the assistant is and offers the enquiry forms as the route
 * for anyone who would rather write their details down than have a conversation.
 */
export default async function ContactPage({ params }: PageProps<"/[locale]/contact">) {
  const { locale } = await params;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="sign text-3xl tracking-tight text-ink">Contact</h1>
      <p className="mt-3 max-w-[62ch] leading-relaxed text-ink-soft">
        Ask the assistant. It is the button in the corner of every page, and it answers most
        questions about documents and paperwork straight away. When it cannot, it takes your
        details and a person picks it up.
      </p>

      <div className="mt-8 rounded-md border border-rule bg-field p-5">
        <h2 className="sign text-lg text-ink">Rather write it down?</h2>
        <p className="mt-2 max-w-[62ch] text-sm leading-relaxed text-ink-soft">
          Every service page has a short enquiry form. Pick the one that fits and tell us what you
          have — we will come back to you on what it needs.
        </p>
        <ul className="mt-4 grid gap-x-8 sm:grid-cols-2">
          {SERVICES.map((service) => (
            <li key={service.slug} className="border-b border-rule last:border-b-0 sm:last:border-b">
              <Link
                href={href(locale, `/services/${service.slug}`)}
                className="block py-2.5 text-sm text-ink transition-colors hover:text-teal-deep"
              >
                {service.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 rounded-md border border-rule bg-field p-5">
        <h2 className="sign text-lg text-ink">{SITE.name}</h2>
        <p className="mt-1 text-sm text-ink-soft">{SITE.area}</p>
      </div>
    </div>
  );
}
