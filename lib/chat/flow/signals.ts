/**
 * What the transcripts say about the flow.
 *
 * Every conversation is already recorded and, until now, read by nobody. These
 * are the four things in it worth acting on, and each one is limited to what is
 * genuinely stored — there is no signal here inferred from something we did not
 * write down.
 *
 * The mining is pure so it can be tested against fixed rows. Only `loadSignals`
 * touches the database.
 */

import { contentWords } from "../matching";
import { messagesCollection, sessionsCollection } from "../../mongo/chat-db";
import type { MessageSource } from "../../mongo/chat-db";

export interface Turn {
  sessionId: string;
  role: "user" | "model";
  content: string;
  source: MessageSource | null;
  flowNodeId: string | null;
  createdAt: Date;
}

/** A question the flow had no answer for, so we paid a model to guess. */
export interface Gap {
  question: string;
  sessionId: string;
  at: Date;
}

/** A question asked again in different words immediately after being answered —
 *  which is what being answered wrongly looks like from outside. */
export interface Rephrase {
  asked: string;
  thenAsked: string;
  /** The box that gave the answer they did not accept. */
  nodeId: string | null;
}

export interface VersionStats {
  turns: number;
  /** Replies that cost a model call. The number the whole exercise is about. */
  model: number;
  canned: number;
  capped: number;
  unavailable: number;
}

export interface Signals {
  gaps: Gap[];
  rephrases: Rephrase[];
  /** Boxes that have actually answered someone. */
  servedNodes: Set<string>;
  /** Keyed by flow version id. */
  versions: Map<string, VersionStats>;
}

/**
 * How much of the first question has to come back for it to be the same one.
 *
 * Measured against the *first* question's content words, not against both. A
 * restatement is usually longer than what it restates — "how much does
 * attestation cost" becomes "but what does the attestation actually cost me" —
 * so dividing by the longer of the two means a rephrase can never clear the bar,
 * which is what the first version of this did.
 *
 * Set high, and on content words only. A visitor moving from one topic to a
 * related one is not a complaint, and treating it as one would propose changes
 * to answers that were right.
 */
const REPHRASE_OVERLAP = 0.7;

/** One content word coming back says nothing; two questions about visas share
 *  "visa". */
const MIN_CONTENT_WORDS = 2;

function overlap(asked: string, thenAsked: string): number {
  const first = contentWords(asked);
  if (first.length < MIN_CONTENT_WORDS) return 0;

  const again = new Set(contentWords(thenAsked));
  return first.filter((w) => again.has(w)).length / first.length;
}

/**
 * Reads a transcript into signals.
 *
 * `versionOf` maps a session to the flow version answering it, which is the
 * only way to compare one version's behaviour with another's — the messages
 * themselves do not carry it.
 */
export function mineSignals(turns: Turn[], versionOf: Map<string, string>): Signals {
  const gaps: Gap[] = [];
  const rephrases: Rephrase[] = [];
  const servedNodes = new Set<string>();
  const versions = new Map<string, VersionStats>();

  for (let i = 0; i < turns.length; i++) {
    const turn = turns[i];
    if (turn.role !== "model") continue;

    if (turn.flowNodeId) servedNodes.add(turn.flowNodeId);

    const version = versionOf.get(turn.sessionId);
    if (version) {
      const stats =
        versions.get(version) ??
        ({ turns: 0, model: 0, canned: 0, capped: 0, unavailable: 0 } as VersionStats);
      stats.turns++;
      if (turn.source) stats[turn.source]++;
      versions.set(version, stats);
    }

    const asked = turns[i - 1];
    if (!asked || asked.role !== "user" || asked.sessionId !== turn.sessionId) continue;

    // A model reply is the flow admitting it had nothing. "capped" and
    // "unavailable" are not gaps — one is a budget and the other an outage, and
    // proposing answers from either would be learning from our own failures
    // rather than from what people asked.
    if (turn.source === "model") {
      gaps.push({ question: asked.content, sessionId: turn.sessionId, at: turn.createdAt });
    }

    // Answered from the flow, and then asked again anyway.
    const next = turns[i + 1];
    if (
      turn.source === "canned" &&
      next?.role === "user" &&
      next.sessionId === turn.sessionId &&
      overlap(asked.content, next.content) >= REPHRASE_OVERLAP
    ) {
      rephrases.push({
        asked: asked.content,
        thenAsked: next.content,
        nodeId: turn.flowNodeId,
      });
    }
  }

  return { gaps, rephrases, servedNodes, versions };
}

/** How much of a version's work cost nothing. The number a change to the flow
 *  is trying to move. */
export function freeShare(stats: VersionStats): number {
  return stats.turns === 0 ? 0 : (stats.turns - stats.model) / stats.turns;
}

/**
 * The last `days` of conversation.
 *
 * Bounded by time rather than by count so a quiet week produces a small run
 * rather than reaching back months for filler — a proposal argued from stale
 * traffic is worse than no proposal.
 */
export async function loadSignals(days = 30): Promise<Signals> {
  const since = new Date(Date.now() - days * 24 * 3600_000);

  const messages = await (await messagesCollection())
    .find(
      { created_at: { $gte: since } },
      { projection: { session_id: 1, role: 1, content: 1, source: 1, flow_node_id: 1, created_at: 1 } },
    )
    // By session, then in the order things were said: the mining reads
    // neighbours, so the order is the data.
    .sort({ session_id: 1, created_at: 1, _id: 1 })
    .toArray();

  const sessions = await (await sessionsCollection())
    .find({ created_at: { $gte: since } }, { projection: { flow_version_id: 1 } })
    .toArray();

  return mineSignals(
    messages.map((m) => ({
      sessionId: m.session_id,
      role: m.role,
      content: m.content,
      source: m.source,
      flowNodeId: m.flow_node_id ?? null,
      createdAt: m.created_at,
    })),
    new Map(
      sessions.flatMap((s) => (s.flow_version_id ? [[s._id, s.flow_version_id] as const] : [])),
    ),
  );
}
