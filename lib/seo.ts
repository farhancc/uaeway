import type { Metadata } from "next";
import { DEFAULT_LOCALE, href, LOCALES } from "./i18n";
import { SITE } from "./site";

/**
 * Page-level SEO metadata.
 *
 * Canonical URLs were previously built inline as `${SITE.url}${href(...)}` in
 * every page that bothered to set one — and most did not, so thirteen of the
 * fifteen page types shipped with no canonical at all. Filtered job URLs
 * (/en/jobs?emirate=dubai) were therefore indexable duplicates of /en/jobs.
 *
 * One owner for "where does this page really live", used by every page.
 */

/** Absolute URL for a path within a locale: absoluteUrl("en", "/jobs"). */
export function absoluteUrl(locale: string, path = "/"): string {
  return `${SITE.url}${href(locale, path)}`;
}

/**
 * hreflang map for one page: every locale it exists in, plus x-default.
 *
 * With a single locale this is a self-referencing pair, which is what Google
 * expects of a one-language set and means adding "ar" to LOCALES wires up
 * hreflang across the whole site without touching a page file.
 *
 * Shared by the page metadata and the sitemap so the two cannot disagree.
 * They are kept on this plain Record rather than one calling the other because
 * the sitemap's Languages type is the narrower of the two.
 */
export function languagesFor(path = "/"): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const other of LOCALES) languages[other] = absoluteUrl(other, path);
  languages["x-default"] = absoluteUrl(DEFAULT_LOCALE, path);
  return languages;
}

/**
 * The Open Graph fields every page shares.
 *
 * These have to live here rather than only in the root layout because Next.js
 * *replaces* the parent `openGraph` object when a page sets its own — it does
 * not merge them. A page that set an og:title therefore silently dropped the
 * site's og:image and og:site_name. One object, spread by both the layout and
 * pageMetadata, so that cannot happen again.
 */
export const OG_DEFAULTS: NonNullable<Metadata["openGraph"]> = {
  siteName: SITE.name,
  locale: "en_AE",
  images: [{ url: "/logo.png", width: 1536, height: 1024, alt: SITE.name }],
};

/**
 * Joins fragments into a meta description and clips it to a length Google will
 * actually show, breaking on a sentence or word rather than mid-syllable.
 *
 * Service taglines run to about 60 characters, which left more than half the
 * available snippet unused on every service page.
 */
export function metaDescription(...parts: (string | null | undefined)[]): string {
  const text = parts.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  if (text.length <= 160) return text;

  const clipped = text.slice(0, 160);
  const sentence = clipped.lastIndexOf(". ");
  if (sentence > 110) return clipped.slice(0, sentence + 1);

  return clipped.slice(0, clipped.lastIndexOf(" ")).replace(/[,;:—-]$/, "") + "…";
}

/** Canonical plus hreflang for one page. */
export function alternatesFor(locale: string, path = "/"): Metadata["alternates"] {
  return { canonical: absoluteUrl(locale, path), languages: languagesFor(path) };
}

/**
 * The metadata every page shares: title, description, canonical, hreflang and
 * an OG entry that points at the page itself rather than inheriting the
 * site-wide default URL.
 */
export function pageMetadata({
  locale,
  path = "/",
  title,
  description,
  ...rest
}: {
  locale: string;
  path?: string;
  /** A plain string is templated by the layout; `{ absolute }` opts out. */
  title: NonNullable<Metadata["title"]>;
  description: string;
} & Omit<Metadata, "title" | "description" | "alternates">): Metadata {
  return {
    ...rest,
    title,
    description,
    alternates: alternatesFor(locale, path),
    openGraph: {
      ...OG_DEFAULTS,
      // og:title takes a plain string, so the templated forms are unwrapped.
      title: typeof title === "string" ? title : "absolute" in title ? title.absolute : title.default,
      description,
      url: absoluteUrl(locale, path),
      ...rest.openGraph,
    },
  };
}
