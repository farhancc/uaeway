import type { MetadataRoute } from "next";
import { listArticles, listJobs } from "@/lib/content/queries";
import { articlePath, SECTION_LIST } from "@/lib/content/sections";
import { href, LOCALES } from "@/lib/i18n";
import { SERVICES } from "@/lib/services";
import { SITE } from "@/lib/site";

/** Only approved content reaches the sitemap: listJobs and listArticles filter
 *  on status, so an unreviewed draft is never advertised to Google. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [jobs, articles] = await Promise.all([listJobs({ limit: 1000 }), listArticles(undefined, 1000)]);

  const entries: MetadataRoute.Sitemap = [];

  for (const locale of LOCALES) {
    entries.push(
      { url: `${SITE.url}${href(locale)}`, changeFrequency: "daily", priority: 1 },
      { url: `${SITE.url}${href(locale, "/jobs")}`, changeFrequency: "daily", priority: 0.9 },
      { url: `${SITE.url}${href(locale, "/services")}`, changeFrequency: "monthly", priority: 0.8 },
      { url: `${SITE.url}${href(locale, "/about")}`, changeFrequency: "yearly", priority: 0.4 },
      { url: `${SITE.url}${href(locale, "/contact")}`, changeFrequency: "yearly", priority: 0.5 },
    );

    for (const section of SECTION_LIST) {
      entries.push({
        url: `${SITE.url}${href(locale, `/${section.slug}`)}`,
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }

    for (const service of SERVICES) {
      entries.push({
        url: `${SITE.url}${href(locale, `/services/${service.slug}`)}`,
        changeFrequency: "monthly",
        priority: 0.9,
      });
    }

    for (const job of jobs) {
      entries.push({
        url: `${SITE.url}${href(locale, `/jobs/${job.slug}`)}`,
        lastModified: new Date(job.posted_at),
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }

    for (const article of articles) {
      entries.push({
        url: `${SITE.url}${href(locale, articlePath(article.kind, article.slug))}`,
        lastModified: article.published_at ? new Date(article.published_at) : undefined,
        changeFrequency: "monthly",
        priority: 0.7,
      });
    }
  }

  return entries;
}
