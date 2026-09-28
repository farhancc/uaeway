/**
 * How text matches an answer.
 *
 * Split from `answers.ts` — which owns where answers come from — because the
 * browser runs `triggersMatch` as the visitor types. Importing it from the
 * module that opens a Mongo connection pulls the driver, and `crypto`, into the
 * client bundle, which does not build.
 *
 * Nothing here touches the database or any Node builtin. Keep it that way.
 */

import { phraseMatches, sameWord, tokenize } from "../text";

/** One option an answer offers instead of guessing which case applies. */
export interface AnswerChoice {
  label: string;
  answer_slug: string;
}

export interface Answer {
  id: string;
  slug: string;
  question: string;
  answer_md: string;
  service_slug: string | null;
  keywords: string[];
  /**
   * Exact triggers: every word of ANY group must be present.
   *
   * Different in kind from `keywords`, which is scored and gives up when two
   * answers fit equally well. This one does not weigh anything — if a group
   * matches, that answer is the answer.
   */
  trigger_groups: string[][];
  /** Offered after the answer, when it cannot be answered without knowing more. */
  choices: AnswerChoice[];
  follow_up_slugs: string[];
  is_opener: boolean;
  show_on_page: boolean;
  position: number;
}

/**
 * Whether a piece of text fires an answer's exact triggers.
 *
 * Exported so the browser can run the same check as the visitor types, against
 * the same rules — a hint that appears while typing and then does not happen on
 * send would be worse than no hint.
 *
 * Word comparison is shared with everything else (`sameWord`), so "attest"
 * fires a group written as "attestation". Demanding the exact inflection would
 * make these triggers fire almost never, which is the failure nobody notices.
 */
export function triggersMatch(groups: string[][], words: string[]): boolean {
  if (words.length === 0) return false;

  return groups.some(
    (group) =>
      group.length > 0 &&
      group.every((keyword) => {
        const parts = tokenize(keyword);
        return (
          parts.length > 0 && parts.every((part) => words.some((word) => sameWord(word, part)))
        );
      }),
  );
}

/** Words that carry no matching signal. Kept short on purpose: an aggressive
 *  stopword list starts removing words that matter, like "visa" in some
 *  phrasings of "do I need a visa". */
const NOISE = new Set([
  "a", "an", "the", "is", "are", "was", "were", "do", "does", "did", "can", "could",
  "will", "would", "should", "i", "my", "me", "we", "our", "you", "your", "it",
  "to", "for", "of", "in", "on", "at", "and", "or", "if", "how", "what", "when",
  "where", "why", "who", "which", "much", "many", "need", "get", "have", "has",
  "with", "from", "about", "there", "that", "this", "be", "been", "am",
]);

export function contentWords(text: string): string[] {
  return tokenize(text).filter((w) => !NOISE.has(w));
}

/** A keyword hit is worth more than words merely shared with the question. */
export function score(answer: Answer, words: string[]): { total: number; keywordHits: number } {
  let total = 0;
  let keywordHits = 0;

  for (const keyword of answer.keywords) {
    if (phraseMatches(words, keyword)) {
      keywordHits++;
      total += tokenize(keyword).length * 3 + keyword.length / 10;
    }
  }

  // Overlap with the canonical question, weighted low: it breaks ties between
  // answers whose keywords matched equally, but cannot carry a match alone.
  const question = contentWords(answer.question);
  if (question.length > 0) {
    const shared = question.filter((q) => words.some((w) => phraseMatches([w], q))).length;
    total += (shared / question.length) * 4;
  }

  return { total, keywordHits };
}

/** A keyword phrase must actually match — question-word overlap alone is not
 *  enough to serve a canned answer. */
export const MIN_SCORE = 6;
/** The best match must be clearly ahead of the next one. Two answers scoring
 *  alike means the question was ambiguous, and ambiguity goes to the model. */
export const MIN_MARGIN = 1.5;

export interface Match {
  answer: Answer;
  score: number;
  /** True only when both gates passed and this can be served without a model. */
  confident: boolean;
}
