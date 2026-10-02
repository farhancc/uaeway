/**
 * The vectors a flow matches against, and where they come from.
 *
 * Phrases are embedded **when a flow is published**, never on a visitor's turn.
 * That is the decision that makes this affordable: a turn costs one embedding
 * of what the visitor typed, compared in memory against a few hundred vectors
 * we already had. Embedding the bank per turn would be a few hundred calls to
 * answer one question.
 *
 * The store is content-addressed, so re-publishing a flow whose wording did not
 * change costs nothing, and two intents sharing a phrase share its vector.
 */

import { createHash } from "crypto";
import { embed, EMBED_DIMS, EMBED_MODEL, embedOne } from "../../ai/embed";
import { flowVectorsCollection, isChatDbConfigured } from "../../mongo/chat-db";
import { embeddablePhrases, type FlowDoc } from "./schema";

/** The form a phrase is stored and looked up under, so "Attest my degree" and
 *  "attest my degree" are one entry rather than two embeddings. */
export function normalizePhrase(text: string): string {
  return text.trim().toLowerCase();
}

function keyFor(text: string): string {
  return createHash("sha256")
    .update(`${EMBED_MODEL}:${EMBED_DIMS}:${normalizePhrase(text)}`)
    .digest("hex");
}

export type VectorIndex = Map<string, number[]>;

/**
 * The flow's phrases, with the thing they all have in common taken out.
 *
 * Measured, not assumed: scored raw, every phrase in this bank sits between
 * 0.84 and 0.97 of every other, because they are all short questions in one
 * domain and that shared direction dominates the vector. A margin cannot
 * discriminate inside a band that narrow — see
 * `scripts/calibrate-thresholds.ts`.
 *
 * Subtracting the corpus mean removes "this is a question about UAE document
 * services" and leaves what distinguishes attestation from translation, which
 * is the only part worth comparing. The query is projected through the same
 * mean, or it would be compared against a space it is not in.
 */
export interface VectorSpace {
  phrases: VectorIndex;
  centroid: number[];
}

function unit(values: number[]): number[] {
  let sum = 0;
  for (const v of values) sum += v * v;
  const length = Math.sqrt(sum);
  return length === 0 ? values : values.map((v) => v / length);
}

/** Centres every phrase on the corpus mean and re-normalises, so a dot product
 *  is still a cosine. */
export function buildSpace(index: VectorIndex): VectorSpace {
  const vectors = [...index.values()];
  if (vectors.length === 0) return { phrases: index, centroid: [] };

  const centroid = new Array<number>(vectors[0].length).fill(0);
  for (const vector of vectors) {
    for (let i = 0; i < centroid.length; i++) centroid[i] += vector[i];
  }
  for (let i = 0; i < centroid.length; i++) centroid[i] /= vectors.length;

  const phrases: VectorIndex = new Map();
  for (const [text, vector] of index) {
    phrases.set(text, unit(vector.map((v, i) => v - centroid[i])));
  }

  return { phrases, centroid };
}

/** A query moved into the same space the phrases were put in. */
export function project(space: VectorSpace, vector: number[]): number[] {
  if (space.centroid.length !== vector.length) return vector;
  return unit(vector.map((v, i) => v - space.centroid[i]));
}

/** Whatever is already stored, keyed by the normalised phrase. */
async function readStored(texts: string[]): Promise<VectorIndex> {
  const found: VectorIndex = new Map();
  if (texts.length === 0 || !isChatDbConfigured()) return found;

  const docs = await (await flowVectorsCollection())
    .find({ _id: { $in: texts.map(keyFor) } }, { projection: { text: 1, values: 1 } })
    .toArray();

  for (const doc of docs) found.set(normalizePhrase(doc.text), doc.values);
  return found;
}

/**
 * Every phrase embedded, embedding whatever is missing and storing it.
 *
 * Called at publish time. Returns what it has rather than throwing when the
 * embedding call fails: a flow published during an outage still works, it just
 * matches on the author's keywords until someone publishes again.
 */
export async function ensureVectors(texts: string[]): Promise<VectorIndex> {
  const wanted = [...new Set(texts.map(normalizePhrase))].filter(Boolean);
  const index = await readStored(wanted);

  const missing = wanted.filter((t) => !index.has(t));
  if (missing.length === 0) return index;

  const fresh = await embed(missing);
  if (!fresh) {
    console.warn(`[vectors] could not embed ${missing.length} phrase(s) — keywords only`);
    return index;
  }

  const now = new Date();
  await (await flowVectorsCollection()).bulkWrite(
    missing.map((text, i) => ({
      updateOne: {
        filter: { _id: keyFor(text) },
        update: {
          $setOnInsert: {
            _id: keyFor(text),
            model: EMBED_MODEL,
            dims: EMBED_DIMS,
            text,
            values: fresh[i],
            created_at: now,
          },
        },
        upsert: true,
      },
    })),
    { ordered: false },
  );

  for (let i = 0; i < missing.length; i++) index.set(missing[i], fresh[i]);
  return index;
}

/**
 * Per published version, held for the life of the process.
 *
 * A published version never changes, so there is nothing to invalidate — and
 * the vectors are the one thing here big enough that re-reading them each turn
 * would be the dominant cost of a turn.
 */
const byVersion = new Map<string, VectorSpace>();

export async function vectorsForVersion(versionId: string, doc: FlowDoc): Promise<VectorSpace> {
  const hit = byVersion.get(versionId);
  if (hit) return hit;

  const index = await loadFlowVectors(doc);
  const space = buildSpace(index);
  // A version with nothing embedded is not cached: it usually means the publish
  // happened during an outage, and caching would keep it on keywords until the
  // process restarts.
  if (index.size > 0) byVersion.set(versionId, space);
  return space;
}

/** Everything a published flow needs to match semantically. Read-only: if a
 *  phrase is missing, that intent falls back to its keywords rather than
 *  costing a visitor an embedding call. */
export async function loadFlowVectors(doc: FlowDoc): Promise<VectorIndex> {
  return readStored(embeddablePhrases(doc));
}

/** Embeds a flow's phrases and reports what it managed. Used by publish and by
 *  the migration script. */
export async function embedFlow(doc: FlowDoc): Promise<{ total: number; embedded: number }> {
  const phrases = embeddablePhrases(doc);
  const index = await ensureVectors(phrases);
  return { total: phrases.length, embedded: index.size };
}

/**
 * The visitor's message, embedded — the one embedding on the hot path.
 *
 * Cached in process because the same questions recur within an instance's life,
 * and bounded because most messages are unique and an unbounded map here would
 * be a slow leak rather than a cache.
 */
const QUERY_CACHE_MAX = 500;
const queryCache = new Map<string, number[]>();

export async function embedQuery(message: string): Promise<number[] | null> {
  const key = normalizePhrase(message);
  if (!key) return null;

  const hit = queryCache.get(key);
  if (hit) return hit;

  const vector = await embedOne(key);
  if (!vector) return null;

  // Oldest out first: insertion order is what a Map iterates, so the first key
  // is the least recently added.
  if (queryCache.size >= QUERY_CACHE_MAX) {
    const oldest = queryCache.keys().next().value;
    if (oldest !== undefined) queryCache.delete(oldest);
  }
  queryCache.set(key, vector);
  return vector;
}

/** Test seam. */
export function clearQueryCache(): void {
  queryCache.clear();
}
