import Link from "next/link";
import { PageHead } from "./PageHead";
import { breadcrumbs, itemList, JsonLd } from "./JsonLd";
import { articlePath, type Section } from "@/lib/content/sections";
import { listArticles } from "@/lib/content/queries";
import { href } from "@/lib/i18n";
import { absoluteUrl } from "@/lib/seo";
import { SITE } from "@/lib/site";

/**
 * The listing for guides, news and blog posts.
 *
 * One component rather than three near-identical pages: they differ only in
 * their copy, which lives in lib/content/sections.ts. The previous news page
 * was a copy of the guides page and had already started to drift.
 */
export async function ArticleIndex({ section, locale }: { section: Section; locale: string }) {
  const articles = await listArticles(section.kind);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <PageHead title={section.title} arabic={section.titleAr}>
        {section.intro}
      </PageHead>

      {articles.length > 0 ? (
        <ul className="mt-8">
          {articles.map((article) => (
            <li key={article.slug} className="border-b border-rule py-5">
              <h2 className="sign text-[1.0625rem] leading-snug">
                <Link
                  href={href(locale, articlePath(article.kind, article.slug))}
                  className="text-ink transition-colors hover:text-sign"
                >
                  {article.title}
                </Link>
              </h2>

              {article.published_at && (
                <p className="mt-1 text-xs text-ink-faint">
                  <time dateTime={article.published_at}>
                    {new Date(article.published_at).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </time>
                </p>
              )}

              {article.excerpt && (
                <p className="mt-2 max-w-[64ch] text-sm leading-relaxed text-ink-soft">
                  {article.excerpt}
                </p>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="field mt-10 max-w-[62ch] px-4 py-5 text-sm leading-relaxed text-ink-soft">
          {section.empty}
        </p>
      )}

      {/* A category page's substance is the list, so that is what the markup
          describes. Omitted while the section is empty rather than emitting an
          ItemList of nothing. */}
      {articles.length > 0 && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: section.title,
            description: section.description,
            url: absoluteUrl(locale, `/${section.slug}`),
            inLanguage: locale,
            isPartOf: { "@id": `${SITE.url}/#website` },
            mainEntity: itemList(
              SITE.url,
              articles.map((article) => ({
                name: article.title,
                path: href(locale, articlePath(article.kind, article.slug)),
              })),
            ),
          }}
        />
      )}
      <JsonLd
        data={breadcrumbs(SITE.url, [{ name: section.label, path: href(locale, `/${section.slug}`) }])}
      />
    </div>
  );
}
