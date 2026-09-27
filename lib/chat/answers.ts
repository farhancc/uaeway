/**
 * The canned answer bank.
 *
 * Loading it once per server instance and matching in process is deliberate:
 * there are tens of answers, so a database round trip per turn would cost more
 * than the match. The TTL means an edit in the admin shows up within a minute
 * without a deploy or a restart.
 */

import { phraseMatches, tokenize } from "../text";
import { isPublicDbConfigured, supabasePublic } from "../supabase/public";

export interface Answer {
  id: string;
  slug: string;
  question: string;
  answer_md: string;
  service_slug: string | null;
  keywords: string[];
  follow_up_slugs: string[];
  is_opener: boolean;
  show_on_page: boolean;
  position: number;
}

const FIELDS =
  "id, slug, question, answer_md, service_slug, keywords, follow_up_slugs, is_opener, show_on_page, position";

const TTL_MS = 60_000;

let cache: { at: number; answers: Answer[] } | null = null;

/** Every active answer, cached briefly. Returns [] when the database is not
 *  configured, so the chatbot degrades to model-only rather than failing. */
export async function loadAnswers(): Promise<Answer[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.answers;
  if (!isPublicDbConfigured()) return [];

  const { data, error } = await supabasePublic()
    .from("answers")
    .select(FIELDS)
    .eq("active", true)
    .order("position");

  if (error) {
    console.warn(`[answers] could not load: ${error.message}`);
    // Serve a stale bank rather than nothing if we ever had one.
    return cache?.answers ?? [];
  }

  cache = { at: Date.now(), answers: (data ?? []) as Answer[] };
  return cache.answers;
}

/** Test seam and a way for the admin to publish an edit immediately. */
export function clearAnswerCache(): void {
  cache = null;
}

export async function getAnswer(slug: string): Promise<Answer | null> {
  return (await loadAnswers()).find((a) => a.slug === slug) ?? null;
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

function contentWords(text: string): string[] {
  return tokenize(text).filter((w) => !NOISE.has(w));
}

/** A keyword hit is worth more than words merely shared with the question. */
function score(answer: Answer, words: string[]): { total: number; keywordHits: number } {
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
const MIN_SCORE = 6;
/** The best match must be clearly ahead of the next one. Two answers scoring
 *  alike means the question was ambiguous, and ambiguity goes to the model. */
const MIN_MARGIN = 1.5;

export interface Match {
  answer: Answer;
  score: number;
  /** True only when both gates passed and this can be served without a model. */
  confident: boolean;
}

/**
 * The canned answer for a typed question, if we are sure enough.
 *
 * Deliberately conservative. Answering a question the visitor did not ask is
 * worse than paying for the turn: on visa and fee topics people act on what we
 * say, and being confidently wrong costs more than Gemini does.
 */
export async function matchAnswer(text: string): Promise<Match | null> {
  const answers = await loadAnswers();
  if (answers.length === 0) return null;

  const words = contentWords(text);
  if (words.length === 0) return null;

  const ranked = answers
    .map((answer) => ({ answer, ...score(answer, words) }))
    .filter((r) => r.keywordHits > 0)
    .sort((a, b) => b.total - a.total);

  const best = ranked[0];
  if (!best) return null;

  const runnerUp = ranked[1];
  const clear = !runnerUp || best.total >= runnerUp.total * MIN_MARGIN;

  return {
    answer: best.answer,
    score: best.total,
    confident: best.total >= MIN_SCORE && clear,
  };
}

/** Answers shown on a service page's FAQ block, in order. */
export async function answersForService(serviceSlug: string): Promise<Answer[]> {
  return (await loadAnswers())
    .filter((a) => a.service_slug === serviceSlug && a.show_on_page)
    .sort((a, b) => a.position - b.position);
}
