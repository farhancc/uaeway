import type { Metadata } from "next";
import { ArticleIndex } from "@/components/site/ArticleIndex";
import { SECTIONS } from "@/lib/content/sections";

const section = SECTIONS.blog;

export const revalidate = 3600;

export const metadata: Metadata = {
  title: section.title,
  description: section.description,
};

export default async function Page({ params }: PageProps<"/[locale]/blog">) {
  const { locale } = await params;
  return <ArticleIndex section={section} locale={locale} />;
}
