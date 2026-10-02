/**
 * Word matching shared by everything that maps a visitor's phrasing onto our
 * own vocabulary — the service matcher and the canned answer bank.
 *
 * Extracted from lib/services.ts when the answer bank needed the same rules.
 * One definition matters here: if the two matchers disagreed about whether
 * "attest" and "attestation" are the same word, the chatbot would route a
 * question to one service and answer it from another.
 */

/**
 * Decoration rather than letters: Arabic short vowels, the superscript alef,
 * and tatweel — the character that stretches a word for justification.
 *
 * Stripped because they are optional in writing and almost nobody types them,
 * so a question written with them would otherwise never match the same question
 * written without. Combining marks are *not* stripped generally: in Devanagari
 * and Malayalam the matras carry vowels, and removing them would merge words
 * that mean different things.
 */
const ARABIC_DECORATION = /[\u064B-\u0652\u0670\u0640]/g;

/**
 * One text, in the form everything here compares against.
 *
 * `NFC` matters as much as the lowercasing: the same Malayalam or Arabic word
 * can arrive composed or decomposed depending on the keyboard, and two
 * spellings of one string are two strings to every comparison below.
 */
export function foldText(text: string): string {
  return text.normalize("NFC").toLowerCase().replace(ARABIC_DECORATION, "");
}

/**
 * Words in a piece of text, folded.
 *
 * Split on anything that is not a letter or a number *in any script*. This used
 * to split on `[^a-z0-9]`, which quietly made every non-Latin message tokenize
 * to nothing at all — Arabic, Hindi, Urdu and Malayalam all came out as an
 * empty array, so phrase lookup, keyword groups and the hint that appears while
 * someone types matched nothing and reported no error.
 *
 * Scripts that do not put spaces between words — Chinese, Japanese, Thai —
 * still come out as one long token. Handling those needs a segmenter, and none
 * of them are languages this site serves.
 */
export function tokenize(text: string): string[] {
  return foldText(text)
    // `\p{M}` is not decoration here — it is half the word. In Devanagari and
    // Malayalam the matras and the virama are combining marks, so splitting on
    // them tore "प्रमाणपत्र" into five fragments and "സർട്ടിഫിക്കറ്റ്" into six.
    .split(/[^\p{L}\p{N}\p{M}]+/u)
    .filter(Boolean);
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
 *
 * The prefix rule is an English assumption, and a weak one elsewhere: Arabic
 * builds words from a root with prefixes attached, so a shared opening says
 * less there than it does here. It degrades to near-exact matching rather than
 * to nonsense, which is the safe direction — but a language that needs better
 * than that needs its own rule, not a wider prefix.
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

/**
 * Whether `phrase` appears in `words` as a run of adjacent words.
 *
 * The difference from `phraseMatches` is the whole point of a keyword with a
 * space in it. "golden visa" written as a trigger means the thing called a
 * golden visa, so it must not fire on "is my visa golden or blue" — both words
 * are there, and the question is about something else entirely.
 *
 * Punctuation between the words is fine: `tokenize` has already removed it, so
 * "golden-visa" and "golden, visa" both read as adjacent.
 */
export function phraseRun(words: string[], phrase: string): boolean {
  const parts = tokenize(phrase);
  if (parts.length === 0) return false;

  for (let i = 0; i + parts.length <= words.length; i++) {
    if (parts.every((part, j) => sameWord(words[i + j], part))) return true;
  }
  return false;
}

/**
 * Whether this is a question rather than an answer to one.
 *
 * It exists because of a real failure: asked "which country issued it?", a
 * visitor typed "what is the cost for attestation" — and that was stored as
 * their country, which completed the qualification and produced a lead saying
 * the degree was issued in "What Is The Cost For Attestation".
 *
 * A heuristic, deliberately. The alternative is a model call on every answer to
 * a question we already know the shape of, which would cost more than it saves
 * and fail differently. It errs toward treating something as a question: being
 * diverted to an answer you did not want costs a turn, while a swallowed
 * question costs the lead.
 */
const QUESTION_WORDS = new Set([
  "what", "how", "why", "when", "where", "who", "which", "whose",
  "can", "could", "do", "does", "did", "is", "are", "was", "will",
  "would", "should", "any", "tell", "explain",
]);

export function looksLikeQuestion(text: string): boolean {
  if (text.includes("?")) return true;

  const words = tokenize(text);
  if (words.length === 0) return false;
  if (QUESTION_WORDS.has(words[0])) return true;

  // Nobody answers "which country issued it?" in eight words. The fields this
  // guards are short by nature — a country, a name, a phone number, one of a
  // list — so length on its own is evidence.
  return words.length > 6;
}
