import Link from "next/link";
import { articlePath, type Section } from "@/lib/content/sections";
import { listArticles } from "@/lib/content/queries";
import { href } from "@/lib/i18n";

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
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h1 className="sign text-3xl text-ink sm:text-4xl">{section.title}</h1>
        <span aria-hidden="true" className="arabic text-lg text-ink-faint">
          {section.titleAr}
        </span>
      </div>

      <p className="mt-3 max-w-[62ch] leading-relaxed text-ink-soft">{section.intro}</p>

      {articles.length > 0 ? (
        <ul className="mt-10 border-t border-rule">
          {articles.map((article) => (
            <li key={article.slug} className="border-b border-rule py-5">
              <h2 className="sign text-[1.0625rem] leading-snug">
                <Link
                  href={href(locale, articlePath(article.kind, article.slug))}
                  className="text-ink hover:text-brass-deep"
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
    </div>
  );
}
