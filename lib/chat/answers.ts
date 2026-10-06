/**
 * The canned answer bank.
 *
 * Loading it once per server instance and matching in process is deliberate:
 * there are tens of answers, so a database round trip per turn would cost more
 * than the match. The TTL means an edit in the admin shows up within a minute
 * without a deploy or a restart.
 */

import { randomUUID } from "crypto";
import { tokenize } from "../text";
import { answersCollection, isChatDbConfigured, type AnswerDoc } from "../mongo/chat-db";
import {
  anyKeywordMatches,
  contentWords,
  MIN_MARGIN,
  MIN_SCORE,
  score,
  triggersMatch,
  type Answer,
  type Match,
} from "./matching";

// The matching rules live in ./matching so the browser can run them without
// pulling the Mongo driver. Re-exported here because this module is the answer
// bank's public face, and every caller already imports these from it.
export type { Answer, AnswerChoice, Match } from "./matching";
export { anyKeywordMatches, triggersMatch } from "./matching";

/** Everything the matcher and both surfaces need. `active`, `created_at` and
 *  `updated_at` are deliberately absent: nothing downstream reads them, and the
 *  bank is loaded on every turn. */
const FIELDS = {
  slug: 1,
  question: 1,
  answer_md: 1,
  service_slug: 1,
  keywords: 1,
  trigger_groups: 1,
  any_keywords: 1,
  choices: 1,
  follow_up_slugs: 1,
  is_opener: 1,
  show_on_page: 1,
  position: 1,
} as const;

const TTL_MS = 60_000;

let cache: { at: number; answers: Answer[] } | null = null;

/**
 * One document to the shape the rest of the app uses.
 *
 * `_id` becomes `id` because that is the name the admin form and its routes
 * already use, and the arrays are defaulted because a document written before a
 * field existed simply will not have it — there is no schema here to backfill
 * one in, the way `alter table … default` did.
 */
function toAnswer(doc: Partial<AnswerDoc> & { _id: string }): Answer {
  return {
    id: doc._id,
    slug: doc.slug ?? "",
    question: doc.question ?? "",
    answer_md: doc.answer_md ?? "",
    service_slug: doc.service_slug ?? null,
    keywords: doc.keywords ?? [],
    trigger_groups: doc.trigger_groups ?? [],
    any_keywords: doc.any_keywords ?? [],
    choices: doc.choices ?? [],
    follow_up_slugs: doc.follow_up_slugs ?? [],
    is_opener: doc.is_opener ?? false,
    show_on_page: doc.show_on_page ?? true,
    position: doc.position ?? 0,
  };
}

/** Every active answer, cached briefly. Returns [] when the database is not
 *  configured, so the chatbot degrades to model-only rather than failing. */
export async function loadAnswers(): Promise<Answer[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.answers;
  if (!isChatDbConfigured()) return [];

  try {
    const docs = await (await answersCollection())
      .find({ active: true }, { projection: FIELDS })
      .sort({ position: 1 })
      .toArray();

    cache = { at: Date.now(), answers: docs.map(toAnswer) };
    return cache.answers;
  } catch (err) {
    console.warn(`[answers] could not load: ${(err as Error).message}`);
    // Serve a stale bank rather than nothing if we ever had one.
    return cache?.answers ?? [];
  }
}

/** Test seam and a way for the admin to publish an edit immediately. */
export function clearAnswerCache(): void {
  cache = null;
}

export async function getAnswer(slug: string): Promise<Answer | null> {
  return (await loadAnswers()).find((a) => a.slug === slug) ?? null;
}

/**
 * The exact match, tried before the scored one.
 *
 * An author who wrote a trigger meant it, so it beats anything the scorer might
 * have preferred. Order among answers is `position`, which is already the order
 * loadAnswers returns.
 *
 * Two passes, and the order between them is the point. Every answer's ALL
 * category is tried before any answer's ANY category, so a twenty-keyword list
 * that matches is never beaten by an earlier answer that merely shares one
 * word. Within a pass it is still `position` that decides.
 */
export async function matchTriggers(text: string): Promise<Answer | null> {
  const answers = await loadAnswers();
  if (answers.length === 0) return null;

  // Every word, not just content words: a trigger of "in" or "to" is a
  // deliberate choice by whoever wrote it, and the noise list would eat it.
  const words = tokenize(text);

  return (
    answers.find((a) => triggersMatch(a.trigger_groups ?? [], words)) ??
    answers.find((a) => anyKeywordMatches(a.any_keywords ?? [], words)) ??
    null
  );
}

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

// ── Authoring ──────────────────────────────────────────────────────────────
// The admin's side of the same collection. It lives here rather than next to the
// forms so that `_id` ↔ `id` and the field defaults are written once: a second
// mapping is how a "choices" edit silently stops reaching the matcher.

/** Everything an author can set. The slug is not here: it is the identity a
 *  suggestion chip refers to, assigned once at creation and never edited. */
export type AnswerFields = Omit<Answer, "id" | "slug"> & { active: boolean };

/** One row of /admin/answers — including retired answers, which the list shows
 *  so they can be brought back. */
export interface AnswerListing extends Answer {
  active: boolean;
}

export async function listAnswers(): Promise<AnswerListing[]> {
  const docs = await (await answersCollection())
    .find({}, { projection: { ...FIELDS, active: 1 } })
    // Live answers first, then grouped by service in author order. Answers with
    // no service sort to the front of the group rather than the end, which is
    // the one place this list reads differently than it did on Postgres.
    .sort({ active: -1, service_slug: 1, position: 1 })
    .toArray();

  return docs.map((doc) => ({ ...toAnswer(doc), active: doc.active ?? false }));
}

/** The active answers an author can point a follow-up or a choice at. */
export async function answerOptions(
  excludeId?: string,
): Promise<{ slug: string; question: string; service_slug: string | null }[]> {
  const docs = await (await answersCollection())
    .find(
      { active: true, ...(excludeId ? { _id: { $ne: excludeId } } : {}) },
      { projection: { slug: 1, question: 1, service_slug: 1 } },
    )
    .sort({ question: 1 })
    .toArray();

  return docs.map((d) => ({
    slug: d.slug,
    question: d.question,
    service_slug: d.service_slug ?? null,
  }));
}

export async function answerById(id: string): Promise<AnswerListing | null> {
  const doc = await (await answersCollection()).findOne({ _id: id });
  return doc ? { ...toAnswer(doc), active: doc.active ?? false } : null;
}

/** Every slug in the bank, live or retired. Used to check that a choice points
 *  somewhere real, and to allocate a new slug that is not taken. */
export async function answerSlugs(): Promise<string[]> {
  const docs = await (await answersCollection())
    .find({}, { projection: { slug: 1 } })
    .toArray();
  return docs.map((d) => d.slug);
}

/** Thrown when the slug is already in the bank. The caller turns it into
 *  something an author can act on. */
export class SlugTaken extends Error {}

export async function insertAnswer(slug: string, fields: AnswerFields): Promise<void> {
  const now = new Date();
  try {
    await (await answersCollection()).insertOne({
      _id: randomUUID(),
      slug,
      ...fields,
      created_at: now,
      updated_at: now,
    });
  } catch (err) {
    if ((err as { code?: number }).code === 11000) throw new SlugTaken();
    throw err;
  }
}

/** Any subset of an answer's fields. The two toggles in the list view set one
 *  field each; the form sets them all. */
export async function patchAnswer(id: string, fields: Partial<AnswerFields>): Promise<void> {
  await (await answersCollection()).updateOne(
    { _id: id },
    { $set: { ...fields, updated_at: new Date() } },
  );
}
