/**
 * Rules that apply to a job listing however it arrived — from the Careerjet
 * ingest or typed in by hand. They lived inside the ingest until a second way
 * of adding a job existed; the shelf life belongs to the listing, not to the
 * thing that fetched it.
 */

/** How long a listing stays on the site before the prune job expires it. */
export const SHELF_LIFE_DAYS = 45;

export function jobExpiry(postedAt: string | Date): string {
  const expires = new Date(postedAt);
  expires.setDate(expires.getDate() + SHELF_LIFE_DAYS);
  return expires.toISOString();
}

/**
 * Turns what someone typed into a link an applicant can use.
 *
 * Accepts a URL, a bare domain, or an email address. Returns null for anything
 * else — in particular `javascript:` and `data:`, which would otherwise become
 * a link we render and a visitor clicks.
 */
export function normalizeApplyLink(input: string): string | null {
  const value = input.trim();
  if (!value) return null;

  if (/^mailto:/i.test(value)) {
    const address = value.slice(7).trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address) ? `mailto:${address.toLowerCase()}` : null;
  }

  // An email address, as opposed to a URL with a userinfo part.
  if (!value.includes("/") && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return `mailto:${value.toLowerCase()}`;
  }

  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!url.hostname.includes(".")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** True when the apply link is an email address rather than a web page, so the
 *  job page can say "email your application" instead of "view and apply". */
export function isEmailLink(link: string): boolean {
  return link.toLowerCase().startsWith("mailto:");
}
