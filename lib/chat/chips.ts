/**
 * Suggested questions.
 *
 * These are the main cost lever, not decoration. A tapped chip is an exact
 * lookup by slug — no matching, no ambiguity, no model call — so offering good
 * follow-ups after *every* reply is what makes a whole conversation free rather
 * than only its opening.
 */

import { loadAnswers, type Answer } from "./answers";
import { matchServices } from "../services";

export interface Chip {
  slug: string;
  question: string;
}

const MAX_CHIPS = 3;

function toChips(answers: Answer[], used: Set<string>, limit: number): Chip[] {
  return answers
    .filter((a) => !used.has(a.slug))
    .slice(0, limit)
    .map((a) => ({ slug: a.slug, question: a.question }));
}

/** What the chat offers before anyone has said anything. */
export async function openerChips(limit = 4): Promise<Chip[]> {
  const answers = await loadAnswers();
  return toChips(
    answers.filter((a) => a.is_opener).sort((a, b) => a.position - b.position),
    new Set(),
    limit,
  );
}

/**
 * What to offer after a reply, in order of how well it fits.
 *
 * After a canned answer, its own follow-ups — the author decided what someone
 * asking this would want next. Then other questions about whichever service the
 * exchange was about. Then the openers, so a reply is never a dead end.
 *
 * That last step is the one that pays. A reply with no suggestions leaves the
 * visitor nothing to do but type, and a typed question is the only thing here
 * that can reach the model — so an empty chip row is what a model call looks
 * like one turn before we pay for it. "Tell me about camel racing" used to end
 * the free path entirely.
 *
 * Never a question already answered in this conversation.
 */
export async function nextChips(
  opts: { answered?: Answer | null; text?: string; used: Set<string> },
  limit = MAX_CHIPS,
): Promise<Chip[]> {
  const answers = await loadAnswers();
  if (answers.length === 0) return [];

  const bySlug = new Map(answers.map((a) => [a.slug, a]));
  const chips: Chip[] = [];
  const taken = new Set(opts.used);

  if (opts.answered) {
    taken.add(opts.answered.slug);
    for (const slug of opts.answered.follow_up_slugs) {
      const answer = bySlug.get(slug);
      if (answer && !taken.has(slug)) {
        chips.push({ slug: answer.slug, question: answer.question });
        taken.add(slug);
      }
      if (chips.length >= limit) return chips;
    }
  }

  // The service the exchange is about, so a model answer still leads somewhere
  // free.
  const topic = opts.answered?.service_slug ?? matchServices(opts.text ?? "", 1)[0]?.slug;
  if (topic) {
    const onTopic = toChips(
      answers.filter((a) => a.service_slug === topic).sort((a, b) => a.position - b.position),
      taken,
      limit - chips.length,
    );
    chips.push(...onTopic);
    for (const c of onTopic) taken.add(c.slug);
  }

  // Backstop: the openers. They are the questions we chose as worth asking
  // cold, so they are the right thing to offer when we have nothing better.
  if (chips.length < limit) {
    chips.push(
      ...toChips(
        answers.filter((a) => a.is_opener).sort((a, b) => a.position - b.position),
        taken,
        limit - chips.length,
      ),
    );
  }

  return chips.slice(0, limit);
}
