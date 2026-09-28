import { messagesCollection, type MessageSource } from "../mongo/chat-db";

/** Every way of answering that did not call the model. */
export const FREE_SOURCES: MessageSource[] = ["canned", "capped", "unavailable"];

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
export async function chatSavings(days = 7): Promise<ChatSavings> {
  const messages = await messagesCollection();
  const window = { role: "model" as const, created_at: { $gte: new Date(Date.now() - days * 86_400_000) } };

  const [free, total] = await Promise.all([
    messages.countDocuments({
      ...window,
      source: { $in: FREE_SOURCES },
    }),
    messages.countDocuments(window),
  ]);

  return {
    free,
    total,
    share: total > 0 ? Math.round((free / total) * 100) : null,
  };
}

/**
 * How often each answer has actually been served.
 *
 * An answer nobody reaches is either badly worded or missing from the
 * follow-ups, so this is the other half of the picture /admin/answers shows.
 */
export async function answerUses(): Promise<Map<string, number>> {
  const rows = await (await messagesCollection())
    .aggregate<{ _id: string; count: number }>([
      { $match: { answer_slug: { $type: "string" } } },
      { $group: { _id: "$answer_slug", count: { $sum: 1 } } },
    ])
    .toArray();

  return new Map(rows.map((r) => [r._id, r.count]));
}
