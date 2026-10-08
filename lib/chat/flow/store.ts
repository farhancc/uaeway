/**
 * Where flows are kept, and which one is answering right now.
 *
 * Two ideas and no more. **The draft** is the one mutable document, the thing
 * the builder saves into as you drag. **A version** is immutable: publishing
 * turns the draft into one and moves the pointer in `flow_state` at it.
 *
 * That shape is what makes a bad publish survivable. Sessions started on an
 * older version keep running it — they hold its id, not a copy — and reverting
 * is a single write to the pointer rather than an edit to a document someone is
 * mid-conversation through.
 *
 * The live flow is cached in process on the same 60s TTL as the answer bank it
 * replaces (`../answers.ts`): the flow is one document and every turn reads it,
 * so a round trip per turn would cost more than the whole match.
 */

import { randomUUID } from "crypto";
import {
  flowStateCollection,
  flowSubjectsCollection,
  flowVersionsCollection,
  isChatDbConfigured,
  type FlowVersionDoc,
} from "../../mongo/chat-db";
import { flowDoc, indexFlow, type FlowDoc, type FlowIndex } from "./schema";

const TTL_MS = 60_000;

/** One version, as the admin lists them. `doc` is deliberately absent — the
 *  list view renders 50 rows and none of them need the graph. */
export interface FlowVersionSummary {
  id: string;
  version: number;
  status: FlowVersionDoc["status"];
  note: string | null;
  createdAt: Date;
  publishedAt: Date | null;
  live: boolean;
}

export interface LoadedFlow {
  id: string;
  version: number;
  flow: FlowIndex;
}

let cache: { at: number; flow: LoadedFlow | null } | null = null;

/** Test seam, and how a publish reaches the running server without a restart. */
export function clearFlowCache(): void {
  cache = null;
}

/**
 * Parsed, or null with a warning.
 *
 * A stored document that no longer parses is a real possibility once the schema
 * moves, and the answer to it is never a crash: the chat falls back to the
 * answer bank, which is exactly what it does when the flow is switched off.
 */
function parse(doc: FlowVersionDoc): LoadedFlow | null {
  const result = flowDoc.safeParse(doc.doc);
  if (!result.success) {
    console.warn(`[flow] version ${doc.version} does not parse: ${result.error.message}`);
    return null;
  }
  return { id: doc._id, version: doc.version, flow: indexFlow(result.data) };
}

async function liveVersionId(): Promise<string | null> {
  const state = await (await flowStateCollection()).findOne({ _id: "live" });
  return state?.version_id ?? null;
}

/** The flow answering visitors, or null when none has been published yet. */
export async function loadLiveFlow(): Promise<LoadedFlow | null> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.flow;
  if (!isChatDbConfigured()) return null;

  try {
    const id = await liveVersionId();
    const doc = id ? await (await flowVersionsCollection()).findOne({ _id: id }) : null;
    const flow = doc ? parse(doc) : null;
    cache = { at: Date.now(), flow };
    return flow;
  } catch (err) {
    console.warn(`[flow] could not load: ${(err as Error).message}`);
    // A stale flow beats no flow, the same bargain `loadAnswers` makes.
    return cache?.flow ?? null;
  }
}

/**
 * A specific version, uncached.
 *
 * Used by a session that started before a publish, so a conversation is never
 * answered half by one flow and half by another — the visitor would see it as
 * the bot changing its mind mid-sentence.
 */
export async function loadFlowVersion(id: string): Promise<LoadedFlow | null> {
  const doc = await (await flowVersionsCollection()).findOne({ _id: id });
  return doc ? parse(doc) : null;
}

export class NoDraft extends Error {}

/* ── Subjects ────────────────────────────────────────────────────────────── */

/**
 * Held for the life of the process, keyed by version and subject.
 *
 * Unconditional and never invalidated, because a published version never
 * changes — the same bargain `vectorsForVersion` makes, and for the same
 * reason: this is the read the whole split exists to make rare. A conversation
 * that walks into the CV pack pays one query for it and none after.
 *
 * Null is cached too. A `subject` box whose pack was never seeded is an
 * authoring fault that would otherwise cost a failed query on every turn of
 * every conversation that reaches it.
 */
const subjectCache = new Map<string, LoadedFlow | null>();

/** Test seam, and what a re-seed needs so the next turn sees the new pack. */
export function clearSubjectCache(): void {
  subjectCache.clear();
}

/**
 * One subject's pack, as it was shipped with this version.
 *
 * Loaded the first time a conversation walks into it and not before, which is
 * the whole point: the main document no longer carries the answers, so a
 * conversation about attestation never reads a byte of the CV pack.
 */
export async function loadSubjectFlow(
  versionId: string,
  subject: string,
): Promise<LoadedFlow | null> {
  const key = `${versionId}:${subject}`;
  const hit = subjectCache.get(key);
  if (hit !== undefined) return hit;
  if (!isChatDbConfigured()) return null;

  try {
    const doc = await (await flowSubjectsCollection()).findOne({ _id: key });
    const result = doc ? flowDoc.safeParse(doc.doc) : null;
    if (doc && result && !result.success) {
      console.warn(`[flow] subject ${key} does not parse: ${result.error.message}`);
    }
    const loaded =
      result?.success === true
        ? { id: key, version: 0, flow: indexFlow(result.data) }
        : null;
    subjectCache.set(key, loaded);
    return loaded;
  } catch (err) {
    console.warn(`[flow] could not load subject ${key}: ${(err as Error).message}`);
    // Not cached: unlike a missing pack, a connection failure is worth retrying.
    return null;
  }
}

/** The draft's id, for the one caller that needs to find things filed against
 *  it before it becomes a version. */
