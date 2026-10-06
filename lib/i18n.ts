/**
 * Locale handling.
 *
 * Phase 1 ships English only, but every public URL carries its locale from the
 * first day: /en/services/attestation. Retrofitting the segment later would
 * change every address on the site and throw away whatever ranking it has
 * earned, which is the one migration worth paying for in advance.
 *
 * Adding Arabic means adding "ar" here and translating the pages that matter.
 */

export const LOCALES = ["en"] as const;
export const DEFAULT_LOCALE = "en";

export type Locale = (typeof LOCALES)[number];

/** Locales we will eventually serve. RTL is decided here, not per component. */
export const RTL_LOCALES = new Set(["ar", "ur", "fa", "he"]);

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

export function dirFor(locale: string): "ltr" | "rtl" {
  return RTL_LOCALES.has(locale) ? "rtl" : "ltr";
}

/**
 * The locale a path is already in, or the default.
 *
 * The chat widget sends the page it was opened on, and a reply that links to a
 * listing has to link inside the locale the visitor is reading — sending an
 * Arabic reader to an English URL is a reload and a lost place.
 */
export function localeFrom(path: string | null | undefined): Locale {
  const first = path?.split("/").filter(Boolean)[0];
  return first && isLocale(first) ? first : DEFAULT_LOCALE;
}

/** Prefixes a path with the locale: href("en", "/jobs") -> "/en/jobs". */
export function href(locale: string, path = "/"): string {
  return path === "/" ? `/${locale}` : `/${locale}${path}`;
}
