import { z } from "zod";
import { serviceSlugs } from "../services";

/**
 * One validated shape for every lead, whatever produced it — a service form or
 * the chatbot.
 *
 * `lead_origin` in the database still carries 'whatsapp' and 'import', because
 * rows recorded under them are history. Neither can be created through here.
 *
 * `consent` is `z.literal(true)`, not a boolean. Under the UAE PDPL we need a
 * recorded moment of agreement to be contacted, so a lead that arrives without
 * explicit consent is a validation error rather than a row with a default.
 */
export const leadInput = z.object({
  serviceSlug: z.enum(serviceSlugs() as [string, ...string[]]),
  name: z.string().trim().min(1).max(120).optional(),
  /** Phone or email — whichever they gave us to reach them on. */
  contact: z.string().trim().min(5).max(80),
  email: z.string().trim().email().max(160).optional(),
  need: z.string().trim().max(2000).optional(),
  origin: z.enum(["chat", "form"]).default("form"),
  chatSessionId: z.string().uuid().optional(),
  pagePath: z.string().max(300).optional(),
  utm: z.record(z.string(), z.string()).default({}),
  consent: z.literal(true, {
    message: "Please tick the box so our team can contact you about this.",
  }),
});

export type LeadInput = z.infer<typeof leadInput>;

/** Normalised contact, so the duplicate check compares like with like:
 *  "+971 50 123 4567" and "971501234567" are the same person. */
export function normalizeContact(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.includes("@")) return trimmed.toLowerCase();

  const digits = trimmed.replace(/[^\d]/g, "");
  // Local UAE forms: 050… and 50… both mean +971 50….
  if (digits.startsWith("00")) return digits.slice(2);
  if (digits.startsWith("0") && digits.length === 10) return `971${digits.slice(1)}`;
  if (digits.length === 9) return `971${digits}`;
  return digits;
}

/** Rough check that a contact string is usable at all. */
export function looksContactable(raw: string): boolean {
  const c = normalizeContact(raw);
  return c.includes("@") ? /.+@.+\..+/.test(c) : c.length >= 9;
}

/**
 * The first phone number or email in a piece of free text, if there is one we
 * would actually accept.
 *
 * Used to prefill the callback form when someone types their number into the
 * chat instead of the box — so they are not made to type it twice on the one
 * turn that matters commercially.
 *
 * It never creates a lead on its own. The visitor still sees what was found,
 * can correct it, and still ticks the consent box, so the recorded moment of
 * agreement is theirs rather than something we inferred. Returns null when
 * nothing usable is found, which is the safe outcome: an empty field.
 */
export function findContact(text: string): string | null {
  const patterns = [
    /[\w.+-]+@[\w-]+\.[\w.-]+/,
    // +971 50 123 4567, 050-123-4567, 0501234567.
    /\+?\d[\d\s()-]{7,}\d/,
  ];

  for (const pattern of patterns) {
    const found = text.match(pattern)?.[0]?.trim();
    // Checked against the same rule the form is, so we never prefill a value
    // that would be rejected on submit.
    if (found && found.length <= 80 && looksContactable(found)) return found;
  }
  return null;
}
