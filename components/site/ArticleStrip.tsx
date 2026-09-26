import Link from "next/link";
import { SectionHeading } from "./SectionHeading";
import type { ArticleSummary } from "@/lib/content/queries";
import { articlePath, type Section } from "@/lib/content/sections";
import { href } from "@/lib/i18n";

/** Latest articles from one section, for the home page. Renders nothing when
 *  the section is empty, so the home page never shows a hollow heading. */
export function ArticleStrip({
  section,
  articles,
  locale,
}: {
  section: Section;
  articles: ArticleSummary[];
  locale: string;
}) {
  if (articles.length === 0) return null;

  return (
    <section className="pt-16">
      <SectionHeading
        arabic={section.titleAr}
        action={
          <Link
            href={href(locale, `/${section.slug}`)}
            className="text-go underline underline-offset-2"
          >
            All {section.label.toLowerCase()}
          </Link>
        }
      >
        {section.title}
      </SectionHeading>

      <ul className="mt-6 grid border-l border-t border-rule sm:grid-cols-2">
        {articles.map((article) => (
          <li key={article.slug} className="border-b border-r border-rule bg-field px-4 py-4">
            <h3 className="sign text-[0.9375rem] leading-snug">
              <Link
                href={href(locale, articlePath(article.kind, article.slug))}
                className="text-ink hover:text-go"
              >
                {article.title}
              </Link>
            </h3>
            {article.excerpt && (
              <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{article.excerpt}</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
