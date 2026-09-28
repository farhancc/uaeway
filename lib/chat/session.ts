import { createHash, randomUUID } from "crypto";
import {
  messagesCollection,
  sessionsCollection,
  type ChatMessageDoc,
} from "../mongo/chat-db";
import type { Turn } from "../ai/gemini";

/** Conversation limits. These bound our AI spend and stop a script from using
 *  the site as a free Gemini proxy. */
export const MAX_TURNS = 30;
export const MAX_SESSIONS_PER_IP_HOUR = 12;
export const MAX_MESSAGE_CHARS = 1000;
/** Turns replayed to the model. Enough for context, not enough to bloat cost. */
const HISTORY_TURNS = 8;
/** Model replies allowed per conversation. Past this the bank still answers and
 *  chips still work, so a capped session stays useful and costs nothing. */
export const MAX_AI_TURNS = 8;

/** Visitor IPs are stored hashed: enough to rate-limit, without keeping an
 *  identifier we have no reason to hold. */
export function hashIp(ip: string): string {
  const salt = process.env.IP_HASH_SALT || process.env.CRON_SECRET || "uaevia";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}

export class RateLimited extends Error {}
export class TurnLimit extends Error {}

export interface Session {
  id: string;
  turnCount: number;
  /** Model calls already spent in this conversation. */
  aiTurns: number;
}

export async function startSession(
  ipHash: string,
  userAgent: string | null,
  pagePath: string | null,
): Promise<Session> {
  const sessions = await sessionsCollection();

  // Not in development. The limit is per IP, and a dev machine is one IP, so
  // every reload and every curl spends one of the twelve — you lock yourself
  // out of your own chatbot in an afternoon's work and the failure looks like
  // a bug in whatever you were actually testing.
  if (process.env.NODE_ENV === "production") {
    const started = await sessions.countDocuments({
      ip_hash: ipHash,
      created_at: { $gte: new Date(Date.now() - 3600_000) },
    });

    if (started >= MAX_SESSIONS_PER_IP_HOUR) throw new RateLimited();
  }

  const now = new Date();
  // A uuid rather than an ObjectId: this id goes to the browser and is stored
  // on the lead in Postgres, where the column is a uuid.
  const id = randomUUID();

  await sessions.insertOne({
    _id: id,
    ip_hash: ipHash,
    user_agent: userAgent,
    page_path: pagePath,
    turn_count: 0,
    ai_turns: 0,
    created_at: now,
    updated_at: now,
  });

  return { id, turnCount: 0, aiTurns: 0 };
}

/** Loads a session, confirming it belongs to this visitor so a leaked id cannot
 *  be used to read someone else's conversation. */
export async function loadSession(id: string, ipHash: string): Promise<Session | null> {
  const doc = await (await sessionsCollection()).findOne(
    { _id: id },
    { projection: { turn_count: 1, ai_turns: 1, ip_hash: 1 } },
  );

  if (!doc || doc.ip_hash !== ipHash) return null;
  return { id: doc._id, turnCount: doc.turn_count ?? 0, aiTurns: doc.ai_turns ?? 0 };
}

export async function history(sessionId: string): Promise<Turn[]> {
  // Newest first, then reversed: the limit has to take the *last* eight turns,
  // and `_id` breaks a tie inside one millisecond so a canned reply can never
  // sort ahead of the question it answers.
  const docs = await (await messagesCollection())
    .find({ session_id: sessionId }, { projection: { role: 1, content: 1 } })
    .sort({ created_at: -1, _id: -1 })
    .limit(HISTORY_TURNS)
    .toArray();

  return docs.reverse().map((d) => ({ role: d.role, text: d.content }));
}

export type ReplySource = "canned" | "model" | "capped";

/** Canned answers already served in this conversation, so the chips never
 *  offer a question the visitor has just had answered. */
export async function usedAnswerSlugs(sessionId: string): Promise<Set<string>> {
  const slugs = await (await messagesCollection()).distinct("answer_slug", {
    session_id: sessionId,
    answer_slug: { $type: "string" },
  });

  return new Set(slugs.filter((slug): slug is string => Boolean(slug)));
}

export async function appendMessage(
  sessionId: string,
  role: "user" | "model",
  content: string,
  /** How a reply was produced. Null for the visitor's own messages — this is
   *  what the admin counts to show how many turns cost nothing. */
  source?: ReplySource,
  /** The canned answer served, when one was. */
  answerSlug?: string | null,
): Promise<void> {
  try {
    const messages = await messagesCollection();
    await messages.insertOne({
      session_id: sessionId,
      role,
      content,
      source: source ?? null,
      answer_slug: answerSlug ?? null,
      created_at: new Date(),
    } as ChatMessageDoc);
  } catch (err) {
    // Losing the transcript is not worth losing the reply over.
    console.warn(`[chat] could not store ${role} message: ${(err as Error).message}`);
  }
}

/** Records the turn, and the model call if this one cost us anything. */
export async function countTurn(sessionId: string, usedModel: boolean): Promise<void> {
  // Incremented rather than written back from the loaded session: two turns
  // that overlap then both count, where a read-modify-write would lose one and
  // hand the conversation a free model call.
  await (await sessionsCollection()).updateOne(
    { _id: sessionId },
    {
      $inc: { turn_count: 1, ai_turns: usedModel ? 1 : 0 },
      $set: { updated_at: new Date() },
    },
  );
}
