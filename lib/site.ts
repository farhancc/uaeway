/** Who we are, in one place. Used by metadata, structured data and the footer. */

/**
 * There is deliberately no separate "operating company" here.
 *
 * The site trades under its own name and introduces people to the licensed
 * providers who actually carry out the work. Naming a specific provider in the
 * site's own identity would imply this site performs regulated services —
 * attestation, legal translation, visa filing — which it does not.
 */
export const SITE = {
  name: "UAEvia",
  tagline: "Jobs, guides and paperwork help for life and business in the UAE",
  description:
    "UAE job openings, practical guides, and help with the paperwork behind them — attestation, certified legal translation, visas, notary and company setup.",
  area: "Dubai, United Arab Emirates",
  url: siteUrl(),
} as const;

/**
 * The origin every canonical, hreflang, sitemap entry and og:url is built from.
 *
 * Getting this wrong is the one SEO mistake that cannot be walked back: a
 * production deploy without NEXT_PUBLIC_SITE_URL would publish a sitemap and a
 * full set of canonicals pointing at http://localhost:3000, which de-indexes
 * the site. Vercel always exposes the project's production domain, so we fall
 * back to that before falling back to localhost.
 */
function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;

  return "http://localhost:3000";
}
