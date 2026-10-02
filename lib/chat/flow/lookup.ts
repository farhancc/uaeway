/**
 * Has someone already written this question down?
 *
 * The first thing asked of any typed message, and the cheapest. If what they
 * typed is a phrasing an author listed under "ways people ask it", there is
 * nothing to decide: that is the answer, and no similarity score, no
 * disambiguation call and certainly no model should be able to overrule it.
 *
 * Runs on both sides. The browser uses it as the visitor types, so the hint
 * that appears mid-sentence is produced by the same rule that will run on send
 * — a hint that appears and then does not happen is worse than no hint.
 *
 * Nothing here touches the database, the model or any Node builtin. Keep it
 * that way: the widget imports it.
 */

import { foldText, phraseRun, tokenize } from "../../text";

/**
 * Folded, punctuation dropped, spaces collapsed — so "How much does attestation
 * cost?" and "how much does attestation cost" are one question.
 *
 * Letters and numbers in any script, for the same reason `tokenize` is: the
 * ASCII-only version of this dropped every Arabic and Devanagari character, so
 * two identical Arabic questions normalised to the same empty string and
 * matched everything, or to nothing and matched nothing.
 */
export function normalizeQuestion(text: string): string {
  return foldText(text)
    .replace(/[^\p{L}\p{N}\p{M}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Short phrases are matched whole, never inside a sentence.
 *
 * "visa" appearing somewhere in a paragraph says almost nothing about what the
 * paragraph is asking, and treating it as an exact hit would let a single
 * common word outrank everything below.
 *
 * Measured two ways because a word is not the same size in every language.
 * Arabic attaches its article and its prepositions, so "تصديق الشهادات" —
 * certificate attestation — is two words where the English is three or four. A
 * word count alone made every Arabic phrase of normal length ineligible.
 */
const MIN_RUN_WORDS = 3;
const MIN_RUN_CHARS = 12;

function specificEnough(phrase: string): boolean {
  return tokenize(phrase).length >= MIN_RUN_WORDS || phrase.trim().length >= MIN_RUN_CHARS;
}

/** Whether this message is one of these phrasings, or contains one outright. */
export function phraseHit(message: string, phrases: string[]): boolean {
  const asked = normalizeQuestion(message);
  if (!asked) return false;

  for (const phrase of phrases) {
    if (normalizeQuestion(phrase) === asked) return true;
  }

  const words = tokenize(message);
  for (const phrase of phrases) {
    // `phraseRun` matches adjacent words and shares the inflection rule with
    // everything else here, so "attest my degree" is found inside "how do I
    // attest my degrees".
    if (specificEnough(phrase) && phraseRun(words, phrase)) return true;
  }

  return false;
}

/**
 * The intent whose own words these are, if any.
 *
 * Exact equality across every candidate before containment across any of them:
 * a message that *is* one intent's question should not lose to another intent
 * that happens to have that question buried inside a longer phrase.
 */
export function matchByPhrase(
  message: string,
  candidates: { id: string; name: string; phrases: string[] }[],
): string | null {
  const asked = normalizeQuestion(message);
  if (!asked) return null;

  for (const candidate of candidates) {
    for (const phrase of [candidate.name, ...candidate.phrases]) {
      if (normalizeQuestion(phrase) === asked) return candidate.id;
    }
  }

  const words = tokenize(message);
  for (const candidate of candidates) {
    for (const phrase of [candidate.name, ...candidate.phrases]) {
      if (specificEnough(phrase) && phraseRun(words, phrase)) return candidate.id;
    }
  }

  return null;
}
