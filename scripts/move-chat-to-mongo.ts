/**
 * Copies the answer bank and the conversations out of Postgres into the chat
 * database, once.
 *
 *   npm run move:chat-to-mongo
 *
 * Read-only on Postgres: nothing is deleted here. Dropping the three tables is
 * 0012_drop_chat_tables.sql, applied by hand after this has run and the admin
 * looks right — which is the whole reason it is a separate step.
 *
 * Idempotent. Every document keeps the id its row had, so re-running upserts
 * over what is already there rather than duplicating it. That is also what keeps
 * `leads.chat_session_id` pointing at the same conversation it always did.
 */

import {
  answersCollection,
  messagesCollection,
  sessionsCollection,
  type AnswerDoc,
  type ChatMessageDoc,
  type ChatSessionDoc,
} from "../lib/mongo/chat-db";
import { supabaseAdmin } from "../lib/supabase/admin";

/** Rows per request. Supabase caps a response at 1000 by default. */
const PAGE = 500;

/** Every row of a table, a page at a time, oldest first so the copy is
 *  resumable and the order is stable between runs. */
async function* rows<T>(table: string): AsyncGenerator<T[]> {
  const db = supabaseAdmin();

  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from(table)
      .select("*")
      .order("created_at", { ascending: true })
      .range(from, from + PAGE - 1);

    if (error) throw new Error(`reading ${table}: ${error.message}`);
    if (!data?.length) return;

    yield data as T[];
    if (data.length < PAGE) return;
  }
}

/** A timestamptz string, or now for a row that somehow has none. */
function at(value: unknown): Date {
  const date = typeof value === "string" ? new Date(value) : new Date(NaN);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

async function moveAnswers(): Promise<number> {
  const answers = await answersCollection();
  let moved = 0;

  for await (const page of rows<Record<string, unknown>>("answers")) {
    await answers.bulkWrite(
      page.map((row) => {
        const doc: Omit<AnswerDoc, "_id"> = {
          slug: String(row.slug),
          question: String(row.question),
          answer_md: String(row.answer_md),
          service_slug: (row.service_slug as string | null) ?? null,
          keywords: (row.keywords as string[]) ?? [],
          trigger_groups: (row.trigger_groups as string[][]) ?? [],
          choices: (row.choices as AnswerDoc["choices"]) ?? [],
          follow_up_slugs: (row.follow_up_slugs as string[]) ?? [],
          is_opener: Boolean(row.is_opener),
          show_on_page: Boolean(row.show_on_page),
          position: Number(row.position ?? 0),
          active: Boolean(row.active),
          created_at: at(row.created_at),
          updated_at: at(row.updated_at),
        };
        return {
          replaceOne: { filter: { _id: String(row.id) }, replacement: doc, upsert: true },
        };
      }),
    );
    moved += page.length;
  }

  return moved;
}

async function moveSessions(): Promise<number> {
  const sessions = await sessionsCollection();
  let moved = 0;

  for await (const page of rows<Record<string, unknown>>("chat_sessions")) {
    await sessions.bulkWrite(
      page.map((row) => {
        const doc: Omit<ChatSessionDoc, "_id"> = {
          ip_hash: (row.ip_hash as string | null) ?? null,
          user_agent: (row.user_agent as string | null) ?? null,
          page_path: (row.page_path as string | null) ?? null,
          turn_count: Number(row.turn_count ?? 0),
          ai_turns: Number(row.ai_turns ?? 0),
          created_at: at(row.created_at),
          updated_at: at(row.updated_at),
        };
        return {
          replaceOne: { filter: { _id: String(row.id) }, replacement: doc, upsert: true },
        };
      }),
    );
    moved += page.length;
  }

  return moved;
}

/**
 * Messages keep their Postgres uuid as `_id` even though new ones get an
 * ObjectId, because a mixed `_id` type is the price of being able to re-run
 * this without duplicating a transcript. Ordering still holds: `created_at` came
 * from Postgres at microsecond precision, so the copied messages of a session
 * never tie, and the id is only ever consulted as a tiebreak.
 */
async function moveMessages(): Promise<number> {
  const messages = await messagesCollection();
  let moved = 0;

  for await (const page of rows<Record<string, unknown>>("chat_messages")) {
    await messages.bulkWrite(
      page.map((row) => {
        const doc: Omit<ChatMessageDoc, "_id"> = {
          session_id: String(row.session_id),
          role: row.role === "model" ? "model" : "user",
          content: String(row.content),
          source: (row.source as ChatMessageDoc["source"]) ?? null,
          answer_slug: (row.answer_slug as string | null) ?? null,
          created_at: at(row.created_at),
        };
        return {
          replaceOne: {
            filter: { _id: String(row.id) as unknown as ChatMessageDoc["_id"] },
            replacement: doc,
            upsert: true,
          },
        };
      }),
    );
    moved += page.length;
  }

  return moved;
}

async function main() {
  // Answers first: they are what the site serves, and a session with no answers
  // is a worse half-migrated state than answers with no history.
  console.log(`Answers:  ${await moveAnswers()}`);
  console.log(`Sessions: ${await moveSessions()}`);
  console.log(`Messages: ${await moveMessages()}`);
  console.log(
    "\nCheck /admin/answers and the savings figure on /admin, then apply" +
      " supabase/migrations/0012_drop_chat_tables.sql.",
  );
}

// The driver holds the process open once it has a pool.
main()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => process.exit());