export async function draftId(): Promise<string | null> {
  const draft = await (await flowVersionsCollection()).findOne(
    { status: "draft" },
    { projection: { _id: 1 } },
  );
  return draft?._id ?? null;
}

/**
 * Every subject pack belonging to one version, as raw documents.
 *
 * For the publish step rather than the runtime: `loadSubjectFlow` fetches one
 * pack when a conversation walks into it, and this fetches all of them because
 * every phrase in every pack has to be embedded before the version goes live.
 * Uncached for the same reason — it runs once per publish, not once per turn.
 */
export async function loadSubjectDocs(
  versionId: string,
): Promise<{ subject: string; doc: FlowDoc }[]> {
  if (!isChatDbConfigured()) return [];

  const docs = await (await flowSubjectsCollection()).find({ version_id: versionId }).toArray();
  return docs.flatMap((doc) => {
    const parsed = flowDoc.safeParse(doc.doc);
    if (!parsed.success) {
      console.warn(`[flow] subject ${doc._id} does not parse: ${parsed.error.message}`);
      return [];
    }
    // The subject travels with the document. A pack contains no `subject`
    // node — those are the doors, and they live in the main flow — so there is
    // nothing inside a pack that says which one it is.
    return [{ subject: doc.subject, doc: parsed.data }];
  });
}

/* ── Authoring ───────────────────────────────────────────────────────────── */

/** The next version number: one past the highest ever allocated. */
async function nextVersion(): Promise<number> {
  const newest = await (await flowVersionsCollection())
    .find({}, { projection: { version: 1 } })
    .sort({ version: -1 })
    .limit(1)
    .next();
  return (newest?.version ?? 0) + 1;
}

/**
 * The working copy: the saved draft, or a fresh clone of what is live.
 *
 * Cloning rather than editing the live version is the invariant the whole
 * module exists for. Returns null only when there is neither — a new install,
 * where the migration script writes the first draft.
 */
export async function loadDraft(): Promise<LoadedFlow | null> {
  const draft = await (await flowVersionsCollection()).findOne({ status: "draft" });
  if (draft) return parse(draft);

  const live = await loadLiveFlow();
  if (!live) return null;
  return { id: "", version: await nextVersion(), flow: live.flow };
}

/**
 * Saves the draft, creating it on first edit.
 *
 * Validated here rather than trusted from the caller: the builder posts JSON it
 * assembled from a canvas, and the one thing this module must never do is store
 * a graph the runtime cannot read.
 */
export async function saveDraft(
  doc: unknown,
  subjects?: Map<string, FlowDoc>,
): Promise<FlowDoc> {
  const parsed = flowDoc.parse(doc);
  const now = new Date();

  const versions = await flowVersionsCollection();
  await versions.updateOne(
    { status: "draft" },
    {
      $set: { doc: parsed, published_at: null },
      $setOnInsert: {
        _id: randomUUID(),
        version: await nextVersion(),
        status: "draft",
        note: null,
        created_at: now,
      },
    },
    { upsert: true },
  );

  // Only when the caller has them. The builder saves the main document alone
  // on every drag, and a save that wrote `subjects: undefined` as "no packs"
  // would delete the content behind every door on the canvas.
  if (subjects && subjects.size > 0) {
    const draft = await versions.findOne({ status: "draft" }, { projection: { _id: 1 } });
    if (!draft) throw new NoDraft("the draft disappeared between writing it and its subjects");

    await (await flowSubjectsCollection()).bulkWrite(
      [...subjects].map(([subject, subjectDoc]) => ({
        updateOne: {
          filter: { _id: `${draft._id}:${subject}` },
          update: {
            $set: { version_id: draft._id, subject, doc: flowDoc.parse(subjectDoc) },
            $setOnInsert: { created_at: now },
          },
          upsert: true,
        },
      })),
      { ordered: false },
    );
    clearSubjectCache();
  }

  return parsed;
}

/**
 * Publishes the draft and points the live flow at it.
 *
 * Order matters: the version is marked published before the pointer moves, so a
 * failure between the two writes leaves a published version nobody is using —
 * recoverable, and visible in the version list. The reverse order would point
 * the pointer at something still marked draft, which `loadDraft` would then
 * hand back to the next author to edit underneath live traffic.
 */
export async function publishDraft(note: string | null): Promise<FlowVersionSummary> {
  const versions = await flowVersionsCollection();
  const draft = await versions.findOne({ status: "draft" });
  if (!draft) throw new NoDraft("there is no draft to publish");

  const now = new Date();
  await versions.updateOne(
    { _id: draft._id },
    { $set: { status: "published", published_at: now, note } },
  );
  await setLiveVersion(draft._id);

  return {
    id: draft._id,
    version: draft.version,
    status: "published",
    note,
    createdAt: draft.created_at,
    publishedAt: now,
    live: true,
  };
}

/** Moves the pointer. This is both "publish" and "revert" — reverting is not a
 *  separate operation, which is why reverting is safe. */
export async function setLiveVersion(versionId: string): Promise<void> {
  await (await flowStateCollection()).updateOne(
    { _id: "live" },
    { $set: { version_id: versionId, updated_at: new Date() } },
    { upsert: true },
  );
  clearFlowCache();
}

export async function listVersions(limit = 50): Promise<FlowVersionSummary[]> {
  const liveId = await liveVersionId();
  const docs = await (await flowVersionsCollection())
    .find({}, { projection: { doc: 0 } })
    .sort({ version: -1 })
    .limit(limit)
    .toArray();

  return docs.map((d) => ({
    id: d._id,
    version: d.version,
    status: d.status,
    note: d.note,
    createdAt: d.created_at,
    publishedAt: d.published_at,
    live: d._id === liveId,
  }));
}
