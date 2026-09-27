import { createHash } from "crypto";
import { supabaseAdmin } from "../supabase/admin";
import type { ChatMessageRow } from "../supabase/types";
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
  const salt = process.env.IP_HASH_SALT || process.env.CRON_SECRET || "uae-gateway";
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
  const db = supabaseAdmin();

  const since = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await db
    .from("chat_sessions")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("created_at", since);

  if ((count ?? 0) >= MAX_SESSIONS_PER_IP_HOUR) throw new RateLimited();

  const { data, error } = await db
    .from("chat_sessions")
    .insert({ ip_hash: ipHash, user_agent: userAgent, page_path: pagePath })
    .select("id, turn_count, ai_turns")
    .single();

  if (error) throw new Error(`could not start chat session: ${error.message}`);
  return { id: data.id as string, turnCount: data.turn_count as number, aiTurns: 0 };
}

/** Loads a session, confirming it belongs to this visitor so a leaked id cannot
 *  be used to read someone else's conversation. */
export async function loadSession(id: string, ipHash: string): Promise<Session | null> {
  const { data } = await supabaseAdmin()
    .from("chat_sessions")
    .select("id, turn_count, ai_turns, ip_hash")
    .eq("id", id)
    .maybeSingle();

  if (!data || data.ip_hash !== ipHash) return null;
  return {
    id: data.id as string,
    turnCount: data.turn_count as number,
    aiTurns: (data.ai_turns as number) ?? 0,
  };
}

export async function history(sessionId: string): Promise<Turn[]> {
  const { data } = await supabaseAdmin()
    .from("chat_messages")
    .select("role, content")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(HISTORY_TURNS);

  const rows = ((data ?? []) as Pick<ChatMessageRow, "role" | "content">[]).reverse();
  return rows.map((r) => ({ role: r.role, text: r.content }));
}

export type ReplySource = "canned" | "model" | "capped";

/** Canned answers already served in this conversation, so the chips never
 *  offer a question the visitor has just had answered. */
export async function usedAnswerSlugs(sessionId: string): Promise<Set<string>> {
  const { data } = await supabaseAdmin()
    .from("chat_messages")
    .select("answer_slug")
    .eq("session_id", sessionId)
    .not("answer_slug", "is", null);

  return new Set(
    ((data ?? []) as { answer_slug: string | null }[])
      .map((r) => r.answer_slug)
      .filter((slug): slug is string => Boolean(slug)),
  );
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
  const { error } = await supabaseAdmin()
    .from("chat_messages")
    .insert({
      session_id: sessionId,
      role,
      content,
      source: source ?? null,
      answer_slug: answerSlug ?? null,
    });
  if (error) console.warn(`[chat] could not store ${role} message: ${error.message}`);
}

/** Records the turn, and the model call if this one cost us anything. */
export async function countTurn(
  sessionId: string,
  session: Session,
  usedModel: boolean,
): Promise<void> {
  await supabaseAdmin()
    .from("chat_sessions")
    .update({
      turn_count: session.turnCount + 1,
      ai_turns: session.aiTurns + (usedModel ? 1 : 0),
    })
    .eq("id", sessionId);
}
