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
const HISTORY_TURNS = 12;

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
    .select("id, turn_count")
    .single();

  if (error) throw new Error(`could not start chat session: ${error.message}`);
  return { id: data.id as string, turnCount: data.turn_count as number };
}

/** Loads a session, confirming it belongs to this visitor so a leaked id cannot
 *  be used to read someone else's conversation. */
export async function loadSession(id: string, ipHash: string): Promise<Session | null> {
  const { data } = await supabaseAdmin()
    .from("chat_sessions")
    .select("id, turn_count, ip_hash")
    .eq("id", id)
    .maybeSingle();

  if (!data || data.ip_hash !== ipHash) return null;
  return { id: data.id as string, turnCount: data.turn_count as number };
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

export async function appendMessage(
  sessionId: string,
  role: "user" | "model",
  content: string,
): Promise<void> {
  const { error } = await supabaseAdmin()
    .from("chat_messages")
    .insert({ session_id: sessionId, role, content });
  if (error) console.warn(`[chat] could not store ${role} message: ${error.message}`);
}

export async function countTurn(sessionId: string, turnCount: number): Promise<void> {
  await supabaseAdmin()
    .from("chat_sessions")
    .update({ turn_count: turnCount + 1 })
    .eq("id", sessionId);
}
