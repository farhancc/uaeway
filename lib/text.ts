/**
 * Word matching shared by everything that maps a visitor's phrasing onto our
 * own vocabulary — the service matcher and the canned answer bank.
 *
 * Extracted from lib/services.ts when the answer bank needed the same rules.
 * One definition matters here: if the two matchers disagreed about whether
 * "attest" and "attestation" are the same word, the chatbot would route a
 * question to one service and answer it from another.
 */

/** Words in a piece of text, lowercased. */
export function tokenize(text: string): string[] {
  return text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

/**
 * Whether two words are the same word for matching purposes.
 *
 * People type "translate my degree", not "legal translation", so exact equality
 * misses most real questions. Comparing on a shared prefix catches the
 * inflections that matter — translate/translation, attest/attestation,
 * notary/notarised — while staying tight enough to keep visa/visit and
 * company/compare apart. Short words must match exactly, so "cv" never matches
 * "cvs" by accident.
 */
export function sameWord(a: string, b: string): boolean {
  if (a.length < 4 || b.length < 4) return a === b;

  const n = Math.min(a.length, b.length);
  let shared = 0;
  while (shared < n && a[shared] === b[shared]) shared++;
  return shared >= Math.min(5, n);
}

/** True when every word of `phrase` appears somewhere in `words`. */
export function phraseMatches(words: string[], phrase: string): boolean {
  const parts = tokenize(phrase);
  if (parts.length === 0) return false;
  return parts.every((part) => words.some((word) => sameWord(word, part)));
}
