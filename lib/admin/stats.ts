import type { SupabaseClient } from "@supabase/supabase-js";

/** How much of the chatbot's work is costing nothing. */
export interface ChatSavings {
  /** Replies served from the answer bank, or the handoff after the budget. */
  free: number;
  /** All replies in the window. */
  total: number;
  /** Percentage answered without a model call, or null with no traffic yet. */
  share: number | null;
}

/**
 * The single figure that says whether the answer bank is earning its keep.
 *
 * A low share means either people are asking things the bank does not cover, or
 * the follow-up suggestions are not leading anywhere useful — both fixable in
 * /admin/answers.
 */
export async function chatSavings(db: SupabaseClient, days = 7): Promise<ChatSavings> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();

  const [free, total] = await Promise.all([
    db
      .from("chat_messages")
      .select("id", { count: "exact", head: true })
      .eq("role", "model")
      .in("source", ["canned", "capped"])
      .gte("created_at", since),
    db
      .from("chat_messages")
      .select("id", { count: "exact", head: true })
      .eq("role", "model")
      .gte("created_at", since),
  ]);

  const freeCount = free.count ?? 0;
  const totalCount = total.count ?? 0;

  return {
    free: freeCount,
    total: totalCount,
    share: totalCount > 0 ? Math.round((freeCount / totalCount) * 100) : null,
  };
}
