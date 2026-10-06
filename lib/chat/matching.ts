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

import { phraseMatches, phraseRun, tokenize } from "../text";

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
  /**
   * The other exact category: ANY ONE of these being present is enough.
   *
   * Separate from `trigger_groups` rather than expressed as a list of
   * one-keyword groups, because the two are written and reasoned about
   * separately — "all twenty of these" and "any one of these twenty" are
   * different questions about a question, and an author editing one should not
   * have to read the other to know what they are changing.
   */
  any_keywords: string[];
  /** Offered after the answer, when it cannot be answered without knowing more. */
  choices: AnswerChoice[];
  follow_up_slugs: string[];
  is_opener: boolean;
  show_on_page: boolean;
  position: number;
}

/**
 * Whether one keyword is present.
 *
 * A keyword with a space in it is a phrase and must appear as one — see
 * `phraseRun`. Word comparison is shared with everything else (`sameWord`), so
 * "attest" matches a keyword written as "attestation". Demanding the exact
 * inflection would make these fire almost never, which is the failure nobody
 * notices.
 */
function keywordPresent(keyword: string, words: string[]): boolean {
  return phraseRun(words, keyword);
}

/**
 * The ALL category: every keyword of ANY ONE group must be present.
 *
 * Exported so the browser can run the same check as the visitor types, against
 * the same rules — a hint that appears while typing and then does not happen on
 * send would be worse than no hint.
 */
export function triggersMatch(groups: string[][], words: string[]): boolean {
  if (words.length === 0) return false;

  return groups.some(
    (group) => group.length > 0 && group.every((keyword) => keywordPresent(keyword, words)),
  );
}

/**
 * The ANY category: one keyword present is enough.
 *
 * Deliberately the weaker of the two, and checked second everywhere, because a
 * single word is thin evidence of what someone meant. A twenty-keyword ALL list
 * that matches has established far more about the question than "visa"
 * appearing once, and on fee and visa topics answering the wrong question costs
 * more than the model call it saved.
 */
export function anyKeywordMatches(keywords: string[], words: string[]): boolean {
  if (words.length === 0) return false;

  return keywords.some((keyword) => keyword.trim().length > 0 && keywordPresent(keyword, words));
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

/**
 * A keyword hit is worth more than words merely shared with the question.
 *
 * Takes the two fields it reads rather than a whole `Answer`, so the flow's
 * intents — which carry the same pair under different names — are scored by
 * this function instead of a second copy of it. An `Answer` still satisfies it
 * structurally, so nothing in the answer bank changed.
 */
export function score(
  answer: { keywords: string[]; question: string },
  words: string[],
): { total: number; keywordHits: number } {
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
