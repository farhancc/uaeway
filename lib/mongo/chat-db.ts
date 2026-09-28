import { MongoClient, type Collection, type Db, type ObjectId } from "mongodb";

/**
 * The chat database.
 *
 * Three collections live here, and only three: the answer bank, and the
 * conversations it serves. Everything else the site owns — jobs, articles,
 * leads, admins, prospects — stays in Postgres, which is where the foreign keys
 * and the row-level security those depend on are.
 *
 * The split is along a real seam. The chat writes a row per message and reads
 * nothing but "this session's messages, newest first"; the answer bank is a few
 * dozen documents with ragged arrays (`trigger_groups`, `choices`) that were
 * already jsonb because Postgres arrays must be rectangular. Neither needs a
 * join with the rest of the schema.
 *
 * One thing the move gives up: RLS was a second line under the `active` filter
 * on answers, so a query that forgot it still could not leak a retired answer.
 * Here the filter in `loadAnswers` is the only line, which is why it is the one
 * place answers are read.
 */

/** Ids are uuid strings, not ObjectIds, wherever something outside this
 *  database holds one: a session id goes to the browser and is stored on the
 *  lead in Postgres, and an answer id is in an admin URL. */
export interface AnswerDoc {
  _id: string;
  slug: string;
  question: string;
  answer_md: string;
  service_slug: string | null;
  keywords: string[];
  trigger_groups: string[][];
  any_keywords: string[];
  choices: { label: string; answer_slug: string }[];
  follow_up_slugs: string[];
  is_opener: boolean;
  show_on_page: boolean;
  position: number;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ChatSessionDoc {
  _id: string;
  /** Hashed, never the raw address: enough to rate-limit, not personal data we
   *  have no reason to keep. */
  ip_hash: string | null;
  user_agent: string | null;
  page_path: string | null;
  turn_count: number;
  /** Model calls made in this session, for the per-session spend cap. */
  ai_turns: number;
  created_at: Date;
  updated_at: Date;
}

/**
 * A message id is an ObjectId, and deliberately so: nothing outside this
 * collection holds one, and an ObjectId sorts in insertion order. `created_at`
 * is millisecond-precision here where it was microsecond in Postgres, and a
 * canned reply is stored in the same millisecond as the question it answers —
 * so the id is the tiebreak that keeps a replayed transcript in the order it
 * was actually said.
 */
export interface ChatMessageDoc {
  _id: ObjectId;
  session_id: string;
  role: "user" | "model";
  content: string;
  /** How a reply was produced. Null on the visitor's own messages. */
  source: "canned" | "model" | "capped" | null;
  /** The canned answer served, when one was. */
  answer_slug: string | null;
  created_at: Date;
}

/**
 * The connection, cached on the global so the dev server's hot reloads and a
 * warm serverless instance reuse one pool instead of opening a new one per
 * module evaluation.
 */
const globalForMongo = globalThis as unknown as { chatDb?: Promise<Db> };

async function connect(): Promise<Db> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MongoDB is not configured: set MONGODB_URI");

  const client = await new MongoClient(uri).connect();
  const db = client.db(process.env.MONGODB_DB || "uaevia");
  await ensureIndexes(db);
  return db;
}

export function chatDb(): Promise<Db> {
  // A failed connect must not be cached, or one bad cold start poisons the
  // instance for as long as it lives.
  globalForMongo.chatDb ??= connect().catch((err) => {
    globalForMongo.chatDb = undefined;
    throw err;
  });
  return globalForMongo.chatDb;
}

/** True when the app has chat database credentials at all. Lets the chatbot
 *  degrade to model-only rather than failing during early setup. */
export function isChatDbConfigured(): boolean {
  return Boolean(process.env.MONGODB_URI);
}

export async function answersCollection(): Promise<Collection<AnswerDoc>> {
  return (await chatDb()).collection<AnswerDoc>("answers");
}

export async function sessionsCollection(): Promise<Collection<ChatSessionDoc>> {
  return (await chatDb()).collection<ChatSessionDoc>("chat_sessions");
}

export async function messagesCollection(): Promise<Collection<ChatMessageDoc>> {
  return (await chatDb()).collection<ChatMessageDoc>("chat_messages");
}

/**
 * Created on first connection rather than by a migration step, because unlike
 * the SQL schema there is nothing else here to migrate — `createIndexes` is
 * idempotent, so the cost is one round trip per cold start and the reward is
 * that a new environment needs no setup beyond a connection string.
 */
async function ensureIndexes(db: Db): Promise<void> {
  await Promise.all([
    db.collection<AnswerDoc>("answers").createIndexes([
      // The identity a suggestion chip refers to. Unique, as it was in Postgres:
      // two answers on one slug would make a chip ambiguous.
      { key: { slug: 1 }, unique: true, name: "answers_slug_uniq" },
      { key: { active: 1, service_slug: 1, position: 1 }, name: "answers_live_idx" },
    ]),
    db.collection<ChatSessionDoc>("chat_sessions").createIndexes([
      { key: { ip_hash: 1, created_at: -1 }, name: "chat_sessions_ip_idx" },
    ]),
    db.collection<ChatMessageDoc>("chat_messages").createIndexes([
      { key: { session_id: 1, created_at: 1, _id: 1 }, name: "chat_messages_session_idx" },
      // The admin's two reads: how many replies cost nothing, and which answers
      // are actually being served.
      { key: { role: 1, created_at: -1 }, name: "chat_messages_role_idx" },
      {
        key: { answer_slug: 1 },
        name: "chat_messages_answer_idx",
        partialFilterExpression: { answer_slug: { $type: "string" } },
      },
    ]),
  ]);
}
