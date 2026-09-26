import { z } from "zod";
import { serviceSlugs } from "../services";

/**
 * One validated shape for every lead, whatever produced it — a service form, the
 * chatbot, or an inbound WhatsApp click.
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
  origin: z.enum(["chat", "form", "whatsapp"]).default("form"),
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
