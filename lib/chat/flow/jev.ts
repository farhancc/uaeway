/**
 * JEV — choosing between candidates the embedding could not separate.
 *
 * It sits in one place and answers one question: given what they said and a
 * short list of topics we already believe it might be, which one is it? Never
 * free text, never a new topic, never an answer to the visitor. The reply is
 * validated against the list that was offered, so a model that invents an
 * option is treated as having said "none".
 *
 * Reached only on ambiguity. "I need my Indian degree certificate attested"
 * matches attestation outright and never gets here; "I need to make my papers
 * legal for Dubai" is three services at once, which is exactly the call worth
 * paying for.
 */

import { z } from "zod";
import { generateJSON } from "../../ai/gemini";
import type { Intent } from "./schema";

const choice = z.object({
  /** The number of the option, or 0 for none of them. Numbers rather than ids:
   *  an id is a long opaque string a model will happily mistype, and one digit
   *  is the smallest thing it can get wrong. */
  choice: z.number().int().min(0),
});

const PROMPT = `You match a message to one of a numbered list of topics.

Rules:
- Answer with the number of the single best topic.
- Answer 0 if the message is not clearly about any of them.
- Never explain. Never add a topic. Output only JSON: {"choice": <number>}

TOPICS
`;

/**
 * The chosen intent id, or null.
 *
 * Null for every failure — a model that is down, a number out of range, an
 * unparsable reply — because the caller's next step is the fallback either way,
 * and the flow's fallback is a real answer rather than an error.
 */
export async function chooseIntent(message: string, candidates: Intent[]): Promise<string | null> {
  // One candidate is not a choice, and zero is not a question.
  if (candidates.length < 2) return null;

  const list = candidates.map((c, i) => `${i + 1}. ${c.name}`).join("\n");
  const raw = await generateJSON<unknown>(`${PROMPT}${list}\n\nMESSAGE\n${message}`);

  const parsed = choice.safeParse(raw);
  if (!parsed.success) return null;

  const picked = parsed.data.choice;
  if (picked < 1 || picked > candidates.length) return null;

  return candidates[picked - 1].id;
}
