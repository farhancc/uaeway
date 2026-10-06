import type { Metadata } from "next";
import { getArticle } from "./queries";
import { articlePath, type Section } from "./sections";
import { metaDescription, pageMetadata } from "../seo";
import type { ArticleRow } from "../supabase/types";

/**
 * Shared behaviour for /guides/[slug], /news/[slug] and /blog/[slug].
 *
 * The kind check matters: getArticle looks an article up by slug alone, so
 * without it a guide would also render at /news/<slug> and /blog/<slug>. Three
 * URLs serving one article is duplicate content, and it splits whatever ranking
 * the page earns across all three.
 */
export async function loadArticleFor(
  section: Section,
  slug: string,
  locale: string,
): Promise<ArticleRow | null> {
  const article = await getArticle(slug, locale);
  if (!article || article.kind !== section.kind) return null;
  return article;
}

export async function articleMetadata(
  section: Section,
  slug: string,
  locale: string,
): Promise<Metadata> {
  const article = await loadArticleFor(section, slug, locale);
  if (!article) return { title: "Not found" };

  return pageMetadata({
    locale,
    path: articlePath(article.kind, article.slug),
    title: article.title,
    description: metaDescription(article.excerpt ?? section.description),
    openGraph: {
      type: "article",
      publishedTime: article.published_at ?? undefined,
      modifiedTime: article.updated_at,
    },
  });
}
