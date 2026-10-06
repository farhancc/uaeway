import { MongoClient, type Collection, type Db, type ObjectId } from "mongodb";

/**
 * The chat database.
 *
 * The answer bank, the conversations it serves, and the authored flow that is
 * replacing the bank as the thing which decides what to say. Everything else the site owns — jobs, articles,
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
  /**
   * Where this conversation is in the flow, and what it has established.
   *
   * `flow_version_id` is pinned at the first flow turn and never moves: a
   * publish mid-conversation must not change the graph underneath someone, or
   * the bot appears to change its mind between one sentence and the next.
   *
   * All four are absent on a session that started before the flow existed,
   * which is what `loadSession` defaults for.
   */
  flow_version_id?: string | null;
  flow_node_id?: string | null;
  flow_slots?: Record<string, string>;
  flow_visited?: string[];
  /** The question this conversation is waiting on, and the service whose schema
   *  should validate the answer. */
  flow_pending?: { slot: string; serviceId: string | null } | null;
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
/**
 * How a reply was produced. Everything but "model" was free, which is what the
 * admin counts. "unavailable" is its own value rather than folded into
 * "capped": both are free, but one is a conversation that spent its budget and
 * the other is an outage, and a week of them should not read as healthy.
 *
 * Defined here, with the document, so there is one list. `lib/chat/session.ts`
 * re-exports it as `ReplySource` for callers that never touch the driver.
 */
export type MessageSource = "canned" | "model" | "capped" | "unavailable";

export interface ChatMessageDoc {
  _id: ObjectId;
  session_id: string;
  role: "user" | "model";
  content: string;
  /** Null on the visitor's own messages. */
  source: MessageSource | null;
  /** The canned answer served, when one was. */
  answer_slug: string | null;
  /**
   * The flow node that produced this reply, once the flow is serving.
   *
   * Its own field rather than reusing `answer_slug`, because the nightly
   * improver counts nodes and edges and would otherwise have to guess which
   * kind of id it was looking at.
   */
  flow_node_id?: string | null;
  created_at: Date;
}

/**
 * A saved conversation flow.
 *
 * Immutable once published: publishing writes a new document and moves the
 * pointer in `flow_state`, so a bad publish is undone by moving the pointer
 * back rather than by editing a document a live session may be mid-way through.
 * `doc` is whatever `flowDoc.parse()` accepted, stored verbatim.
 *
 * At most one document has `status: "draft"` — that is the working copy the
 * builder saves into. Everything else is history.
 */
export interface FlowVersionDoc {
  _id: string;
  /** Monotonic, human-facing. Draft carries the number it would publish as. */
  version: number;
  status: "draft" | "published";
  /** A `FlowDoc`. Typed as unknown here so the driver layer never imports the
   *  schema, and so a document written by an older schema still reads back —
   *  it is parsed on load, where a failure can be reported to someone. */
  doc: unknown;
  /** What changed, written by whoever published it. */
  note: string | null;
  created_at: Date;
  published_at: Date | null;
}

/** Which version is live. One document, `_id: "live"`. A pointer rather than a
 *  status flag so switching versions is one atomic write. */
export interface FlowStateDoc {
  _id: "live";
  version_id: string | null;
  updated_at: Date;
}

export async function flowVersionsCollection(): Promise<Collection<FlowVersionDoc>> {
  return (await chatDb()).collection<FlowVersionDoc>("flow_versions");
}

export async function flowStateCollection(): Promise<Collection<FlowStateDoc>> {
  return (await chatDb()).collection<FlowStateDoc>("flow_state");
}

/**
 * A service's qualification schema.
 *
 * Lives here rather than in Postgres because it is read on every turn of every
 * conversation, it is ragged (a list of fields with per-type options), and it
 * joins with nothing. Same reasoning that put the answer bank here.
 *
 * The cost of that choice: there is no row-level security to catch a query that
 * forgets to scope by tenant, so `lib/tenant.ts`'s `scoped()` is the only line
 * of defence and every read goes through it.
 */
export interface ServiceDefinitionDoc {
  _id: string;
  tenant_id: string;
  /** The slug `lib/services.ts` and every public URL already use. */
  service_id: string;
  name: string;
  assign_to: string | null;
  active: boolean;
  /** A `ServiceDefinition["fields"]`, parsed on load. */
  fields: unknown;
  created_at: Date;
  updated_at: Date;
}

export async function serviceDefinitionsCollection(): Promise<Collection<ServiceDefinitionDoc>> {
  return (await chatDb()).collection<ServiceDefinitionDoc>("service_definitions");
}

/**
 * One embedded phrase.
 *
 * Content-addressed: the id is a hash of the model, the dimension count and the
 * text, so embedding the same phrase twice costs nothing and re-publishing an
 * unchanged flow costs nothing at all. That is what makes publish-time
 * embedding affordable enough to be the only time we do it.
 *
 * Not tenant-scoped, and that is safe rather than an oversight: a vector is a
 * pure function of its text, and the only way to read one is to already know
 * the text it came from.
 */
export interface FlowVectorDoc {
  _id: string;
  model: string;
  dims: number;
  text: string;
  values: number[];
  created_at: Date;
}

export async function flowVectorsCollection(): Promise<Collection<FlowVectorDoc>> {
  return (await chatDb()).collection<FlowVectorDoc>("flow_vectors");
}

/**
 * A change the nightly improver suggests.
 *
 * Never applied by anything but a person clicking approve. `fingerprint` is
 * what stops the same suggestion arriving every night after someone has said no
 * to it once.
 *
 * `patch` is null when the improver found a real gap but could not draft an
 * answer from the site's own approved content — which is a finding worth
 * showing and not a change anyone can apply.
 */
export interface FlowProposalDoc {
  _id: string;
  tenant_id: string;
  fingerprint: string;
  /** A `FlowPatch`, parsed on read. */
  patch: unknown | null;
  /** One line, in the admin's words rather than the model's. */
  reason: string;
  /** The visitor messages that motivated it. Shown, so a proposal can be
   *  judged on its evidence rather than on its confidence. */
  evidence: string[];
  status: "open" | "applied" | "rejected";
  created_at: Date;
  decided_at: Date | null;
}

export async function flowProposalsCollection(): Promise<Collection<FlowProposalDoc>> {
  return (await chatDb()).collection<FlowProposalDoc>("flow_proposals");
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
    db.collection<ServiceDefinitionDoc>("service_definitions").createIndexes([
      { key: { tenant_id: 1, service_id: 1 }, unique: true, name: "service_defs_uniq" },
    ]),
    db.collection<FlowProposalDoc>("flow_proposals").createIndexes([
      // Never suggest the same thing twice, whatever was decided about it.
      { key: { tenant_id: 1, fingerprint: 1 }, unique: true, name: "flow_proposals_uniq" },
      { key: { tenant_id: 1, status: 1, created_at: -1 }, name: "flow_proposals_open_idx" },
    ]),
    db.collection<FlowVersionDoc>("flow_versions").createIndexes([
      // The two reads: "the draft" and the version list, newest first.
      {
        key: { status: 1 },
        name: "flow_versions_draft_uniq",
        unique: true,
        partialFilterExpression: { status: "draft" },
      },
      { key: { version: -1 }, name: "flow_versions_order_idx" },
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
