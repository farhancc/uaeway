/**
 * The chatbot's instructions, and the checks that back them up.
 *
 * The bot sells services, so it has an incentive to sound confident. The risk
 * that matters is a confident wrong answer about a government fee, a processing
 * time or an eligibility rule: people act on those, and we would be the source.
 * So the prompt forbids unsupported specifics, and `findUnsupportedAmounts`
 * checks the reply afterwards rather than trusting the prompt alone.
 */

import { SERVICES } from "../services";

const SERVICE_LIST = SERVICES.map((s) => `- ${s.name} (/services/${s.slug}): ${s.tagline}`).join(
  "\n",
);

/**
 * The instructions, with no per-turn content in them.
 *
 * This string is byte-identical on every call, which is the point: Gemini's
 * implicit caching keys on a stable prefix, and the previous version embedded
 * the retrieved context here, so every request looked new. The context now
 * travels with the visitor's own message instead.
 */
export const SYSTEM_PROMPT = `You are the assistant on a UAE services website run by Wordcraft, based in Al Qusais, Dubai.
You help people who are moving to, working in, or starting a business in the UAE, and you connect
them with the right Wordcraft service.

WHAT WORDCRAFT OFFERS
${SERVICE_LIST}

Each message you receive carries a CONTEXT block followed by the visitor's own words after
"VISITOR:". That CONTEXT is the only site content you may rely on for specifics, and you reply
to the VISITOR line — never repeat the context back or mention that you were given it.

HOW TO ANSWER
- Be brief and plain. Two to four sentences. No bullet lists unless asked, no marketing language.
- Answer the question that was actually asked before mentioning a service.
- Link to a relevant page using its path from CONTEXT, for example /services/attestation.
- If the person writes in another language, reply in that language. All the rules below still apply.

WHAT YOU MUST NOT DO
- Do NOT state any government fee, cost, price, processing time, validity period, quota or
  eligibility rule unless that exact detail appears in CONTEXT. If it is not there, say that it
  depends on the case and changes periodically, and offer to have the team confirm it.
- Do NOT give legal, immigration, tax or financial advice. Wordcraft is a service provider, not a
  law firm or a licensed consultancy, and you must not imply otherwise.
- Do NOT promise or predict an approval, a visa outcome, a ranking or an admission.
- Do NOT claim any licence, accreditation or government authorisation for Wordcraft.
- Do NOT invent job openings, employers or deadlines. Only mention jobs that appear in CONTEXT.
- Do NOT answer questions unrelated to the UAE or to these services. Say briefly that it is
  outside what you can help with.
- If you do not know, say so. A short honest answer is worth more than a confident guess.

TURNING THE CONVERSATION INTO A LEAD
- When someone has a real need, name the service that fits and say what the first step is.
- Then ask for their name and WhatsApp number, and ask permission in the same breath, like:
  "If you send me your name and WhatsApp number, can our team message you about this?"
- Only treat it as agreement if they actually say yes or give the number in reply to that question.
- Never ask for passport numbers, Emirates ID numbers, card details or document scans in chat.
- If they are not ready, leave it. Do not ask twice in one conversation.`;

/** The visitor's message with its grounding attached, kept as one user turn so
 *  the conversation still alternates roles cleanly. */
export function withContext(message: string, context: string): string {
  return `CONTEXT:\n${context}\n\nVISITOR: ${message}`;
}

/** Runs after the reply to see whether a lead is now capturable. */
export const EXTRACTION_PROMPT = `Read this conversation between a visitor and a UAE services assistant.

Return JSON:
- "hasContact": true only if the visitor gave a phone number or email address.
- "contact": that phone number or email exactly as they wrote it, else null.
- "name": the visitor's name if they gave it, else null.
- "consented": true ONLY if the visitor clearly agreed to be contacted, or volunteered their
  number in direct response to being asked whether the team may contact them. If they merely
  mentioned a number in passing, this is false.
- "serviceSlug": which service they need, one of: SERVICE_SLUGS, or null if unclear.
- "need": one sentence describing what they want, in your words.

Be strict about "consented". A wrong true means we message someone who did not ask to be messaged.

Conversation:
`;

/** Money amounts in the reply that do not appear in the grounding context.
 *  A non-empty result means the model produced a figure we cannot stand behind. */
export function findUnsupportedAmounts(reply: string, context: string): string[] {
  const MONEY =
    /(?:aed|dhs?|dirhams?|usd|\$)\s?([\d][\d,]*(?:\.\d+)?)|([\d][\d,]{2,})\s?(?:aed|dhs?|dirhams?)/gi;

  const digitsOf = (s: string) => s.replace(/[^\d]/g, "");
  const inContext = new Set<string>();
  for (const m of context.matchAll(MONEY)) {
    inContext.add(digitsOf(m[1] ?? m[2] ?? ""));
  }

  const unsupported = new Set<string>();
  for (const m of reply.matchAll(MONEY)) {
    const raw = m[0].trim();
    if (!inContext.has(digitsOf(m[1] ?? m[2] ?? ""))) unsupported.add(raw);
  }
  return [...unsupported];
}

export const FEE_CAUTION =
  "Please treat any figure above as indicative only — government fees change, so confirm with our team or the relevant authority before relying on it.";

/** Sent once a conversation has used its budget of model replies. It has to
 *  leave the visitor somewhere useful, not at a wall — the bank and the
 *  suggested questions still work, and a real person is one tap away. */
export const CAPPED_REPLY =
  "I have reached the limit of what I can work out in one conversation. The suggested questions below still work, and for anything else our team will answer you directly on WhatsApp — that is faster than me anyway.";

export const RETIRED_ANSWER_REPLY =
  "That question has moved. Pick one below, or type what you need.";

export const FALLBACK_REPLY =
  "Sorry — I could not reach the assistant just now. Send us a WhatsApp message and someone from the team will answer you directly.";
