import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { breadcrumbs, JsonLd } from "./JsonLd";
import { ServiceCTA } from "./ServiceCTA";
import { articlePath, sectionFor } from "@/lib/content/sections";
import { href } from "@/lib/i18n";
import { absoluteUrl } from "@/lib/seo";
import { getService, matchServices } from "@/lib/services";
import { SITE } from "@/lib/site";
import type { ArticleRow } from "@/lib/supabase/types";

/** Guides and news are the same object with a different label, so they share
 *  one view rather than two pages that drift apart. */
export function ArticleView({ article, locale }: { article: ArticleRow; locale: string }) {
  const section = sectionFor(article.kind);

  const service =
    (article.service_slug ? getService(article.service_slug) : undefined) ??
    matchServices(`${article.title} ${article.excerpt ?? ""}`, 1)[0];

  const published = article.published_at ? new Date(article.published_at) : null;

  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      <nav aria-label="Breadcrumb" className="text-sm text-ink-faint">
        <Link href={href(locale, `/${section.slug}`)} className="text-brass-deep underline underline-offset-4">
          {section.label}
        </Link>
      </nav>

      <h1 className="sign mt-4 max-w-[24ch] text-3xl text-ink sm:text-4xl">{article.title}</h1>

      {published && (
        <p className="mt-2 text-sm text-ink-faint">
          <time dateTime={article.published_at!}>
            {published.toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </time>
        </p>
      )}

      {article.excerpt && (
        <p className="mt-6 text-lg leading-relaxed text-ink-soft">{article.excerpt}</p>
      )}

      {/* react-markdown does not render raw HTML, so an approved draft cannot
          smuggle a script tag onto the page. */}
      <div className="prose-doc mt-8">
        <ReactMarkdown>{article.body_md}</ReactMarkdown>
      </div>

      {article.citations.length > 0 && (
        <section className="mt-10 border-t border-rule pt-6">
          <h2 className="sign text-sm text-ink">Sources</h2>
          <ol className="mt-2 space-y-1 text-sm">
            {article.citations.map((citation) => (
              <li key={citation.url}>
                <a
                  href={citation.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-go hover:underline"
                >
                  {citation.title}
                </a>
                {citation.publisher && (
                  <span className="text-ink-faint"> — {citation.publisher}</span>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      <p className="mt-8 rounded-md border border-rule bg-paper px-4 py-3 text-xs leading-relaxed text-ink-soft">
        General information, not legal or immigration advice. UAE fees and rules change — confirm
        anything you are relying on with the relevant authority, such as ICP or GDRFA, or ask us to
        check it for your case.
      </p>

      {service && (
        <div className="mt-8">
          <ServiceCTA service={service} locale={locale} />
        </div>
      )}

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: article.title,
          description: article.excerpt ?? undefined,
          datePublished: article.published_at ?? undefined,
          dateModified: article.updated_at,
          inLanguage: article.locale,
          publisher: { "@type": "Organization", name: SITE.name },
          mainEntityOfPage: absoluteUrl(locale, articlePath(article.kind, article.slug)),
        }}
      />
      <JsonLd
        data={breadcrumbs(SITE.url, [
          { name: section.label, path: href(locale, `/${section.slug}`) },
          { name: article.title, path: href(locale, articlePath(article.kind, article.slug)) },
        ])}
      />
    </article>
  );
}
