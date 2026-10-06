/**
 * Deciding which intent a typed message is.
 *
 * This is the module the whole change is about. Today it matches on keywords —
 * the same rules the answer bank used, so the flow starts at parity rather than
 * at a guess. Phase two adds an embedding matcher beside it, and the keyword one
 * stays as the fallback for when no embedding key is usable.
 *
 * Both produce the same `MatchIntent`, and `run.ts` never learns which it got.
 */

import { contentWords, MIN_MARGIN, MIN_SCORE, score, triggersMatch } from "../matching";
import { tokenize } from "../../text";
import { matchByPhrase } from "./lookup";
import { similarity } from "../../ai/embed";
import { normalizePhrase, type VectorIndex } from "./vectors";
import type { Intent } from "./schema";
import type { MatchIntent } from "./run";

/**
 * The exact pass: an author's own keyword groups.
 *
 * Every word of a group must be present, exactly as `trigger_groups` worked.
 * Where the old bank ran two ordered passes — all the multi-word lists before
 * any of the single-word ones — this ranks by how many words matched, which
 * says the same thing more directly: a five-word group that matched has
 * established far more about the question than "visa" appearing once, so it
 * wins wherever both fire.
 *
 * Ties go to the earlier candidate, and candidates arrive in edge order, so it
 * is the author's ordering that breaks them.
 */
export function matchByKeywords(message: string, candidates: Intent[]): string | null {
  const words = tokenize(message);
  if (words.length === 0) return null;

  let best: { id: string; weight: number } | null = null;

  for (const intent of candidates) {
    for (const group of intent.hintKeywords) {
      if (group.length === 0) continue;
      if (!triggersMatch([group], words)) continue;
      if (!best || group.length > best.weight) best = { id: intent.id, weight: group.length };
    }
  }

  return best?.id ?? null;
}

/**
 * The scored pass, for when no group fired.
 *
 * Reuses `score` from the answer bank unchanged — an intent's `phrases` are
 * scored as an answer's `keywords` were, and its `name` as the canonical
 * question. Keeping one scorer matters: two would drift, and the drift would
 * show up as the bot routing a question to one branch and answering it from
 * another.
 *
 * Both of the old gates survive, and they are the reason this is conservative
 * rather than eager. A match must clear `MIN_SCORE`, and it must beat the
 * runner-up by `MIN_MARGIN` — two intents scoring alike means the question was
 * ambiguous, and ambiguity belongs on the fallback edge, not in an answer about
 * someone's visa.
 */
export function matchByScore(message: string, candidates: Intent[]): string | null {
  const words = contentWords(message);
  if (words.length === 0) return null;

  const ranked = candidates
    .map((intent) => ({
      id: intent.id,
      ...score({ keywords: intent.phrases, question: intent.name }, words),
    }))
    .filter((r) => r.keywordHits > 0)
    .sort((a, b) => b.total - a.total);

  const best = ranked[0];
  if (!best || best.total < MIN_SCORE) return null;

  const runnerUp = ranked[1];
  return !runnerUp || best.total >= runnerUp.total * MIN_MARGIN ? best.id : null;
}

/**
 * The matcher used when a flow has no vectors — and the tail of the one that
 * does.
 *
 * Written-down question first, then exact keywords, then scored. Everything an
 * author stated outright comes before anything weighed, because a phrasing
 * someone listed under "ways people ask it" is a decision about what that
 * question means.
 */
export const keywordMatcher: MatchIntent = (message, candidates) => {
  if (candidates.length === 0) return null;
  return (
    matchByPhrase(message, candidates) ??
    matchByKeywords(message, candidates) ??
    matchByScore(message, candidates)
  );
};

/* ── Meaning ─────────────────────────────────────────────────────────────── */

/**
 * How close a match has to be to be taken at all.
 *
 * Calibrated against the recorded transcripts and every question in the bank —
 * see `scripts/calibrate-thresholds.ts`, which is the only honest way to pick
 * these. A number chosen by intuition either answers the wrong question or
 * never fires, and both look like "the chatbot is a bit stupid".
 */
export const SIMILARITY_FLOOR = Number(process.env.CHAT_SIMILARITY_FLOOR ?? 0.4);

