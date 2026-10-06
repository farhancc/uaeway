/**
 * Which question to ask next, and whether we are done.
 *
 * Pure, and that is the point: this function decides whether a conversation
 * becomes a lead, so it has to be testable without a database, a model or a
 * browser. Everything it needs — the service definition and what has been
 * collected — arrives as an argument.
 *
 * It replaces drawing one question node per field per service. Six fields used
 * to be six boxes on a canvas and six edges between them; here they are six
 * rows of data and this loop.
 */

import { looksContactable, normalizeContact } from "../../leads/schema";
import type { Known, QualificationField, ServiceDefinition } from "./schema";

/**
 * The spellings that actually turn up in UAE attestation work.
 *
 * Not an ISO table, and deliberately not: the value of normalising is that
 * "india", "IN" and "Indian" become one lead field rather than three, and that
 * is earned by two dozen entries. Anything unrecognised is title-cased and
 * kept — refusing a country because it is not on our list would reject a real
 * customer to tidy a string.
 */
const COUNTRY_ALIASES: Record<string, string> = {
  in: "India", ind: "India", indian: "India", bharat: "India",
  pk: "Pakistan", pak: "Pakistan", pakistani: "Pakistan",
  ph: "Philippines", phl: "Philippines", filipino: "Philippines", philippine: "Philippines",
  bd: "Bangladesh", bgd: "Bangladesh", bangladeshi: "Bangladesh",
  lk: "Sri Lanka", srilanka: "Sri Lanka", sri: "Sri Lanka",
  np: "Nepal", nepali: "Nepal",
  eg: "Egypt", egyptian: "Egypt",
  ng: "Nigeria", nigerian: "Nigeria",
  uk: "United Kingdom", gb: "United Kingdom", britain: "United Kingdom",
  england: "United Kingdom", british: "United Kingdom", scotland: "United Kingdom",
  us: "United States", usa: "United States", america: "United States", american: "United States",
  ae: "United Arab Emirates", uae: "United Arab Emirates", emirates: "United Arab Emirates",
  dubai: "United Arab Emirates", "abu dhabi": "United Arab Emirates", sharjah: "United Arab Emirates",
  ca: "Canada", au: "Australia", za: "South Africa", ke: "Kenya", gh: "Ghana",
  jo: "Jordan", sy: "Syria", lb: "Lebanon", ir: "Iran", iq: "Iraq",
  sa: "Saudi Arabia", ksa: "Saudi Arabia", saudi: "Saudi Arabia",
};

function titleCase(value: string): string {
  return value.replace(/\S+/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());
}

export type Accepted = { value: string } | { error: string };

/**
 * One answer, validated and normalised.
 *
 * Every value reaches a lead through here, whether the visitor typed it, tapped
 * it, or a model extracted it from a sentence. That is the invariant worth
 * keeping: extraction earns no special trust, because a field the model guessed
 * wrong is a salesperson calling the wrong number.
 */
export function acceptValue(field: QualificationField, raw: string): Accepted {
  const value = raw.trim();
  if (!value) return { error: "That came through empty — could you say it again?" };
  if (value.length > 300) return { error: "That is a little long — the short version is fine." };

  switch (field.type) {
    case "enum": {
      // Tolerant on purpose: someone typing "degree" at a list containing
      // "Degree or diploma certificate" has answered the question.
      const lower = value.toLowerCase();
      const hit =
        field.options.find((o) => o.toLowerCase() === lower) ??
        field.options.find((o) => o.toLowerCase().startsWith(lower)) ??
        field.options.find((o) => o.toLowerCase().includes(lower));
      return hit ? { value: hit } : { error: `Please pick one of: ${field.options.join(", ")}.` };
    }

    case "country": {
      // Letters in any script: the alias table is Latin, so a country written
      // in Arabic will not hit it — but stripping its characters first would
      // leave an empty string and make the sentence check below meaningless.
      const key = value.toLowerCase().replace(/[^\p{L}\s]/gu, "").trim();
      const known = COUNTRY_ALIASES[key];
      if (known) return { value: known };

      // Unrecognised is fine — refusing a country because it is not on our
      // short list would turn away a real customer. A sentence is not, though:
      // "I need a translation" is a change of subject, and storing it as the
      // issuing country is how a lead reaches sales saying the degree came from
      // "I Need A Translation". No country name runs past three words.
      const words = value.split(/\s+/).filter(Boolean);
      if (words.length > 3) {
        return { error: "Which country was that? The country name on its own is enough." };
      }
      return { value: titleCase(value) };
    }

    case "phone": {
      // The same normaliser the lead form uses, so "+971 50 123 4567" typed in
      // chat and typed in the form are one contact rather than two leads.
      if (!looksContactable(value)) {
        return { error: "That does not look like a number we could reach you on." };
      }
      return { value: normalizeContact(value) };
    }

    case "email":
      return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)
        ? { value: value.toLowerCase() }
        : { error: "That does not look like an email address." };

    case "text":
      return { value };
  }
}

/** Required fields with nothing collected for them yet. */
export function missingRequired(def: ServiceDefinition, known: Known): QualificationField[] {
  return def.fields.filter((f) => f.required && !known[f.key]);
}

/**
 * The next question, or null when this is already a lead.
 *
 * Required fields only, in their own `order`. Optional fields are never asked:
 * every question is a chance for the conversation to end, so spending one on
 * something we have already decided is not needed trades a lead for a nicety.
 * They still reach the CRM when a visitor volunteers them, which is what
 * extraction is for.
 *
 * The ordering is the strategy §7 asks for, expressed as data: change a number
 * in the Service Builder and the conversation asks in a different sequence,
 * with no deploy. It is why `phone` sits at the back by default.
 */
export function nextRequired(def: ServiceDefinition, known: Known): QualificationField | null {
  return missingRequired(def, known).sort((a, b) => a.order - b.order)[0] ?? null;
}

/** Whether this is a lead. The one definition of it in the codebase. */
export function isQualified(def: ServiceDefinition, known: Known): boolean {
  return missingRequired(def, known).length === 0;
}

/**
 * Everything the runtime and the CRM want to know at once.
 *
 * `missing` names only the required fields, because that is the list a
 * salesperson reads as "what this lead is short of" — an unanswered optional
 * field is not a gap.
 */
export function qualification(
  def: ServiceDefinition,
  known: Known,
): { qualified: boolean; missing: string[]; next: QualificationField | null } {
  const missing = missingRequired(def, known);
  return {
    qualified: missing.length === 0,
    missing: missing.map((f) => f.key),
    next: nextRequired(def, known),
  };
}

/** Only the fields this service declares, in declaration order — what gets
 *  stored on the lead, without whatever else the conversation collected. */
export function collected(def: ServiceDefinition, known: Known): Known {
  const out: Known = {};
  for (const field of def.fields) {
    if (known[field.key]) out[field.key] = known[field.key];
  }
  return out;
}
