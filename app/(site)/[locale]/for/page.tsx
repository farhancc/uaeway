import type { Metadata } from "next";
import Link from "next/link";
import { PageHead } from "@/components/site/PageHead";
import { SectionHeading } from "@/components/site/SectionHeading";
import { breadcrumbs, JsonLd } from "@/components/site/JsonLd";
import { href, LOCALES } from "@/lib/i18n";
import { professions, situations, type Audience } from "@/lib/audiences";
import { pageMetadata } from "@/lib/seo";
import { SITE } from "@/lib/site";

/**
 * The index of "who are you", and the one page on the site that is a list of
 * doors rather than an answer.
 *
 * Two groups and not one. Somebody scanning this is either describing a
 * situation they are in or a job they do, and mixing "I am leaving the
 * country" with "I am a teacher" in one alphabetical list makes a reader read
 * all of it to find out neither column is theirs.
 */

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: PageProps<"/[locale]/for">): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata({
    locale,
    path: "/for",
    title: "Who we help",
    description: `Whatever brought you to the UAE, ${SITE.name} has the route written down — by what you are doing, or by what you do for a living.`,
  });
}

function AudienceList({ items, locale }: { items: Audience[]; locale: string }) {
  return (
    <ul className="mt-4 grid gap-x-10 sm:grid-cols-2">
      {items.map((audience) => (
        <li key={audience.slug} className="border-b border-rule last:border-b-0 sm:[&:nth-last-child(2)]:border-b-0">
          <Link
            href={href(locale, `/for/${audience.slug}`)}
            className="group block py-3 transition-colors hover:text-sign-deep"
          >
            <span className="block text-sm font-medium text-ink group-hover:text-sign-deep">
              {audience.label}
            </span>
            <span className="mt-0.5 block text-sm leading-relaxed text-ink-faint">
              {audience.title}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default async function AudienceIndexPage({ params }: PageProps<"/[locale]/for">) {
  const { locale } = await params;

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <PageHead title="Who we help" arabic="لمن نقدم المساعدة">
        Nobody arrives at UAE paperwork at the beginning, and nobody arrives as a general case.
        Find the line that sounds like you and the route is already written down.
      </PageHead>

      <section className="mt-10">
        <SectionHeading arabic="ما الذي تحاول فعله">What you are trying to do</SectionHeading>
        <AudienceList items={situations()} locale={locale} />
      </section>

      <section className="mt-12">
        <SectionHeading arabic="ماذا تعمل">What you do for a living</SectionHeading>
        <p className="mt-3 max-w-[64ch] text-sm leading-relaxed text-ink-soft">
          The paperwork barely changes between one profession and the next. What changes is who
          decides — and that is the part nobody can find on a page about attestation.
        </p>
        <AudienceList items={professions()} locale={locale} />
      </section>

      <JsonLd
        data={breadcrumbs(SITE.url, [{ name: "Who we help", path: href(locale, "/for") }])}
      />
    </div>
  );
}
