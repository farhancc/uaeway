import type { MetadataRoute } from "next";
import { listArticles, listJobs } from "@/lib/content/queries";
import { articlePath, SECTION_LIST } from "@/lib/content/sections";
import { LOCALES } from "@/lib/i18n";
import { absoluteUrl, languagesFor } from "@/lib/seo";
import { SERVICES } from "@/lib/services";

/** Only approved content reaches the sitemap: listJobs and listArticles filter
 *  on status, so an unreviewed draft is never advertised to Google.
 *
 *  Paths are declared once and then emitted per locale, each entry carrying the
 *  hreflang alternates for the same page in every other locale — the sitemap
 *  and the pages' own <link rel="alternate"> now come from one helper, so they
 *  cannot disagree about where a page lives. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [jobs, articles] = await Promise.all([listJobs({ limit: 1000 }), listArticles(undefined, 1000)]);

  type Entry = Omit<MetadataRoute.Sitemap[number], "url" | "alternates"> & { path: string };

  const paths: Entry[] = [
    { path: "/", changeFrequency: "daily", priority: 1 },
    { path: "/jobs", changeFrequency: "daily", priority: 0.9 },
    { path: "/services", changeFrequency: "monthly", priority: 0.8 },
    { path: "/about", changeFrequency: "yearly", priority: 0.4 },
    { path: "/contact", changeFrequency: "yearly", priority: 0.5 },

    ...SECTION_LIST.map((section): Entry => ({
      path: `/${section.slug}`,
      changeFrequency: "weekly",
      priority: 0.7,
    })),

    ...SERVICES.map((service): Entry => ({
      path: `/services/${service.slug}`,
      changeFrequency: "monthly",
      priority: 0.9,
    })),

    ...jobs.map((job): Entry => ({
      path: `/jobs/${job.slug}`,
      lastModified: new Date(job.posted_at),
      changeFrequency: "weekly",
      priority: 0.6,
    })),

    ...articles.map((article): Entry => ({
      path: articlePath(article.kind, article.slug),
      lastModified: article.published_at ? new Date(article.published_at) : undefined,
      changeFrequency: "monthly",
      priority: 0.7,
    })),
  ];

  return LOCALES.flatMap((locale) =>
    paths.map(({ path, ...rest }) => ({
      ...rest,
      url: absoluteUrl(locale, path),
      alternates: { languages: languagesFor(path) },
    })),
  );
}
