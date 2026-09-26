import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleView } from "@/components/site/ArticleView";
import { articleMetadata, loadArticleFor } from "@/lib/content/article-route";
import { SECTIONS } from "@/lib/content/sections";

const section = SECTIONS.blog;

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/blog/[slug]">): Promise<Metadata> {
  const { slug, locale } = await params;
  return articleMetadata(section, slug, locale);
}

export default async function Page({ params }: PageProps<"/[locale]/blog/[slug]">) {
  const { slug, locale } = await params;
  const article = await loadArticleFor(section, slug, locale);
  if (!article) notFound();

  return <ArticleView article={article} locale={locale} />;
}
