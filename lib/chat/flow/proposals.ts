/**
 * Suggestions waiting for a person.
 *
 * The improver writes here and nowhere else. It cannot reach the draft, it
 * certainly cannot reach the live flow, and that is the whole safety model: on
 * a site that tells people what their visa needs, a change to what the bot says
 * is a thing a human agreed to.
 */

import { randomUUID } from "crypto";
import { flowProposalsCollection, isChatDbConfigured } from "../../mongo/chat-db";
import { currentTenant, scoped } from "../../tenant";
import { flowPatch, type FlowPatch } from "./patch";

export interface Proposal {
  id: string;
  patch: FlowPatch | null;
  reason: string;
  evidence: string[];
  status: "open" | "applied" | "rejected";
  createdAt: Date;
}

export interface NewProposal {
  fingerprint: string;
  patch: FlowPatch | null;
  reason: string;
  evidence: string[];
}

function parse(doc: {
  _id: string;
  patch: unknown | null;
  reason: string;
  evidence: string[];
  status: Proposal["status"];
  created_at: Date;
}): Proposal | null {
  if (doc.patch === null) {
    return { id: doc._id, patch: null, reason: doc.reason, evidence: doc.evidence, status: doc.status, createdAt: doc.created_at };
  }

  const parsed = flowPatch.safeParse(doc.patch);
  if (!parsed.success) {
    // A proposal written by an older shape of the schema. Dropped rather than
    // shown, because a suggestion nobody can apply is just noise on the page.
    console.warn(`[proposals] ${doc._id} no longer parses: ${parsed.error.message}`);
    return null;
  }

  return {
    id: doc._id,
    patch: parsed.data,
    reason: doc.reason,
    evidence: doc.evidence,
    status: doc.status,
    createdAt: doc.created_at,
  };
}

/**
 * Stores what has not been suggested before.
 *
 * Insert-if-absent on the fingerprint, so a suggestion someone rejected last
 * week does not come back tonight — the improver would otherwise re-derive it
 * from the same transcripts forever.
 */
export async function recordProposals(items: NewProposal[]): Promise<number> {
  if (items.length === 0 || !isChatDbConfigured()) return 0;

  const now = new Date();
  const result = await (await flowProposalsCollection()).bulkWrite(
    items.map((item) => ({
      updateOne: {
        filter: scoped({ fingerprint: item.fingerprint }),
        update: {
          $setOnInsert: {
            _id: randomUUID(),
            tenant_id: currentTenant(),
            fingerprint: item.fingerprint,
            patch: item.patch,
            reason: item.reason,
            evidence: item.evidence.slice(0, 8),
            status: "open" as const,
            created_at: now,
            decided_at: null,
          },
        },
        upsert: true,
      },
    })),
    { ordered: false },
  );

  return result.upsertedCount;
}

export async function listProposals(status: Proposal["status"] = "open"): Promise<Proposal[]> {
  const docs = await (await flowProposalsCollection())
    .find(scoped({ status }))
    .sort({ created_at: -1 })
    .limit(100)
    .toArray();

  return docs.flatMap((doc) => {
    const parsed = parse(doc);
    return parsed ? [parsed] : [];
  });
}

export async function getProposal(id: string): Promise<Proposal | null> {
  const doc = await (await flowProposalsCollection()).findOne(scoped({ _id: id }));
  return doc ? parse(doc) : null;
}

/** Recorded either way. A rejection is data: it is what stops the same
 *  suggestion arriving again. */
export async function decideProposal(id: string, status: "applied" | "rejected"): Promise<void> {
  await (await flowProposalsCollection()).updateOne(scoped({ _id: id }), {
    $set: { status, decided_at: new Date() },
  });
}

/** Which fingerprints have already been seen, whatever was decided. */
export async function knownFingerprints(): Promise<Set<string>> {
  const docs = await (await flowProposalsCollection())
    .find(scoped({}), { projection: { fingerprint: 1 } })
    .toArray();
  return new Set(docs.map((d) => d.fingerprint));
}
