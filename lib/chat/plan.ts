import { getAnswer, matchAnswer, matchTriggers, type Answer } from "./answers";
import { renderContext, retrieve } from "./retrieve";
import { MAX_AI_TURNS, type Session } from "./session";
import type { Turn } from "../ai/gemini";

/**
 * How a turn will be answered, decided before anything is streamed.
 *
 * Lives here rather than in the route so it can be tested directly: this is the
 * decision that controls both the bill and whether anyone gets an answer to a
 * question they did not ask.
 */
export type Plan =
  | { kind: "canned"; answer: Answer; viaChip: boolean }
  | { kind: "retired" }
  | { kind: "capped" }
  | { kind: "model"; context: string };

/**
 * Cheapest route first.
 *
 * A tapped suggestion is an exact lookup — no matching, no model. Then the
 * exact triggers, which an author wrote deliberately and which therefore beat
 * anything the scorer might prefer. Then one conservative scored attempt, and
 * anything still ambiguous falls through to the model on purpose: answering the
 * wrong question costs more than the tokens would, because people act on what
 * we tell them about visas.
 */
export async function planReply(
  message: string,
  answerSlug: string | undefined,
  session: Session,
  past: Turn[],
): Promise<Plan> {
  if (answerSlug) {
    const answer = await getAnswer(answerSlug);
    if (answer) return { kind: "canned", answer, viaChip: true };
    // The suggestion pointed at an answer since retired, and nothing was typed
    // alongside it, so there is no question to work with.
    if (!message) return { kind: "retired" };
  }

  // Exact first. Every word of one group present means the author already
  // decided what this question is, and no score should be able to overrule it.
  const triggered = await matchTriggers(message);
  if (triggered) return { kind: "canned", answer: triggered, viaChip: false };

  const matched = await matchAnswer(message);
  if (matched?.confident) return { kind: "canned", answer: matched.answer, viaChip: false };

  if (session.aiTurns >= MAX_AI_TURNS) return { kind: "capped" };

  const recent = past.slice(-2).map((t) => t.text).join(" ");
  const snippets = await retrieve(`${recent} ${message}`.trim());
  return { kind: "model", context: renderContext(snippets) };
}
