/**
 * Reading several answers out of one sentence.
 *
 * "I'm from India and I'm currently in Dubai, I need my degree attested for a
 * job" answers four questions. Asking them one at a time anyway is the fastest
 * way to lose someone who has already told us everything.
 *
 * The model's job here is language, not business truth: it reads values out of
 * a sentence and nothing more. It cannot choose the service, cannot mark
 * anything qualified, and cannot set a field to something the field's own
 * validator would reject — every value it returns goes through `acceptValue`,
 * exactly as a typed one does. A field the model guessed wrong is a salesperson
 * calling the wrong number, so extraction earns no special trust.
 */

import { generateJSON } from "../../ai/gemini";
import { acceptValue } from "./engine";
import type { Known, QualificationField } from "./schema";

/** Shorter than this and there is only one fact in it — which the question we
 *  just asked will collect anyway, for free. */
const MIN_WORDS = 5;

function describe(field: QualificationField): string {
  const kind =
    field.type === "enum"
      ? `one of: ${field.options.join(" | ")}`
      : field.type === "country"
        ? "a country name"
        : field.type === "phone"
          ? "a phone number"
          : field.type === "email"
            ? "an email address"
            : "a short phrase";
  return `- ${field.key}: ${field.label} (${kind})`;
}

const PROMPT = `Read the visitor's message and extract only the values it actually states.

Rules:
- Include a key ONLY if the message states it. Never guess, never infer from context.
- Omit anything not stated. An empty object is the correct answer to a message that states nothing.
- Copy values as the visitor gave them. Do not expand abbreviations or tidy spelling.
- Output only JSON, an object with some of these keys.

FIELDS
`;

/**
 * The fields this message states, validated.
 *
 * Returns an empty object for every failure — a model that is down, an
 * unparsable reply, values that do not validate — because the conversation's
 * next step is to ask, which is what it would have done anyway.
 */
export async function extractFields(
  message: string,
  missing: QualificationField[],
): Promise<Known> {
  // Nothing to save: with one field left, the question we are about to ask
  // collects it for nothing.
  if (missing.length < 2) return {};
  if (message.trim().split(/\s+/).filter(Boolean).length < MIN_WORDS) return {};

  const raw = await generateJSON<Record<string, unknown>>(
    `${PROMPT}${missing.map(describe).join("\n")}\n\nMESSAGE\n${message}`,
  );
  if (!raw || typeof raw !== "object") return {};

  const out: Known = {};
  for (const field of missing) {
    const value = raw[field.key];
    if (typeof value !== "string" || !value.trim()) continue;

    // The same gate a typed answer passes. A model that returns "not sure" for
    // a country would otherwise put it on the lead.
    const accepted = acceptValue(field, value);
    if ("value" in accepted) out[field.key] = accepted.value;
  }

  return out;
}
