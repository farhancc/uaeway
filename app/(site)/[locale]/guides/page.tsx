import type { Metadata } from "next";
import { ArticleIndex } from "@/components/site/ArticleIndex";
import { SECTIONS } from "@/lib/content/sections";
import { pageMetadata } from "@/lib/seo";

const section = SECTIONS.guide;

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/guides">): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata({
    locale,
    path: `/${section.slug}`,
    title: section.title,
    description: section.description,
  });
}

export default async function Page({ params }: PageProps<"/[locale]/guides">) {
  const { locale } = await params;
  return <ArticleIndex section={section} locale={locale} />;
}