/**
 * How far ahead of the runner-up the best match must be.
 *
 * The same discipline as the old scored matcher's `MIN_MARGIN`, in the units
 * cosine works in: two intents scoring alike means the question was ambiguous,
 * and on fees and visas answering the wrong one costs more than asking.
 */
export const SIMILARITY_MARGIN = Number(process.env.CHAT_SIMILARITY_MARGIN ?? 0.1);

/** Below this, a close second is not a real candidate — it is two bad matches
 *  that happen to be equally bad, which is not ambiguity worth resolving. */
export const AMBIGUITY_FLOOR = 0.35;

export interface Ranked {
  id: string;
  score: number;
}

/**
 * Candidates by how close they are, best first.
 *
 * An intent scores as its *closest* phrase, not its average: phrases are
 * alternative ways of asking the same thing, so one of them landing is the
 * whole point. Averaging would punish an intent for being thoroughly authored.
 */
export function rankIntents(query: number[], candidates: Intent[], phrases: VectorIndex): Ranked[] {
  const ranked: Ranked[] = [];

  for (const intent of candidates) {
    let best = -1;
    for (const phrase of [intent.name, ...intent.phrases]) {
      const vector = phrases.get(normalizePhrase(phrase));
      if (!vector) continue;
      const score = similarity(query, vector);
      if (score > best) best = score;
    }
    // No vector for any phrase — unpublished, or embedded during an outage.
    // Left out rather than scored zero, so it falls to its keywords instead of
    // being ranked below things it should beat.
    if (best > -1) ranked.push({ id: intent.id, score: best });
  }

  return ranked.sort((a, b) => b.score - a.score);
}

/** The winner, or null when nothing is close enough or two things are equally
 *  close. */
export function matchByEmbedding(
  query: number[],
  candidates: Intent[],
  phrases: VectorIndex,
): string | null {
  const ranked = rankIntents(query, candidates, phrases);
  const best = ranked[0];
  if (!best || best.score < SIMILARITY_FLOOR) return null;

  const runnerUp = ranked[1];
  return !runnerUp || best.score - runnerUp.score >= SIMILARITY_MARGIN ? best.id : null;
}

/**
 * Two or more candidates the embedding cannot choose between.
 *
 * This is what JEV is for: "I need to make my papers legal for Dubai" is a real
 * sentence that means translation, attestation or notarisation, and the right
 * answer is to decide between those three rather than to hand the whole
 * question to a model with no list.
 */
export function ambiguousIntents(ranked: Ranked[]): Ranked[] {
  const best = ranked[0];
  if (!best || best.score < AMBIGUITY_FLOOR) return [];
  if (best.score >= SIMILARITY_FLOOR && (!ranked[1] || best.score - ranked[1].score >= SIMILARITY_MARGIN)) {
    return [];
  }
  return ranked.filter((r) => best.score - r.score < SIMILARITY_MARGIN * 3).slice(0, 4);
}

/**
 * The matcher the runtime uses once a flow has been published with vectors.
 *
 * Exact keywords still win, and that is not a leftover: a group an author wrote
 * is a decision about what a question means, and no similarity score should be
 * able to overrule it.
 *
 * `decided` is an intent JEV already chose for this turn. It is honoured
 * wherever it is a candidate, so the call made once at the start of the turn is
 * not re-litigated at every node.
 */
export function semanticMatcher(opts: {
  query: number[] | null;
  phrases: VectorIndex;
  decided?: string | null;
}): MatchIntent {
  return (message, candidates) => {
    if (candidates.length === 0) return null;

    // Someone already wrote this question down. Nothing below this line — not a
    // similarity score, not a disambiguation call, and certainly not a model —
    // should be able to answer it differently.
    const written = matchByPhrase(message, candidates);
    if (written) return written;

    const exact = matchByKeywords(message, candidates);
    if (exact) return exact;

    if (opts.decided && candidates.some((c) => c.id === opts.decided)) return opts.decided;

    // No vector for the message means the embedding call failed this turn. Fall
    // back to the keyword scorer rather than to nothing: it is what answered
    // every question here until now.
    if (!opts.query) return matchByScore(message, candidates);

    return matchByEmbedding(opts.query, candidates, opts.phrases) ?? matchByScore(message, candidates);
  };
}
