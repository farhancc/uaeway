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

/** International format, no plus sign — what wa.me expects. */
export function whatsappNumber(): string | null {
  const raw = process.env.WHATSAPP_NUMBER?.replace(/[^\d]/g, "");
  return raw && raw.length >= 9 ? raw : null;
}

/** A click-to-chat link with the message pre-filled, so the visitor does not
 *  have to explain themselves twice and sales knows what the enquiry is. */
export function whatsappLink(message?: string): string | null {
  const number = whatsappNumber();
  if (!number) return null;
  return message
    ? `https://wa.me/${number}?text=${encodeURIComponent(message)}`
    : `https://wa.me/${number}`;
}
