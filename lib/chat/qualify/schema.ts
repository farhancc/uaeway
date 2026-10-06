/**
 * What a service needs to know before an enquiry is worth a salesperson's time.
 *
 * This is the qualification schema: a list of fields, their types, and which of
 * them are required. It is deliberately data rather than code, because the
 * whole point is that adding Trademark Registration tomorrow means adding a
 * definition, not writing another chain of questions.
 *
 * One definition of "qualified" lives here and nowhere else. If that judgement
 * were spread across the runtime, the admin and the lead form, they would
 * disagree, and the disagreement would show up as leads nobody can act on.
 *
 * Pure and browser-safe: the Service Builder validates with the same schema the
 * runtime enforces.
 */

import { z } from "zod";

const trimmed = z.string().trim();

/**
 * Field types, chosen for what each one lets us *do* rather than for what it
 * looks like. `enum` becomes buttons, which is a free, exact answer. `country`
 * and `phone` normalise, so two spellings of one answer are one answer. `text`
 * is the fallback and earns the least.
 */
export const fieldType = z.enum(["text", "enum", "country", "phone", "email"]);

export const qualificationField = z.object({
  /** How the runtime and the lead payload refer to it. */
  key: trimmed.regex(/^[a-z][a-z0-9_]{0,39}$/, "lower_snake_case, starting with a letter"),
  /** The admin-facing name, and the CRM column header. */
  label: trimmed.min(1).max(80),
  /** What the visitor is actually asked. Written as a person would say it. */
  question: trimmed.min(1).max(300),
  type: fieldType,
  /**
   * Required fields are the definition of a qualified lead. Marking something
   * required that people will not answer does not raise lead quality — it stops
   * leads existing, which looks identical in the numbers to having no traffic.
   */
  required: z.boolean().default(true),
  /** `enum` only. */
  options: z.array(trimmed.min(1).max(80)).max(20).default([]),
  /**
   * Ask-me-later weighting. Low numbers first.
   *
   * It exists because order changes the answer rate: asking for a phone number
   * before anything useful has been said is how a conversation ends, so contact
   * fields sit at the back by default.
   */
  order: z.number().int().min(0).max(999).default(50),
});

export const serviceDefinition = z
  .object({
    /** The slug already used by `lib/services.ts` and every public URL. */
    serviceId: trimmed.min(1).max(80),
    name: trimmed.min(1).max(120),
    /** Which team the lead goes to. Read in phase 3; declared here so the
     *  Service Builder collects it from the start. */
    assignTo: trimmed.max(80).nullable().default(null),
    active: z.boolean().default(true),
    fields: z.array(qualificationField).max(30),
  })
  .superRefine((def, ctx) => {
    const keys = new Set<string>();
    for (const field of def.fields) {
      if (keys.has(field.key)) {
        ctx.addIssue({ code: "custom", message: `duplicate field key: ${field.key}`, path: ["fields"] });
      }
      keys.add(field.key);

      if (field.type === "enum" && field.options.length === 0) {
        ctx.addIssue({
          code: "custom",
          message: `field "${field.key}" is a choice with no options`,
          path: ["fields"],
        });
      }
    }
  });

export type FieldType = z.infer<typeof fieldType>;
export type QualificationField = z.infer<typeof qualificationField>;
export type ServiceDefinition = z.infer<typeof serviceDefinition>;

/** Everything collected so far, keyed by field. */
export type Known = Record<string, string>;
