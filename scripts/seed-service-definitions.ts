/**
 * Turns the intake forms already written in code into qualification schemas.
 *
 *   npx tsx --env-file=.env.local scripts/seed-service-definitions.ts
 *
 * `Service.intake` in lib/services.ts has been the right shape all along — a
 * list of fields with a type, a label, whether it is required and its options —
 * it was just only ever rendered as a form. This gives it a second reader.
 *
 * Seeding from it rather than typing the schemas afresh is what makes the two
 * views agree on day one: the questions the chat asks are the questions the
 * form asks, because they are the same list.
 *
 * Idempotent — `saveDefinition` upserts by service, so re-running after editing
 * a service in code brings the definition back in line.
 */

import { SERVICES, type IntakeField } from "../lib/services";
import { saveDefinition } from "../lib/chat/qualify/store";
import type { FieldType, QualificationField } from "../lib/chat/qualify/schema";

const TYPES: Record<IntakeField["type"], FieldType> = {
  text: "text",
  email: "email",
  tel: "phone",
  // A textarea is free text with more room. Nothing downstream treats them
  // differently, and a second type earning no behaviour is a second thing to
  // keep in step.
  textarea: "text",
  select: "enum",
};

/**
 * When to ask for something.
 *
 * Contact details go last, and that is the one ordering decision worth being
 * deliberate about: asking for a phone number before anything useful has been
 * said is how a conversation ends. Everything else keeps the order the form
 * used, which is the order someone already thought about.
 */
const ORDER: Record<string, number> = { name: 70, email: 95, phone: 90 };

/** camelCase in the form, lower_snake in the lead payload and the CRM. */
function toKey(name: string): string {
  return name.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
}

/**
 * A form label becomes a question.
 *
 * Most already are — "What needs translating?" — so they pass through. The bare
 * nouns ("Your name") would read as an instruction in a chat, so they get a
 * sentence around them.
 */
function toQuestion(field: IntakeField): string {
  if (field.label.includes("?")) return field.label;
  return `Could you tell me: ${field.label.toLowerCase()}?`;
}

/**
 * A form's types are about widgets; a conversation's are about meaning.
 *
 * "Country that issued it" is a text input on a form because there is nothing
 * else for it to be — but in a chat it is a country, and typing it as one is
 * what makes "IN", "india" and "Indian" one lead field, and what stops "I need
 * a translation too" being stored as the country someone's degree came from.
 */
function conversationType(field: IntakeField, key: string): FieldType {
  if (TYPES[field.type] !== "text") return TYPES[field.type];
  if (key.includes("country") || key.includes("nationality")) return "country";
  if (key.includes("email")) return "email";
  if (key.includes("phone") || key.includes("mobile") || key.includes("whatsapp")) return "phone";
  return "text";
}

function toField(field: IntakeField, index: number): QualificationField {
  const key = toKey(field.name);
  return {
    key,
    label: field.label,
    question: toQuestion(field),
    type: conversationType(field, key),
    required: field.required,
    options: field.options ?? [],
    order: ORDER[key] ?? (index + 1) * 10,
  };
}

async function main(): Promise<void> {
  for (const service of SERVICES) {
    const fields = service.intake.map(toField);
    const def = await saveDefinition({
      serviceId: service.slug,
      name: service.name,
      assignTo: null,
      active: true,
      fields,
    });

    const required = def.fields.filter((f) => f.required).length;
    console.log(
      `${def.serviceId.padEnd(26)} ${def.fields.length} fields, ${required} required` +
        ` — asks: ${def.fields
          .filter((f) => f.required)
          .sort((a, b) => a.order - b.order)
          .map((f) => f.key)
          .join(" → ")}`,
    );
  }

  console.log(`\n${SERVICES.length} service definitions seeded.`);
}

main()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => process.exit());
