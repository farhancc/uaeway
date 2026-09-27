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
  url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
} as const;
