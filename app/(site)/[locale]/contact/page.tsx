import type { Metadata } from "next";
import Link from "next/link";
import { PageHead } from "@/components/site/PageHead";
import { href } from "@/lib/i18n";
import { SERVICES } from "@/lib/services";
import { pageMetadata } from "@/lib/seo";
import { SITE } from "@/lib/site";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/contact">): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata({
    locale,
    path: "/contact",
    title: "Contact",
    description: `Ask ${SITE.name} about attestation, certified legal translation, UAE visas, notary documents or company setup. The assistant is on every page, or leave your details.`,
  });
}

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
      <PageHead title="Contact" arabic="اتصل بنا">
        Ask the assistant. It is the button in the corner of every page, and it answers most
        questions about documents and paperwork straight away. When it cannot, it takes your
        details and a person picks it up.
      </PageHead>

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
                className="block py-2.5 text-sm text-ink transition-colors hover:text-sign-deep"
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
