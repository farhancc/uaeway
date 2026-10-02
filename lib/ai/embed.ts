/**
 * Turning text into a vector, so "do I have to get my degree stamped in India
 * first" can find an answer about attestation that nobody thought to list that
 * phrasing under.
 *
 * Goes through `postModel` in ./gemini.ts, which means the same key pool, the
 * same failure classification and the same benching as every other call. A dead
 * key is learned about in one place.
 *
 * Everything here returns null rather than throwing. Matching must degrade to
 * the author's keywords when embeddings are unavailable — a chatbot that stops
 * answering because an embedding endpoint is down is worse than one matching
 * slightly less well.
 */

import { postModel } from "./gemini";

export const EMBED_MODEL = process.env.GEMINI_EMBED_MODEL || "gemini-embedding-001";

/**
 * 768 rather than the full 3072.
 *
 * The whole flow's vectors are held in memory and compared on every typed turn,
 * so size is a running cost: 3072 would be four times the memory and four times
 * the arithmetic for a difference this corpus — a few hundred short English
 * questions — will not show. The model is trained so a truncated prefix is
 * still a usable embedding.
 */
export const EMBED_DIMS = 768;

/**
 * Both sides of this comparison are short texts of the same kind: what someone
 * typed, and a phrasing an author wrote. That is symmetric similarity, not a
 * query against a document, so both are embedded the same way — using
 * RETRIEVAL_QUERY on one side and RETRIEVAL_DOCUMENT on the other would put
 * them in deliberately different parts of the space.
 */
const TASK_TYPE = "SEMANTIC_SIMILARITY";

/** The API caps a batch; anything longer is sent as several. */
const BATCH = 100;

interface EmbedResponse {
  embeddings?: { values?: number[] }[];
}

/**
 * Unit length, so cosine similarity is a dot product.
 *
 * Required, not an optimisation: Gemini only returns normalised vectors at the
 * full 3072 dimensions. Every truncated output — which is what we ask for — has
 * to be normalised by the caller, and skipping it makes similarity scale with
 * the length of the text rather than its meaning.
 */
function normalize(values: number[]): number[] {
  let sum = 0;
  for (const v of values) sum += v * v;
  const length = Math.sqrt(sum);
  if (length === 0) return values;
  return values.map((v) => v / length);
}

async function embedBatch(texts: string[]): Promise<number[][] | null> {
  const res = await postModel(`${EMBED_MODEL}:batchEmbedContents`, {
    requests: texts.map((text) => ({
      model: `models/${EMBED_MODEL}`,
      content: { parts: [{ text }] },
      taskType: TASK_TYPE,
      outputDimensionality: EMBED_DIMS,
    })),
  });
  if (!res) return null;

  const data = (await res.json()) as EmbedResponse;
  const embeddings = data.embeddings;

  // A short batch would silently misalign text with vector, which is the kind
  // of fault that shows up as the chatbot confidently answering the wrong
  // question rather than as an error.
  if (!embeddings || embeddings.length !== texts.length) {
    console.warn(`[embed] expected ${texts.length} vectors, got ${embeddings?.length ?? 0}`);
    return null;
  }

  const out: number[][] = [];
  for (const embedding of embeddings) {
    if (!embedding.values || embedding.values.length !== EMBED_DIMS) {
      console.warn("[embed] a vector came back the wrong size");
      return null;
    }
    out.push(normalize(embedding.values));
  }
  return out;
}

/**
 * Vectors for each text, in order, or null if any batch failed.
 *
 * All-or-nothing on purpose: a partial result would have to be matched back to
 * its inputs by index, and the one thing worse than no embeddings is
 * embeddings attached to the wrong phrases.
 */
export async function embed(texts: string[]): Promise<number[][] | null> {
  if (texts.length === 0) return [];

  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += BATCH) {
    const batch = await embedBatch(texts.slice(i, i + BATCH));
    if (!batch) return null;
    out.push(...batch);
  }
  return out;
}

/** One text. Used for the visitor's message, which is the only embedding on the
 *  hot path. */
export async function embedOne(text: string): Promise<number[] | null> {
  const [vector] = (await embed([text])) ?? [];
  return vector ?? null;
}

/**
 * Cosine similarity of two unit vectors — a dot product, given both sides were
 * normalised on the way in.
 */
export function similarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let total = 0;
  for (let i = 0; i < a.length; i++) total += a[i] * b[i];
  return total;
}
